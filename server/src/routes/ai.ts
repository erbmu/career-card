import { Router } from 'express';
import { z } from 'zod';
import { careerCardDataSchema } from '../../../src/shared/career-card-schema.js';
import { AuthenticatedRequest, requireAuth } from '../utils/auth.js';

const router = Router();
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

function requireOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return key;
}

async function callOpenAI(payload: Record<string, unknown>) {
  const apiKey = requireOpenAIKey();
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

function parseAssistantJson(response: any) {
  const message = response?.choices?.[0]?.message;
  if (!message) {
    throw new Error('Invalid AI response');
  }

  if (typeof message.content === 'string') {
    return JSON.parse(message.content);
  }

  if (Array.isArray(message.content)) {
    const textPart = message.content.find((part: any) => part.type === 'text' || part.type === 'output_text');
    if (textPart?.text) {
      return JSON.parse(textPart.text);
    }
  }

  throw new Error('Unable to parse AI response payload');
}

const parseResumeSchema = z.object({
  resumeText: z.string().max(100_000, 'Resume text is too long').optional(),
  imageData: z.string().optional(),
});

router.use(requireAuth);

router.post('/parse-resume', async (req: AuthenticatedRequest, res, next) => {
  try {
    const parsed = parseResumeSchema.safeParse(req.body);
    if (!parsed.success || (!parsed.data.resumeText && !parsed.data.imageData)) {
      return res.status(400).json({ error: 'Provide resume text or an image to parse' });
    }

    const messages: any[] = [
      {
        role: 'system',
        content: 'You extract structured data for a career card. Always respond with valid JSON matching the requested shape.',
      },
    ];

    if (parsed.data.imageData) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Extract all visible information from this career card image and return JSON with profile, experience, frameworks, projects, codeShowcase, pastimes, stylesOfWork, greatestImpacts.',
          },
          {
            type: 'input_image',
            image_url: { url: parsed.data.imageData },
          },
        ],
      });
    } else if (parsed.data.resumeText) {
      messages.push({
        role: 'user',
        content: `Resume text:\n${parsed.data.resumeText}`,
      });
    }

    const completion = await callOpenAI({
      model: OPENAI_MODEL,
      response_format: { type: 'json_object' },
      messages,
    });

    const result = parseAssistantJson(completion);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

const parseResumeExperienceSchema = z.object({
  resumeText: z.string().min(20, 'Resume text is required').max(100_000, 'Resume text is too long'),
});

router.post('/parse-resume-experience', async (req: AuthenticatedRequest, res, next) => {
  try {
    const parsed = parseResumeExperienceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid resume text' });
    }

    const completion = await callOpenAI({
      model: OPENAI_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You extract work experience and project entries from resumes. Always return JSON with experiences and projects arrays.',
        },
        {
          role: 'user',
          content: `Extract structured work experience entries AND project entries from this resume text. Resume:\n${parsed.data.resumeText}`,
        },
      ],
    });

    const result = parseAssistantJson(completion);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

const portfolioSchema = z.object({
  portfolioUrl: z.string().url('Valid portfolio URL is required'),
});

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

async function fetchGitHubCodeSamples(username: string) {
  const codeFiles: any[] = [];
  const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`, {
    headers: { 'User-Agent': 'CareerCard/1.0' },
  });

  if (!reposResponse.ok) {
    return codeFiles;
  }

  const repos = await reposResponse.json();
  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.kt', '.swift', '.cs'];

  for (const repo of repos.slice(0, 5)) {
    try {
      const contentsResponse = await fetch(`https://api.github.com/repos/${username}/${repo.name}/contents`, {
        headers: { 'User-Agent': 'CareerCard/1.0' },
      });

      if (!contentsResponse.ok) continue;
      const contents = await contentsResponse.json();

      const files = contents
        .filter((file: any) => file.type === 'file' && codeExtensions.some((ext) => file.name.endsWith(ext)))
        .slice(0, 3);

      for (const file of files) {
        const fileResponse = await fetch(file.download_url);
        if (!fileResponse.ok) continue;
        const fileContent = await fileResponse.text();
        codeFiles.push({
          name: file.name,
          path: `${repo.name}/${file.name}`,
          language: file.name.split('.').pop() ?? 'text',
          content: fileContent.slice(0, 2000),
          repo: repo.name,
          url: file.html_url,
        });
      }
    } catch (error) {
      console.error('Error fetching GitHub contents:', error);
    }
  }

  return codeFiles;
}

router.post('/parse-portfolio', async (req: AuthenticatedRequest, res, next) => {
  try {
    const parsed = portfolioSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid portfolio URL' });
    }

    const { portfolioUrl } = parsed.data;
    const codeFiles: any[] = [];

    try {
      const parsedUrl = new URL(portfolioUrl);
      if (parsedUrl.hostname.includes('github.com')) {
        const pathSegments = parsedUrl.pathname.replace(/^\/+/, '').split('/');
        const username = pathSegments[0];
        if (username) {
          const samples = await fetchGitHubCodeSamples(username);
          codeFiles.push(...samples);
        }
      }
    } catch (error) {
      console.error('Unable to parse portfolio URL for GitHub extraction:', error);
    }

    const websiteResponse = await fetchWithTimeout(portfolioUrl, {
      headers: { 'User-Agent': 'CareerCard/1.0' },
    });

    if (!websiteResponse.ok) {
      throw new Error(`Unable to fetch portfolio: ${websiteResponse.status}`);
    }

    const htmlContent = await websiteResponse.text();
    const textContent = htmlContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15_000);

    const completion = await callOpenAI({
      model: OPENAI_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You analyze developer portfolios and return structured data with profile, projects, and frameworks.',
        },
        {
          role: 'user',
          content: `Portfolio URL: ${portfolioUrl}\n\nContent:\n${textContent}`,
        },
      ],
    });

    const result = parseAssistantJson(completion);
    return res.json({ success: true, data: result, codeFiles });
  } catch (error) {
    next(error);
  }
});

const scoreSchema = z.object({
  careerCardData: careerCardDataSchema,
  companyDescription: z.string().min(10, 'Company description is required'),
  roleDescription: z.string().min(10, 'Role description is required'),
});

router.post('/score-career-card', async (req: AuthenticatedRequest, res, next) => {
  try {
    const parsed = scoreSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid scoring payload' });
    }

    const { careerCardData, companyDescription, roleDescription } = parsed.data;

    const completion = await callOpenAI({
      model: OPENAI_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are an interviewing assistant that scores how well a career card fits a company and role. Respond with scores between 0 and 100 and actionable feedback.',
        },
        {
          role: 'user',
          content: `Company description: ${companyDescription}\nRole description: ${roleDescription}\nCareer card data: ${JSON.stringify(careerCardData)}`,
        },
      ],
    });

    const result = parseAssistantJson(completion);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
