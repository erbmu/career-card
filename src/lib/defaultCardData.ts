import type { CareerCardData } from "@/types/career-card";

export const createEmptyCareerCardData = (name: string): CareerCardData => ({
  profile: {
    name,
    title: "",
    location: "",
    imageUrl: "",
    portfolioUrl: "",
  },
  theme: 'blue',
  experience: [],
  projects: [],
  greatestImpacts: [],
  stylesOfWork: [],
  frameworks: [],
  pastimes: [],
  codeShowcase: [],
});
