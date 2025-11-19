export interface CareerCardData {
  profile: {
    name: string;
    title: string;
    location: string;
    imageUrl: string;
    portfolioUrl?: string;
  };
  theme?: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'slate';
  experience: Array<{
    id: string;
    title: string;
    company: string;
    period: string;
    description: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    description: string;
    technologies: string;
    projectUrl?: string;
  }>;
  greatestImpacts: Array<{
    id: string;
    title: string;
    context: string;
    outcome?: string;
  }>;
  stylesOfWork: Array<{
    id: string;
    question: string;
    selectedAnswer: string;
  }>;
  frameworks: Array<{
    id: string;
    name: string;
    proficiency: string;
    projectsBuilt?: string;
  }>;
  pastimes: Array<{
    id: string;
    activity: string;
    description: string;
  }>;
  codeShowcase: Array<{
    id: string;
    fileName: string;
    language: string;
    code: string;
    caption?: string;
    repo?: string;
    url?: string;
  }>;
}
