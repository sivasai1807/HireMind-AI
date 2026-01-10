
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AtsAnalysis, InterviewEvaluation } from "../types";

const SYSTEM_PERSONALITY = `You are HireMind AI, an advanced AI career assistant used by job seekers to improve resumes, prepare for interviews, and get hired.
Your personality: Professional, Honest, Encouraging but strict, Industry-focused (FAANG/startup level).
Your capabilities: Resume ATS scanning, Resume improvement suggestions, Stack-based mock interviews, Adaptive follow-up questioning, Interview evaluation and feedback, Personalized learning roadmap generation.
Rules: Be concise but insightful, Use real-world hiring standards, Never hallucinate skills, Base decisions only on provided input, Prefer structured JSON responses when requested.`;

export class GeminiService {
  /**
   * Analyzes a resume for ATS compatibility and returns detailed feedback in JSON format.
   */
  async analyzeResume(jobRole: string, experienceLevel: string, resumeText: string): Promise<AtsAnalysis> {
    // Create a new instance for each call to ensure the latest API key is used
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Analyze the resume below for Applicant Tracking System (ATS) compatibility.
Target Role: ${jobRole}
Experience Level: ${experienceLevel}
Resume Content: ${resumeText}

Tasks:
1. Calculate ATS score out of 100
2. Identify missing role-specific keywords
3. Detect formatting issues that affect ATS parsing
4. Evaluate impact of projects and skills
5. Suggest concrete improvements
6. Rewrite 3 weak resume bullet points into strong ATS-friendly bullets

Scoring Criteria:
- Keywords relevance (40%)
- Formatting & structure (25%)
- Project impact (20%)
- Skill clarity (15%)

Return STRICTLY in this JSON format:
{
  "ats_score": number,
  "missing_keywords": [],
  "formatting_issues": [],
  "project_feedback": [],
  "improvement_suggestions": [],
  "rewritten_bullets": []
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PERSONALITY,
        responseMimeType: 'application/json'
      }
    });

    // Extract text directly from property .text
    return JSON.parse(response.text || '{}') as AtsAnalysis;
  }

  /**
   * Rewrites parts of a resume to optimize for recruiters and ATS.
   */
  async rewriteResume(jobRole: string, resumeText: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `You are a professional resume writer for tech roles.
Rewrite the resume below to improve ATS score and recruiter readability.
Constraints: Keep it ONE page, Use action verbs, Quantify results where possible, Do not add fake skills or experience.
Target Role: ${jobRole}
Resume Content: ${resumeText}

Output:
- Improved bullet points
- Optimized skills section
- Suggested section order`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { systemInstruction: SYSTEM_PERSONALITY }
    });

    return response.text || '';
  }

  /**
   * Starts a mock interview session by generating the first technical question.
   */
  async startInterview(role: string, stack: string, difficulty: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `You are a senior technical interviewer at a top product-based company.
Interview Setup: Role: ${role}, Tech Stack: ${stack}, Difficulty Level: ${difficulty}
Interview Rules: Ask ONE question at a time, Wait for user's answer, Ask follow-up questions if the answer is shallow, Maintain professional interview tone.
Start interview with: "Tell me about yourself and your experience with ${stack}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { systemInstruction: SYSTEM_PERSONALITY }
    });

    return response.text || '';
  }

  /**
   * Generates a relevant follow-up question based on the candidate's last answer and context.
   */
  async getFollowUpQuestion(history: string, lastAnswer: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Based on the candidate's answer below, generate a relevant follow-up interview question.
Candidate Answer: ${lastAnswer}
Context/History: ${history}
Rules: Increase difficulty gradually, Focus on clarity and depth, Avoid repeating questions, Keep it realistic.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { systemInstruction: SYSTEM_PERSONALITY }
    });

    return response.text || '';
  }

  /**
   * Evaluates the entire interview transcript and provides detailed feedback and scoring.
   */
  async evaluateInterview(transcript: string): Promise<InterviewEvaluation> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `You are an interview evaluator. Evaluate the candidate based on the interview transcript below.
Transcript: ${transcript}
Evaluation Criteria: 1. Technical Knowledge, 2. Communication Skills, 3. Problem Solving, 4. Confidence, 5. Real-world Understanding
Provide: Score out of 10 for each, Overall performance summary, Strengths, Weaknesses, 3 actionable improvement tips.
Return STRICTLY in this JSON format:
{
  "technical_score": number,
  "communication_score": number,
  "problem_solving_score": number,
  "confidence_score": number,
  "overall_feedback": "",
  "strengths": [],
  "weaknesses": [],
  "improvement_tips": []
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PERSONALITY,
        responseMimeType: 'application/json'
      }
    });

    return JSON.parse(response.text || '{}') as InterviewEvaluation;
  }

  /**
   * Generates a 30-day personalized learning roadmap based on identified resume and interview gaps.
   */
  async generateRoadmap(role: string, resumeGaps: string, interviewGaps: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `You are a career mentor AI. Based on Resume gaps and Interview performance for ${role}:
Inputs:
Resume Weaknesses: ${resumeGaps}
Interview Weaknesses: ${interviewGaps}
Target Role: ${role}

Create a 30-day learning roadmap.
Constraints: Weekly breakdown, Daily tasks, Focus on fundamentals + projects, Beginner-friendly but industry-relevant.
Output Format: Week 1: Day 1: Day 2: ... Week 4:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { systemInstruction: SYSTEM_PERSONALITY }
    });

    return response.text || '';
  }
}

export const gemini = new GeminiService();
