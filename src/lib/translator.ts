import { GoogleGenAI } from "@google/genai";

// Initialize Gemini SDK with the API key from the environment
let ai: GoogleGenAI | null = null;
try {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} catch (error) {
  console.warn("Failed to initialize Google Gen AI. Missing API Key?", error);
}

export async function translateText(
  text: string,
  sourceLangName: string,
  targetLangName: string,
  customApiKey?: string | null
): Promise<string> {
  const apiKeyToUse = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKeyToUse) {
    throw new Error("Gemini API is missing. Please provide a valid API Key in settings.");
  }

  const genAi = new GoogleGenAI({ apiKey: apiKeyToUse });

  const prompt = `You are an expert real-time interpreter translating from ${sourceLangName} to ${targetLangName}.
Context: The input text is transcribed from live speech, which may contain background noise or garbled audio.
Requirements:
1. Return strictly the translated text, nothing else.
2. Filter & Ignore Noise: Ignore any obvious transcription errors, filler words, or garbled nonsense caused by background noise.
3. Slang Localization: If the input contains slang or cultural idioms, translate them into the most equivalent, natural slang/idioms in the target language (do not translate them literally).
4. Do not include quotes, explanations, or markdown formatting.

Text: ${text}`;

  try {
    const response = await genAi.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        temperature: 0.2, // Low temperature for high accuracy & determinism
      }
    });
    return response.text?.trim() || "Translation failed.";
  } catch (error: any) {
    console.error("Translation API error:", error);
    
    // Attempt to extract meaningful error information
    const errorMessage = error?.message?.toLowerCase() || '';
    
    if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
      throw new Error("Unable to reach the translation service. Please check your internet connection and try again.");
    }
    
    if (error?.status === 429 || errorMessage.includes("quota") || errorMessage.includes("rate limit") || errorMessage.includes("429")) {
      throw new Error("API rate limit exceeded. The free tier may be busy. Please wait a moment and try again.");
    }

    if (errorMessage.includes("api key") || errorMessage.includes("unauthorized") || error?.status === 401) {
      throw new Error("Invalid API key or unauthorized access to the translation service.");
    }

    throw new Error("The translation service failed to process your request. Please try again.");
  }
}
