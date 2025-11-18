import type { CareerCardData } from '@/components/CareerCardBuilder';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    credentials: 'include',
    ...options,
  });

  if (!response.ok) {
    let errorMessage = 'Request failed';
    try {
      const body = await response.json();
      errorMessage = body?.error || errorMessage;
    } catch (_) {
      errorMessage = response.statusText;
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const cardApi = {
  async createCard(cardData: CareerCardData) {
    return request<{ id: string; editToken: string }>('/cards', {
      method: 'POST',
      body: JSON.stringify({ cardData }),
    });
  },
  async updateCard(id: string, cardData: CareerCardData) {
    return request<{ success: boolean }>(`/cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ cardData }),
    });
  },
  async fetchCard(id: string) {
    const data = await request<{ cardData: CareerCardData }>(`/cards/${id}`);
    return data.cardData;
  },
  async fetchMyCard() {
    return request<{ id: string | null; cardData: CareerCardData | null }>('/cards/me');
  },
};

export const authApi = {
  signup(payload: { email: string; password: string }) {
    return request<{ user: { id: string; email: string } }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  login(payload: { email: string; password: string }) {
    return request<{ user: { id: string; email: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  logout() {
    return request('/auth/logout', {
      method: 'POST',
    });
  },
  me() {
    return request<{ user: { id: string; email: string } }>('/auth/me');
  },
};

export const aiApi = {
  parseResume(payload: { resumeText?: string; imageData?: string }) {
    return request('/ai/parse-resume', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  parseResumeExperience(payload: { resumeText: string }) {
    return request('/ai/parse-resume-experience', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  parsePortfolio(payload: { portfolioUrl: string }) {
    return request<{ success: boolean; data?: any; codeFiles?: any[]; error?: string }>('/ai/parse-portfolio', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  scoreCareerCard(payload: {
    careerCardData: CareerCardData;
    companyDescription: string;
    roleDescription: string;
  }) {
    return request('/ai/score-career-card', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
