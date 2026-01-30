import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { OperaAnalysisResult } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeAudio(audioBase64: string, mimeType: string): Promise<OperaAnalysisResult> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: audioBase64
              }
            },
            {
              text: "Analyze this audio. Classify the genre and generate the Bangu percussion score according to the system instructions."
            }
          ]
        },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              genre: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              reasoning: { type: Type.STRING },
              banguScore: { type: Type.STRING },
              culturalContext: { type: Type.STRING }
            },
            required: ["genre", "confidence", "reasoning", "banguScore", "culturalContext"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response from Gemini.");
      }

      return JSON.parse(text) as OperaAnalysisResult;

    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      throw error;
    }
  }
}
