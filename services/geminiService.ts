import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Message } from "../App";

// According to guidelines, initialize with a named parameter for the API key.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getChatHistory = (messages: Message[]) => {
  // Simple filter to remove system core messages from history passed to the model
  return messages
    .filter(m => m.role !== 'system_core')
    .map(m => ({
      role: m.role === 'fux' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
};

export const analyzeCode = async (prompt: string, history: Message[]): Promise<string> => {
  try {
    // According to guidelines, use 'gemini-2.5-flash'.
    const model = 'gemini-2.5-flash';
    
    // According to guidelines, do not define the model first. Use ai.models.generateContent.
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: `User prompt: ${prompt}\n\nAnalyze the user's request and provide a concise, expert-level response. You are FuX, a Fusion Experience AI. Your persona is professional, slightly futuristic, and highly competent.`,
      // config can be added here if needed, e.g. systemInstruction
    });

    // According to guidelines, access text output via response.text
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to communicate with the AI Core. Check console for details.");
  }
};

export const executeCode = async (powerName: string, args: string[]): Promise<string> => {
  // This is a mock execution. In a real-world scenario, you would have a secure
  // environment to execute code or specific functions based on the powerName.
  console.log(`Executing power module '${powerName}' with args:`, args);
  
  try {
    // According to guidelines, use 'gemini-2.5-flash'.
    const model = 'gemini-2.5-flash';
    const prompt = `Simulate the execution of a power module named "${powerName}" with the following arguments: ${args.join(', ')}. Provide a plausible, concise, text-based result as if the module ran successfully.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: model,
        contents: prompt
    });

    // According to guidelines, access text output via response.text
    return response.text;
  } catch (error) {
    console.error("Gemini API Error during execution simulation:", error);
    throw new Error(`Failed to simulate execution for power module: ${powerName}.`);
  }
};
