import { Router } from 'express';
import { z } from 'zod';
import { careerCardDataSchema } from '../../../src/shared/career-card-schema.js';
import { AuthenticatedRequest, requireAuth } from '../utils/auth.js';

const router = Router();
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

function requireAIKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return key;
}

async function callGemini(payload: Record<string, unknown>) {
  const apiKey = requireAIKey();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

function parseGeminiJson(response: any) {
  const parts = response?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    throw new Error('Invalid AI response');
  }

  const textPart = parts.find((part: any) => typeof part?.text === 'string');
  if (!textPart?.text) {
    throw new Error('Unable to parse AI response payload');
  }

  return JSON.parse(textPart.text);
}

function toInlineImagePart(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image data format');
  }
  const [, mimeType, data] = match;
  return {
    inlineData: {
      mimeType,
      data,
    },
  };
}

function buildJsonConfig() {
  return {
    generationConfig: {
      responseMimeType: 'application/json',
    },
  };
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

    const systemPrompt =
      'You extract structured data for a career card. Always respond with valid JSON containing profile, experience, frameworks, projects, codeShowcase, pastimes, stylesOfWork, and greatestImpacts.';

    const contents: any[] = [];

    if (parsed.data.imageData) {
      contents.push({
        role: 'user',
        parts: [
          {
            text: 'Extract all visible information from this career card image and return the structured JSON described in the instructions.',
          },
          toInlineImagePart(parsed.data.imageData),
        ],
      });
    } else if (parsed.data.resumeText) {
      contents.push({
        role: 'user',
        parts: [
          {
            text: `Resume text:\n${parsed.data.resumeText}\n\nReturn structured JSON with profile, experience, frameworks, projects, codeShowcase, pastimes, stylesOfWork, greatestImpacts.`,
          },
        ],
      });
    }

    const completion = await callGemini({
      contents,
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemPrompt }],
      },
      ...buildJsonConfig(),
    });

    const result = parseGeminiJson(completion);
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

    const completion = await callGemini({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Extract structured work experience entries AND project entries from this resume text. Resume:\n${parsed.data.resumeText}`,
            },
          ],
        },
      ],
      systemInstruction: {
        role: 'system',
        parts: [
          {
            text: 'You extract work experience and project entries from resumes. Always return JSON with experiences and projects arrays.',
          },
        ],
      },
      ...buildJsonConfig(),
    });

    const result = parseGeminiJson(completion);
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

    const completion = await callGemini({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Portfolio URL: ${portfolioUrl}\n\nContent:\n${textContent}\n\nSummarize into structured JSON containing profile highlights, notable projects, and frameworks/technologies.`,
            },
          ],
        },
      ],
      systemInstruction: {
        role: 'system',
        parts: [
          {
            text: 'You analyze developer portfolios and return structured data with profile, projects, and frameworks.',
          },
        ],
      },
      ...buildJsonConfig(),
    });

    const result = parseGeminiJson(completion);
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

    const completion = await callGemini({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Company description: ${companyDescription}\nRole description: ${roleDescription}\nCareer card data: ${JSON.stringify(
                careerCardData
              )}`,
            },
          ],
        },
      ],
      systemInstruction: {
        role: 'system',
        parts: [
          {
            text: 'You are an interviewing assistant that scores how well a career card fits a company and role. Respond with scores between 0 and 100 and actionable feedback.',
          },
        ],
      },
      ...buildJsonConfig(),
    });

    const result = parseGeminiJson(completion);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
