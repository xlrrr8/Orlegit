import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Verdict } from "./mockData";

export interface AIAnalysisResult {
  verdict: Verdict;
  confidence: number;
  reasoning: string;
  red_flags: string[];
}

const MOCK_ANALYSIS: AIAnalysisResult = {
  verdict: "UNCERTAIN",
  confidence: 60,
  reasoning:
    "Running in demo mode. Connect your Gemini API key in .env.local to enable real AI analysis.",
  red_flags: ["Demo mode active"],
};

export async function analyzeReport(
  title: string,
  description: string,
  target: string,
  category: string
): Promise<AIAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key") {
    // Return mock result in demo mode
    await new Promise((r) => setTimeout(r, 1500)); // Simulate delay
    return MOCK_ANALYSIS;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are a scam detection AI. Analyze this report and determine if the target is a scam or genuine.

Report Title: ${title}
Category: ${category}
Target (URL/Phone/Profile): ${target}
Description: ${description}

Respond ONLY with a valid JSON object in this exact format:
{
  "verdict": "LIKELY_SCAM" | "LIKELY_GENUINE" | "UNCERTAIN",
  "confidence": <number 0-100>,
  "reasoning": "<1-2 sentence explanation>",
  "red_flags": ["<flag1>", "<flag2>", ...]
}

Base your verdict on:
- Known scam patterns (phishing URLs, advance fee, romance scam, tech support, pump and dump)
- Urgency or pressure tactics in the description
- Requests for money, OTP, or personal information
- Legitimacy of any mentioned platforms or phone numbers
- Too-good-to-be-true claims`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]) as AIAnalysisResult;
  } catch {
    return {
      verdict: "UNCERTAIN",
      confidence: 50,
      reasoning: "AI analysis failed. Please review manually.",
      red_flags: [],
    };
  }
}
