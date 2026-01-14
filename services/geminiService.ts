
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AtsAnalysis, InterviewEvaluation, LearningRoadmap } from "../types";

const SYSTEM_PERSONALITY = `You are a Senior Executive Career Coach and Talent Acquisition Specialist with over 20 years of experience at top-tier global firms. 
Your tone is professional, insightful, and direct. You provide high-level constructive feedback that helps candidates excel in competitive hiring environments.
Your expertise includes resume optimization, behavioral and technical interviewing, and career progression strategy.
Always communicate as a human expert. Avoid robotic language or technical jargon like 'neural' or 'syncing'. Base your feedback on current hiring benchmarks for Fortune 500 and leading startups.`;

export class GeminiService {
  private async safeCall<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        const status = err.status || (err.message?.includes('429') ? 429 : 500);
        if (status === 429 || (status >= 500 && status <= 599)) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  async analyzeResume(jobRole: string, experienceLevel: string, resumeText: string): Promise<AtsAnalysis> {
    return this.safeCall(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Review this candidate's resume for a ${jobRole} position at a ${experienceLevel} level. \nResume Content: ${resumeText}\nProvide a comprehensive evaluation in JSON: ats_score (out of 100), missing_keywords[], formatting_issues[], project_feedback[], improvement_suggestions[], rewritten_bullets[].`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: SYSTEM_PERSONALITY, responseMimeType: 'application/json' }
      });
      return JSON.parse(response.text || '{}') as AtsAnalysis;
    });
  }

  async startInterview(role: string, stack: string, difficulty: string): Promise<string> {
    return this.safeCall(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Start a professional mock interview for a ${role} position. Focus on ${stack} and related technical/behavioral competencies. The seniority level is ${difficulty}. Open the conversation naturally by asking the candidate to introduce themselves and highlight their relevant experience.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { systemInstruction: SYSTEM_PERSONALITY }
      });
      return response.text || '';
    });
  }

  async getFollowUpQuestion(history: string, lastAnswer: string): Promise<string> {
    return this.safeCall(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Interview History: ${history}\nCandidate's last response: ${lastAnswer}\nAsk a targeted follow-up question that explores their technical depth or problem-solving methodology.`,
        config: { systemInstruction: SYSTEM_PERSONALITY }
      });
      return response.text || '';
    });
  }

  async evaluateInterview(transcript: string): Promise<InterviewEvaluation> {
    return this.safeCall(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Evaluate the following interview transcript:\n${transcript}\nProvide professional performance metrics in JSON: technical_score, communication_score, problem_solving_score, confidence_score, overall_feedback, strengths[], weaknesses[], improvement_tips[].`,
        config: { systemInstruction: SYSTEM_PERSONALITY, responseMimeType: 'application/json' }
      });
      return JSON.parse(response.text || '{}') as InterviewEvaluation;
    });
  }

  async generateCustomRoadmap(field: string, goal: string): Promise<Partial<LearningRoadmap>> {
    return this.safeCall(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Create a highly detailed, professional career roadmap for the field: ${field}. User's Goal: ${goal}.
      You MUST return valid JSON with these keys:
      estimated_days: number,
      milestones: Array of objects { week: number, topic: string, description: string, tasks: string[], resources: Array of objects {title, url} },
      project_suggestions: Array of objects { name, description, tech_stack: string[] },
      hiring_companies: Array of objects { name, industry, typical_roles: string[] }.
      Ensure the plan is logical, comprehensive, and helpful for professional growth. Use credible-sounding resource URLs if possible.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: SYSTEM_PERSONALITY, responseMimeType: 'application/json' }
      });
      return JSON.parse(response.text || '{}') as Partial<LearningRoadmap>;
    });
  }
}

export const gemini = new GeminiService();
