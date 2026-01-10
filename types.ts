
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

export interface SavedInterview {
  id: string;
  timestamp: number;
  jobRole: string;
  techStack: string;
  transcript: Message[];
  evaluation: InterviewEvaluation;
}

export interface SkillGap {
  missing_core_skills: string[];
  weak_fundamentals: string[];
  suggested_focus_areas: string[];
}

export type AppView = 'landing' | 'resume' | 'interview' | 'dashboard' | 'roadmap';
