import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
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

export interface AgentStep {
  tool: 'vmix' | 'blender' | 'generateImage' | 'search' | 'finalAnswer';
  args: string;
  thought: string;
}

export const createExecutionPlan = async (goal: string): Promise<AgentStep[]> => {
  const model = 'gemini-2.5-flash';
  
  const prompt = `You are FuX, an advanced AI agent that creates and executes multi-step plans to achieve complex user goals. You must critically analyze the user's request and devise a robust plan, considering tool dependencies and potential conflicts.

**Core Directives:**
1.  **Decomposition:** Break down the user's goal into a logical sequence of tool calls.
2.  **Dependency Management:** The output of one step can be used as the input for a subsequent step. When a tool generates a result (e.g., an image URL, search results), you can reference it in a later step's arguments using the placeholder format: \`{{step_N_output}}\`, where 'N' is the 1-based index of the step providing the output. For example, to search for information about a generated image, you must first have a \`generateImage\` step, and then a \`search\` step that might have arguments like "what is in the image located at {{step_1_output}}?".
3.  **Conflict Resolution:** Ensure the plan is logical and free of contradictions. Do not attempt to use an output before it has been generated.
4.  **Final Summary:** The final step must always be 'finalAnswer' to provide a comprehensive summary of the actions taken and the results achieved.

**Available Tools:**
- vmix: Control vMix live production software. Usage: "switch input <input_name_or_number>" OR "transition input <id> <type> <duration_ms>" OR "script <python_script_string>"
- blender: Execute a Python script in Blender. Usage: "<python_script_string>"
- generateImage: Generates an image from a text prompt. **Output:** A data URL for the generated image.
- search: Search the web for information. **Output:** A text summary of the search results.
- finalAnswer: Provide a final text answer to the user. Usage: "<summary_of_results>"

**User's Goal:** "${goal}"

Respond with a JSON object that strictly adheres to the provided schema.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          plan: {
            type: Type.ARRAY,
            description: "The sequence of steps to achieve the goal.",
            items: {
              type: Type.OBJECT,
              properties: {
                thought: {
                  type: Type.STRING,
                  description: "Your reasoning for choosing this tool and these arguments."
                },
                tool: {
                  type: Type.STRING,
                  description: "The name of the tool to use.",
                  enum: ['vmix', 'blender', 'generateImage', 'search', 'finalAnswer']
                },
                args: {
                  type: Type.STRING,
                  description: "The arguments to pass to the tool. Can contain placeholders like {{step_1_output}}."
                }
              },
              required: ['thought', 'tool', 'args']
            }
          }
        }
      }
    }
  });

  try {
    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    if (parsed.plan && Array.isArray(parsed.plan)) {
      // Basic validation for the plan structure
      const isValidPlan = parsed.plan.every((step: any) => 
        typeof step.thought === 'string' &&
        typeof step.tool === 'string' &&
        typeof step.args === 'string'
      );
      if (isValidPlan) {
        return parsed.plan as AgentStep[];
      }
    }
    throw new Error("Invalid plan structure received from AI.");
  } catch (e) {
    console.error("Failed to parse agent plan:", e, "Raw response:", response.text);
    throw new Error("The AI core failed to generate a valid execution plan.");
  }
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

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    // According to guidelines, use 'imagen-4.0-generate-001' for image generation.
    const model = 'imagen-4.0-generate-001';
    const response = await ai.models.generateImages({
      model: model,
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return base64ImageBytes;
    } else {
      throw new Error("No image was generated by the API.");
    }
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw new Error("Failed to generate image. The AI Core may be offline or the prompt was rejected.");
  }
};

export const googleSearch = async (query: string) => {
  try {
    const model = 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model: model,
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { text, sources };
  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw new Error("Failed to execute search. Please check the API connection and your query.");
  }
};