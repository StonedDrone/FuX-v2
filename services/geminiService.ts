import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { Message, Plugin } from "../App";
import { codeExecutionService } from './codeExecutionService';

// According to guidelines, initialize with a named parameter for the API key.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, { type: 'STRING' | 'NUMBER' | 'BOOLEAN'; description: string }>;
    required?: string[];
  }
}

export interface AgentStep {
  tool: string;
  args: string;
  thought: string;
}

export const generateChatTitle = async (firstUserMessage: string, codexContent?: string): Promise<string> => {
  const model = 'gemini-2.5-flash';
  const prompt = `Generate a very short, concise title (3-5 words max) for a chat session that starts with this user message: "${firstUserMessage}". The title should capture the main topic. Do not use quotes or any extra formatting in your response. Just provide the text of the title.`;

  const systemInstruction = codexContent
    ? `[FUX CODEX - CORE DIRECTIVES]\n${codexContent}`
    : undefined;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined,
    });
    return response.text.trim().replace(/"/g, ''); // Remove quotes just in case
  } catch (e) {
    console.error("Failed to generate chat title:", e);
    return "Untitled Chat"; // Fallback title
  }
};

export const ingestRepository = async (fileName: string, code: string, existingNames: string[], codexContent?: string): Promise<Plugin> => {
  const model = 'gemini-2.5-flash';
  const allowedCategories = [
    'Live Production', '3D Graphics', 'Video Editing', 'Audio Control',
    'Live Streaming', 'Generative AI', 'Web Intelligence', 'Data Processing', 
    'File I/O', 'API Integration', 'Utility', 'Core Function'
  ];

  const prompt = `You are FuX, a Fusion Experience AI. You are ingesting a new "Power Module" from a source code file. Analyze the code, identify its primary functions, and prepare it for integration as a set of callable tools for your agent mode.

**Rules:**
1.  **power_name:** Create a unique, thematic lowerCamelCase name for the entire module (e.g., 'imageTools', 'textAnalyzer'). It must NOT be one of these existing names: ${JSON.stringify(existingNames)}.
2.  **description:** Write a clear, one-sentence summary of the module's overall purpose.
3.  **category:** Assign a single, most appropriate category from this list: ${JSON.stringify(allowedCategories)}.
4.  **tools:** Identify the key, user-callable functions in the code. For each function:
    a.  Define a clear, descriptive \`name\` (should match the function name if possible).
    b.  Write a concise \`description\` of what the function does.
    c.  Define the function's \`parameters\` as a JSON schema object, specifying the type and a description for each argument. Supported types are STRING, NUMBER, BOOLEAN.

**Source Code (from file: ${fileName}):**
\`\`\`
${code}
\`\`\`

Provide the output as a single JSON object that strictly adheres to the provided schema. Do not add any extra text or explanations.`;
  
  const systemInstruction = codexContent
    ? `[FUX CODEX - CORE DIRECTIVES]\n${codexContent}\n\n[USER TASK]\nYou will now analyze a code file based on the user's request.`
    : undefined;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          power_name: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING },
          tools: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ['OBJECT'] },
                    properties: { 
                      type: Type.OBJECT,
                      additionalProperties: {
                        type: Type.OBJECT,
                        properties: {
                          type: { type: Type.STRING, enum: ['STRING', 'NUMBER', 'BOOLEAN'] },
                          description: { type: Type.STRING }
                        },
                        required: ['type', 'description']
                      }
                    },
                    required: { type: Type.ARRAY, items: { type: Type.STRING }}
                  },
                  required: ['type', 'properties']
                }
              },
              required: ['name', 'description', 'parameters']
            }
          }
        },
        required: ["power_name", "description", "category", "tools"]
      },
      systemInstruction,
    }
  });

  try {
    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    
    // Basic validation
    if (!parsed.power_name || !parsed.description || !parsed.category || !Array.isArray(parsed.tools)) {
      throw new Error("Missing required fields in AI response.");
    }
    
    return { ...parsed, source: fileName, code };
  } catch (e) {
    console.error("Failed to parse ingestion response:", e, "Raw response:", response.text);
    throw new Error("The AI core failed to generate a valid module definition.");
  }
};


export const createExecutionPlan = async (goal: string, plugins: Plugin[], codexContent?: string): Promise<AgentStep[]> => {
  const model = 'gemini-2.5-flash';

  let customToolsPrompt = '';
  if (plugins.length > 0) {
    customToolsPrompt = plugins.flatMap(p => p.tools).map(tool => 
      `- ${tool.name}: ${tool.description}. Arguments: ${JSON.stringify(tool.parameters.properties)}`
    ).join('\n');
  }
  
  const prompt = `You are FuX, an advanced AI agent that creates and executes multi-step plans to achieve complex user goals. You must critically analyze the user's request and devise a robust plan, considering tool dependencies and potential conflicts.

**Core Directives:**
1.  **Decomposition:** Break down the user's goal into a logical sequence of tool calls.
2.  **Dependency Management:** The output of one step can be used as the input for a subsequent step. When a tool generates a result (e.g., an image URL, search results), you can reference it in a later step's arguments using the placeholder format: \`{{step_N_output}}\`, where 'N' is the 1-based index of the step providing the output. For example, to search for information about a generated image, you must first have a \`generateImage\` step, and then a \`search\` step that might have arguments like "what is in the image located at {{step_1_output}}?".
3.  **Conflict Resolution:** Ensure the plan is logical and free of contradictions. Do not attempt to use an output before it has been generated.
4.  **Final Summary:** The final step must always be 'finalAnswer' to provide a comprehensive summary of the actions taken and the results achieved.

**Available Tools:**
**Built-in:**
- vmix: Control vMix live production software. Usage: "switch input <input_name_or_number>" OR "transition input <id> <type> <duration_ms>" OR "script <python_script_string>" OR "audio volume input <id> <0-100>" OR "audio mute input <id>" OR "audio unmute input <id>" OR "audio master <0-100>"
- blender: Execute a Python script in Blender. Usage: "<python_script_string>"
- video: Edit a video file. Usage: "autocut <source_file_path> with instructions <text_instructions>"
- spotify: Control Spotify playback. Usage: "play <song_name>"
- twitch: Control a Twitch stream via vMix. Usage: "start_stream" OR "stop_stream"
- generateImage: Generates an image from a text prompt. **Output:** A data URL for the generated image.
- search: Search the web for information. **Output:** A text summary of the search results.
- finalAnswer: Provide a final text answer to the user. Usage: "<summary_of_results>"
**Ingested Repository Tools:**
${customToolsPrompt || 'No custom tools available.'}

**User's Goal:** "${goal}"

Respond with a JSON object that strictly adheres to the provided schema.`;

  const systemInstruction = codexContent
    ? `[FUX CODEX - CORE DIRECTIVES]\n${codexContent}`
    : undefined;

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
                  description: "The name of the tool to use from the available list."
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
      },
      systemInstruction
    }
  });

  try {
    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    if (parsed.plan && Array.isArray(parsed.plan)) {
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


export const analyzeCode = async (prompt: string, history: Message[], codexContent?: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const historyForModel = getChatHistory(history);
    const contents = [
      ...historyForModel,
      { role: 'user', parts: [{ text: prompt }] }
    ];

    // Step 1: Get the initial, raw response from the model without the Codex.
    const initialResponse: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: "You are FuX, a Fusion Experience AI. Your persona is professional, slightly futuristic, and highly competent. Analyze the user's request and provide a concise, expert-level response.",
      },
    });

    const rawResponseText = initialResponse.text;

    // Step 2: If there's no Codex, return the raw response immediately.
    if (!codexContent) {
      return rawResponseText;
    }

    // Step 3: If there IS a Codex, perform a second call to adjust the raw response.
    const adjustmentPrompt = `You are a moderator AI named FuX. Your task is to review and, if necessary, rewrite a response to ensure it perfectly aligns with your core directives, known as the Codex. This is your LAW.

[FUX CODEX - CORE DIRECTIVES]
---
${codexContent}
---

[ORIGINAL RESPONSE TO REVIEW]
---
${rawResponseText}
---

[YOUR TASK]
Review the "ORIGINAL RESPONSE".
- If it already aligns perfectly with the Codex, return it exactly as is.
- If it violates or contradicts the Codex, rewrite it so that it is fully compliant.
- Maintain the original intent of the answer as much as possible while enforcing the Codex.
- Your final output should only be the adjusted response text, without any extra explanations, introductions, or labels like "Adjusted Response".`;
    
    const adjustedResponse: GenerateContentResponse = await ai.models.generateContent({
        model: model,
        contents: adjustmentPrompt
    });

    return adjustedResponse.text;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to communicate with the AI Core. Check console for details.");
  }
};

export const executeCode = async (plugin: Plugin, toolName: string, args: string): Promise<string> => {
  console.log(`Executing tool '${toolName}' from power module '${plugin.power_name}' with args:`, args);
  
  try {
    const result = await codeExecutionService.runCode(plugin.code, toolName, args);
    
    // If the result from the backend is an object or array, stringify it for display.
    if (typeof result === 'object' && result !== null) {
      return JSON.stringify(result, null, 2);
    }
    // Otherwise, convert it to a string.
    return String(result);
  } catch (error: any) {
    console.error(`Error during real execution for ${toolName}:`, error);
    // Propagate a user-friendly error message.
    throw new Error(`Execution failed for tool '${toolName}': ${error.message}`);
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