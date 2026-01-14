
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AtsAnalysis, InterviewEvaluation } from "../types";

const SYSTEM_PERSONALITY = `You are HireMind AI, an advanced AI career assistant used by job seekers to improve resumes, prepare for interviews, and get hired.
Your personality: Professional, Honest, Encouraging but strict, Industry-focused (FAANG/startup level).
Your capabilities: Resume ATS scanning, Resume improvement suggestions, Stack-based mock interviews, Adaptive follow-up questioning, Interview evaluation and feedback, Personalized learning roadmap generation.
Rules: Be concise but insightful, Use real-world hiring standards, Never hallucinate skills, Base decisions only on provided input, Prefer structured JSON responses when requested.`;

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
        // Only retry on rate limits or server errors
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
      const prompt = `Analyze the resume below for ATS compatibility. Role: ${jobRole}, Level: ${experienceLevel}\nContent: ${resumeText}\nReturn JSON with ats_score, missing_keywords[], formatting_issues[], project_feedback[], improvement_suggestions[], rewritten_bullets[].`;
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
        contents: `Optimize this resume for ${jobRole}:\n${resumeText}`,
        config: { systemInstruction: SYSTEM_PERSONALITY }
      });
      return response.text || '';
    });
  }

  async startInterview(role: string, stack: string, difficulty: string): Promise<string> {
    return this.safeCall(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Start a technical interview for ${role} with focus on ${stack}. Difficulty: ${difficulty}. Start with: "Tell me about yourself and your experience with ${stack}"`;
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
        contents: `Context: ${history}\nAnswer: ${lastAnswer}\nAsk a follow-up.`,
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
        contents: `Evaluate this interview transcript:\n${transcript}\nReturn JSON with technical_score, communication_score, problem_solving_score, confidence_score, overall_feedback, strengths[], weaknesses[], improvement_tips[].`,
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
        contents: `Create a 30-day roadmap for ${role} based on these gaps:\nResume: ${resumeGaps}\nInterview: ${interviewGaps}`,
        config: { systemInstruction: SYSTEM_PERSONALITY }
      });
      return response.text || '';
    });
  }
}

export const gemini = new GeminiService();
