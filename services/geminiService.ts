import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY;
// Initialize securely; if no key, the service will handle it gracefully.
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateSnippetSummary = async (text: string): Promise<string> => {
  if (!ai || !text.trim()) return "Snippet";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize the following text in exactly 3 to 5 words to be used as a title. Do not use quotes. Keep it descriptive but extremely brief.\n\nText: ${text.substring(0, 500)}`,
      config: {
        maxOutputTokens: 20,
        temperature: 0.3,
        thinkingConfig: { thinkingBudget: 0 },
      }
    });

    return response.text?.trim() || "Snippet";
  } catch (error) {
    console.warn("Failed to generate summary with Gemini:", error);
    return "Snippet";
  }
};