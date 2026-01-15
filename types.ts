
export interface AtsAnalysis {
  ats_score: number;
  missing_keywords: string[];
  formatting_issues: string[];
  project_feedback: string[];
  improvement_suggestions: string[];
  rewritten_bullets: string[];
}

export interface SavedResumeAnalysis extends AtsAnalysis {
  id: string;
  timestamp: number;
  jobRole: string;
}

export interface InterviewEvaluation {
  technical_score: number;
  communication_score: number;
  problem_solving_score: number;
  confidence_score: number;
  overall_feedback: string;
  strengths: string[];
  weaknesses: string[];
  improvement_tips: string[];
}

export interface Message {
  role: 'interviewer' | 'candidate';
  text: string;
  timestamp: number;
}

export type InterviewRound = 'BEHAVIORAL' | 'TECHNICAL' | 'CODING';

export interface SavedInterview {
  id: string;
  timestamp: number;
  jobRole: string;
  techStack: string;
  transcript: Message[];
  evaluation: InterviewEvaluation;
  roundType?: InterviewRound;
}

export interface LearningRoadmap {
  id: string;
  timestamp: number;
  field: string;
  goal: string;
  estimated_days: number;
  milestones: Array<{
    week: number;
    topic: string;
    description: string;
    tasks: string[];
    resources: Array<{ title: string; url: string }>;
  }>;
  project_suggestions: Array<{
    name: string;
    description: string;
    tech_stack: string[];
  }>;
  hiring_companies: Array<{
    name: string;
    industry: string;
    typical_roles: string[];
  }>;
}

export interface CompanyQuestion {
  id: string;
  company: string;
  role: string;
  question: string;
  category: 'Coding' | 'System Design' | 'Behavioral';
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export type AppView = 'landing' | 'resume' | 'interview' | 'dashboard' | 'learning-path' | 'questions-bank';
