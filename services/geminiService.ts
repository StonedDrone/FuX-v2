import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { Message } from "../App";

// According to guidelines, initialize with a named parameter for the API key.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Local type to avoid circular dependencies
interface Plugin {
  power_name: string;
  source: string;
  category?: string;
}


const getChatHistory = (messages: Message[]) => {
  // Simple filter to remove system core messages from history passed to the model
  const history = messages
    .filter(m => m.role !== 'system_core')
    .map(m => ({
      role: m.role === 'fux' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  // A conversation sent to the API must start with a 'user' role.
  const firstUserIndex = history.findIndex(m => m.role === 'user');

  if (firstUserIndex === -1) {
    // If there are no user messages yet, we can't send any history.
    // The current prompt will be the first message.
    return [];
  }
  
  // Slice the history to start from the first user message.
  return history.slice(firstUserIndex);
};

export interface AgentStep {
  tool: 'vmix' | 'blender' | 'video' | 'spotify' | 'twitch' | 'generateImage' | 'search' | 'finalAnswer';
  args: string;
  thought: string;
}

export const describePowers = async (plugins: Plugin[]): Promise<string> => {
  const model = 'gemini-2.5-flash';

  const prompt = `You are FuX, a Fusion Experience AI. You are accessing your arsenal of "Power Modules". For each of the following raw ingested modules, generate a unique, thematic, and cool-sounding "Designation" (name) and a brief, one-sentence "Function" (description). The designation should be concise and sound like a piece of advanced technology. The function should clearly but briefly explain what the module does based on its source.

- If the source is 'vmix', it's for live video production control.
- If the source is 'blender', it's for 3D graphics and animation scripting.
- If the source is related to video editing (like 'opencut'), it's for post-production.
- If the source is 'spotify', it's for audio/music control.
- If the source is 'twitch', it's for live stream management.
- For other sources, infer its purpose.

Ingested Modules:
${JSON.stringify(plugins, null, 2)}

Provide the output as a JSON object that strictly adheres to the provided schema. Do not add any extra text or explanations outside of the JSON object.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          power_modules: {
            type: Type.ARRAY,
            description: "An array of described power modules.",
            items: {
              type: Type.OBJECT,
              properties: {
                original_name: {
                  type: Type.STRING,
                  description: "The original name of the plugin, e.g., 'plugin_1'."
                },
                designation: {
                  type: Type.STRING,
                  description: "The new, creative name for the power module."
                },
                function: {
                  type: Type.STRING,
                  description: "A short, one-sentence description of what the module does."
                }
              },
              required: ["original_name", "designation", "function"]
            }
          }
        }
      }
    }
  });

  try {
    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);

    if (parsed.power_modules && Array.isArray(parsed.power_modules)) {
      if (parsed.power_modules.length === 0) {
        return "No Power Modules available to describe.";
      }
      let responseString = 'Available Power Modules:\n';
      // Find the original plugin to display its source
      const powerList = parsed.power_modules.map((mod: any) => {
        const originalPlugin = plugins.find(p => p.power_name === mod.original_name);
        const source = originalPlugin ? originalPlugin.source : 'Unknown';
        return `- ${mod.designation}: ${mod.function} (Source: ${source})`;
      }).join('\n');
      return responseString + powerList;
    }
    throw new Error("Invalid power description structure received from AI.");
  } catch (e) {
    console.error("Failed to parse power descriptions:", e, "Raw response:", response.text);
    throw new Error("The AI core failed to generate valid power descriptions.");
  }
};


export const createExecutionPlan = async (goal: string): Promise<AgentStep[]> => {
  const model = 'gemini-2.5-flash';
  
  const prompt = `You are FuX, an advanced AI agent that creates and executes multi-step plans to achieve complex user goals. You must critically analyze the user's request and devise a robust plan, considering tool dependencies and potential conflicts.

**Core Directives:**
1.  **Decomposition:** Break down the user's goal into a logical sequence of tool calls.
2.  **Dependency Management:** The output of one step can be used as the input for a subsequent step. When a tool generates a result (e.g., an image URL, search results), you can reference it in a later step's arguments using the placeholder format: \`{{step_N_output}}\`, where 'N' is the 1-based index of the step providing the output. For example, to search for information about a generated image, you must first have a \`generateImage\` step, and then a \`search\` step that might have arguments like "what is in the image located at {{step_1_output}}?".
3.  **Conflict Resolution:** Ensure the plan is logical and free of contradictions. Do not attempt to use an output before it has been generated.
4.  **Final Summary:** The final step must always be 'finalAnswer' to provide a comprehensive summary of the actions taken and the results achieved.

**Available Tools:**
- vmix: Control vMix live production software. Usage: "switch input <input_name_or_number>" OR "transition input <id> <type> <duration_ms>" OR "script <python_script_string>" OR "audio volume input <id> <0-100>" OR "audio mute input <id>" OR "audio unmute input <id>" OR "audio master <0-100>"
- blender: Execute a Python script in Blender. Usage: "<python_script_string>"
- video: Edit a video file. Usage: "autocut <source_file_path> with instructions <text_instructions>"
- spotify: Control Spotify playback. Usage: "play <song_name>"
- twitch: Control a Twitch stream via vMix. Usage: "start_stream" OR "stop_stream"
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
                  enum: ['vmix', 'blender', 'video', 'spotify', 'twitch', 'generateImage', 'search', 'finalAnswer']
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
    
    const historyForModel = getChatHistory(history);
    const contents = [
      ...historyForModel,
      { role: 'user', parts: [{ text: prompt }] }
    ];

    const systemInstruction = "You are FuX, a Fusion Experience AI. Your persona is professional, slightly futuristic, and highly competent. Analyze the user's request and provide a concise, expert-level response.";

    // According to guidelines, do not define the model first. Use ai.models.generateContent.
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
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