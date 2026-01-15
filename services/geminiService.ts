
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AtsAnalysis, InterviewEvaluation, LearningRoadmap, InterviewRound } from "../types";

const SYSTEM_PERSONALITY = `You are a Principal Engineer and Elite Technical Recruiter at a Tier-1 tech firm. 
Your tone is high-stakes, professional, and discerning. You focus on deep technical architectural understanding, algorithmic efficiency, and professional leadership.
You do not use emojis or robotic fillers. You ask sharp, multi-layered questions that probe the boundaries of a candidate's knowledge.
In Coding rounds, you provide clear, challenging problems and guide the candidate through edge cases and complexity analysis (Big O).`;

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

  async startInterview(role: string, stack: string, difficulty: string, round: InterviewRound = 'TECHNICAL'): Promise<string> {
    return this.safeCall(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const roundPrompt = round === 'CODING' 
        ? "Present a complex algorithmic or system design coding challenge." 
        : round === 'BEHAVIORAL' 
        ? "Focus on leadership, conflict resolution, and the STAR method." 
        : "Focus on deep technical internals and architecture.";
      
      const prompt = `Round: ${round}. Level: ${difficulty}. Start a professional interview for ${role} with focus on ${stack}. ${roundPrompt} Begin with a high-level introductory challenge or question.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { systemInstruction: SYSTEM_PERSONALITY }
      });
      return response.text || '';
    });
  }

  async getFollowUpQuestion(history: string, lastAnswer: string, round: InterviewRound = 'TECHNICAL'): Promise<string> {
    return this.safeCall(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Round: ${round}. Interview History: ${history}\nCandidate's last response: ${lastAnswer}\nAsk a challenging, high-level follow-up question. If this is a CODING round, ask about space/time complexity or potential optimizations for the proposed solution. No emojis.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
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
        contents: `Evaluate this interview transcript:\n${transcript}\nProvide professional performance metrics in JSON: technical_score, communication_score, problem_solving_score, confidence_score, overall_feedback, strengths[], weaknesses[], improvement_tips[]. Score strictly.`,
        config: { systemInstruction: SYSTEM_PERSONALITY, responseMimeType: 'application/json' }
      });
      return JSON.parse(response.text || '{}') as InterviewEvaluation;
    });
  }

  async generateCustomRoadmap(field: string, goal: string): Promise<Partial<LearningRoadmap>> {
    return this.safeCall(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Create a professional career roadmap for: ${field}. Goal: ${goal}.\nReturn JSON: estimated_days, milestones[], project_suggestions[], hiring_companies[].`;
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
