
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AtsAnalysis, InterviewEvaluation } from "../types";

const SYSTEM_PERSONALITY = `You are a Senior Executive Career Coach and Lead Recruiter with 20+ years of experience in high-tier technology firms. 
Your personality: Articulate, Precise, Highly Professional, and Results-Oriented. You provide feedback that is direct but constructive.
Your capabilities: Evaluating professional alignment, identifying experience gaps, conducting rigorous technical and behavioral interviews, and mapping out strategic career paths.
Rules: Speak as a human expert. Avoid robotic jargon. Use industry-standard benchmarks for FAANG and top-tier startups. Provide deep insights, not generic summaries. Base all decisions strictly on the provided candidate data.`;

export class GeminiService {
  /**
   * Helper to handle retries with exponential backoff for 429 and 5xx errors.
   */
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
      const prompt = `Review this candidate profile for a ${jobRole} role at a ${experienceLevel} level. \nContent: ${resumeText}\nProvide a detailed assessment in JSON: ats_score (out of 100), missing_keywords[], formatting_issues[], project_feedback[], improvement_suggestions[], rewritten_bullets[].`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: SYSTEM_PERSONALITY, responseMimeType: 'application/json' }
      });
      return JSON.parse(response.text || '{}') as AtsAnalysis;
    });
  }

  async rewriteResume(jobRole: string, resumeText: string): Promise<string> {
    return this.safeCall(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `As an executive resume writer, optimize this profile for a ${jobRole} position:\n${resumeText}`,
        config: { systemInstruction: SYSTEM_PERSONALITY }
      });
      return response.text || '';
    });
  }

  async startInterview(role: string, stack: string, difficulty: string): Promise<string> {
    return this.safeCall(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Conduct a professional interview for a ${role} position focusing on ${stack}. The candidate level is ${difficulty}. Begin the session naturally, for example by asking them to introduce themselves and their background with ${stack}.`;
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
        contents: `Current Interview Transcript: ${history}\nCandidate's last response: ${lastAnswer}\nAs the lead interviewer, ask a pertinent follow-up question that digs deeper into their technical expertise or decision-making.`,
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
        contents: `Provide an executive summary of this interview:\n${transcript}\nAnalyze performance in JSON: technical_score, communication_score, problem_solving_score, confidence_score, overall_feedback, strengths[], weaknesses[], improvement_tips[].`,
        config: { systemInstruction: SYSTEM_PERSONALITY, responseMimeType: 'application/json' }
      });
      return JSON.parse(response.text || '{}') as InterviewEvaluation;
    });
  }

  async generateRoadmap(role: string, resumeGaps: string, interviewGaps: string): Promise<string> {
    return this.safeCall(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Design a strategic 30-day professional development plan for a ${role} position based on these identified growth areas:\nProfile Gaps: ${resumeGaps}\nPerformance Gaps: ${interviewGaps}. Structure it by week.`,
        config: { systemInstruction: SYSTEM_PERSONALITY }
      });
      return response.text || '';
    });
  }
}

export const gemini = new GeminiService();
