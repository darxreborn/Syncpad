import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.API_KEY;
// Initialize securely; if no key, the service will handle it gracefully.
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const generateSnippetSummary = async (text: string): Promise<string> => {
  if (!genAI || !text.trim()) return "Snippet";

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{
          text: `Summarize the following text in exactly 3 to 5 words to be used as a title. Do not use quotes. Keep it descriptive but extremely brief.\n\nText: ${text.substring(0, 500)}`
        }]
      }],
      generationConfig: {
        maxOutputTokens: 20,
        temperature: 0.3,
      }
    });

    const response = result.response;
    return response.text()?.trim() || "Snippet";
  } catch (error) {
    console.warn("Failed to generate summary with Gemini:", error);
    return "Snippet";
  }
};