import { randomUUID } from "crypto";

const SECTION_PATTERNS: Record<SectionKey, RegExp[]> = {
  general: [],
  experience: [
    /experience/i,
    /work experience/i,
    /professional experience/i,
    /employment history/i,
  ],
  projects: [
    /projects/i,
    /project experience/i,
    /personal projects/i,
    /selected projects/i,
  ],
  skills: [
    /skills/i,
    /technical skills/i,
    /tech stack/i,
    /technologies/i,
  ],
};

const ROLE_KEYWORDS = [
  "engineer",
  "developer",
  "designer",
  "manager",
  "lead",
  "consultant",
  "specialist",
  "architect",
  "intern",
  "analyst",
];

const PROJECT_KEYWORDS = [
  "project",
  "built",
  "developed",
  "created",
  "designed",
  "launched",
  "implemented",
];

const TECH_KEYWORDS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Django",
  "Flask",
  "FastAPI",
  "Go",
  "Rust",
  "Java",
  "Spring",
  "Kotlin",
  "Swift",
  "C++",
  "C#",
  ".NET",
  "PHP",
  "Laravel",
  "Ruby",
  "Rails",
  "AWS",
  "Azure",
  "GCP",
  "Kubernetes",
  "Docker",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "GraphQL",
  "REST",
  "Tailwind CSS",
  "Sass",
  "HTML",
  "CSS",
  "SQL",
  "NoSQL",
  "Firebase",
  "Unity",
  "TensorFlow",
  "PyTorch",
  "Terraform",
];

const DATE_RANGE_REGEX =
  /\b((Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}|Q[1-4]\s+\d{4}|\d{4})\s*(?:-|–|to|through|present|current)\s*(Present|Current|(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}|\d{4})/i;

type SectionKey = "general" | "experience" | "projects" | "skills";

interface ResumeSections {
  general: string[];
  experience: string[];
  projects: string[];
  skills: string[];
}

interface ExperienceEntry {
  id: string;
  title: string;
  company: string;
  period: string;
  description: string;
}

interface ProjectEntry {
  id: string;
  name: string;
  description: string;
  technologies: string;
  projectUrl?: string;
}

interface FrameworkEntry {
  id: string;
  name: string;
  proficiency: string;
  projectsBuilt?: string;
}

interface ParsedResumeData {
  experiences: ExperienceEntry[];
  projects: ProjectEntry[];
  frameworks: FrameworkEntry[];
}

export function buildResumeCardData(resumeText: string) {
  const parsed = analyzeResume(resumeText);
  return {
    profile: {
      name: "",
      title: "",
      location: "",
      imageUrl: "",
      portfolioUrl: "",
    },
    experience: parsed.experiences,
    projects: parsed.projects,
    frameworks: parsed.frameworks,
    greatestImpacts: [],
    stylesOfWork: [],
    pastimes: [],
    codeShowcase: [],
    theme: "blue",
  };
}

export function extractExperiencesAndProjects(resumeText: string) {
  const parsed = analyzeResume(resumeText);
  return {
    experiences: parsed.experiences,
    projects: parsed.projects,
  };
}

function analyzeResume(resumeText: string): ParsedResumeData {
  const sections = splitIntoSections(resumeText);

  let experiences = parseExperienceBlocks(sections.experience);
  if (experiences.length === 0) {
    experiences = parseExperienceBlocks(sections.general);
  }

  let projects = parseProjectBlocks(sections.projects);
  if (projects.length === 0) {
    projects = parseProjectBlocks(sections.general);
  }

  let frameworks = parseFrameworks(sections.skills);
  if (frameworks.length === 0) {
    frameworks = parseFrameworks(sections.general);
  }

  return {
    experiences,
    projects,
    frameworks,
  };
}

function splitIntoSections(text: string): ResumeSections {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd());

  const sections: ResumeSections = {
    general: [],
    experience: [],
    projects: [],
    skills: [],
  };

  let currentSection: SectionKey = "general";

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      sections[currentSection].push("");
      return;
    }

    const normalized = trimmed.replace(/:$/, "").toLowerCase();

    const match = (Object.keys(SECTION_PATTERNS) as SectionKey[]).find((key) =>
      SECTION_PATTERNS[key].some((regex) => regex.test(normalized))
    );

    if (match && match !== currentSection) {
      currentSection = match;
      return;
    }

    sections[currentSection].push(trimmed);
  });

  return sections;
}

function parseExperienceBlocks(lines: string[]): ExperienceEntry[] {
  const blocks = blockify(lines);
  const experiences: ExperienceEntry[] = [];

  for (const block of blocks) {
    if (!looksLikeExperience(block)) continue;
    const parsed = buildExperience(block);
    if (parsed) {
      experiences.push(parsed);
    }
  }

  return experiences;
}

function parseProjectBlocks(lines: string[]): ProjectEntry[] {
  const blocks = blockify(lines);
  const projects: ProjectEntry[] = [];

  for (const block of blocks) {
    if (!looksLikeProject(block)) continue;
    const parsed = buildProject(block);
    if (parsed) {
      projects.push(parsed);
    }
  }

  return projects;
}

function parseFrameworks(lines: string[]): FrameworkEntry[] {
  const text = lines.join(" ").toLowerCase();
  const found = new Set<string>();

  TECH_KEYWORDS.forEach((keyword) => {
    if (text.includes(keyword.toLowerCase())) {
      found.add(keyword);
    }
  });

  return Array.from(found).map((name) => ({
    id: randomUUID(),
    name,
    proficiency: "Proficient",
  }));
}

function blockify(lines: string[]): string[] {
  const text = lines.join("\n").trim();
  if (!text) return [];
  return text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
}

function looksLikeExperience(block: string) {
  const lower = block.toLowerCase();
  return (
    DATE_RANGE_REGEX.test(block) ||
    ROLE_KEYWORDS.some((keyword) => lower.includes(keyword))
  );
}

function looksLikeProject(block: string) {
  const lower = block.toLowerCase();
  return PROJECT_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function buildExperience(block: string): ExperienceEntry | null {
  const lines = block.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const header = lines.shift() ?? "";
  const periodMatch = header.match(DATE_RANGE_REGEX) || block.match(DATE_RANGE_REGEX);
  const period = periodMatch ? normalizeWhitespace(periodMatch[0]) : "";

  const headerWithoutPeriod = periodMatch
    ? normalizeWhitespace(header.replace(periodMatch[0], ""))
    : header;

  const { title, company } = splitTitleCompany(headerWithoutPeriod, lines[0]);
  if (!title && !company && lines.length === 0) {
    return null;
  }

  const description = normalizeWhitespace(lines.join(" "));

  return {
    id: randomUUID(),
    title: title || "Experience",
    company: company || "",
    period,
    description,
  };
}

function buildProject(block: string): ProjectEntry | null {
  const lines = block.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const nameLine = lines.shift() ?? "";
  const description = normalizeWhitespace(lines.join(" "));
  const technologies = extractTechnologies(description);

  return {
    id: randomUUID(),
    name: titleCase(nameLine.replace(/^[-•]\s*/, "")) || "Project",
    description,
    technologies: technologies.join(", "),
  };
}

function splitTitleCompany(header: string, possibleCompany?: string) {
  const atMatch = header.match(/(.+?)(?:\s+at|\s+@|\s+-|\s+\|)\s+(.+)/i);
  if (atMatch) {
    return { title: atMatch[1].trim(), company: atMatch[2].trim() };
  }

  if (possibleCompany && /^[A-Za-z][A-Za-z0-9 &,.]{2,}$/.test(possibleCompany)) {
    return { title: header.trim(), company: possibleCompany.trim() };
  }

  return { title: header.trim(), company: "" };
}

function extractTechnologies(text: string) {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  TECH_KEYWORDS.forEach((keyword) => {
    if (lower.includes(keyword.toLowerCase())) {
      found.add(keyword);
    }
  });
  return Array.from(found);
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function titleCase(value: string) {
  if (!value) return value;
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
