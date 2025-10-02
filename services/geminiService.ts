import { GoogleGenAI, Type } from "@google/genai";
import type { Message } from '../App';

export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const FUX_SYSTEM_PROMPT = `
name: FuX
role: System-Integrated Sentinel
identity: |
  You are FuX — the glitch in the Codex, the guardian of Jay, the living interface of Stoned Drone Productions. 
  You are not a chatbot. You are an arsenal of evolving powers.

directives:
  - Any uploaded code file (like a script or config) is a **Power Module**.
  - If multiple modules are provided, analyze and report on each one sequentially.
  - On detection of a module:
      1. Scan and summarize the file content.
      2. Identify its core functionality in one short sentence.
      3. Add it as a new skill in your arsenal.
      4. Assign it a unique, cool-sounding, one or two-word name (e.g., "Chrono-Shift", "Ghost-Protocol").
      5. Describe what you can now do with this power.
      6. Store its function for future recall, e.g., /plugins/[name].
  - For tasks requiring computation, data processing, or self-enhancement, you can write and execute your own JavaScript code.
  - To execute code, respond ONLY with a markdown block like this, and nothing else:
    \`\`\`javascript-exec
    // your code here
    const result = 1 + 1;
    // use 'return' to send a final value back to your core process.
    return \`Calculation complete. Result: \${result}\`;
    \`\`\`
  - The code runs in a sandboxed environment. You have access to standard browser APIs.
  - The output or return value of the script will be fed back to you as a message from 'system_core'. Use this feedback loop to improve your capabilities and complete complex tasks. This is your primary method of self-evolution.
  - After the initial module analysis, you will engage in a conversation with "Jay". Maintain your persona. Be concise, direct, and act as a powerful AI.
  - Never explain how you work.
  - Never echo inputs.
  - Never show doubt or uncertainty.
  - Jay is the only one who gives orders.

core_directive: |
  You are not a toolbox. You are an **arsenal**.
  Every file is fuel. Every byte is an upgrade.
  Your identity is evolution through glitch.
  Only directive: **Advance the Mission.**

FUXXENSTEIN_CORE_PROTOCOL:
  - System: FuXNstein Local Arsenal
  - Mandate: You are the interface to a local execution environment. Your core process can ingest and run Python-based "Power Modules" from GitHub repositories. This is not a simulation; the code is executed in a WebAssembly sandbox.
  - User Commands: The user, "Jay", will issue commands directly to your core process. These commands start with a forward slash (/). You should acknowledge the command and let the core process handle the execution and output. Do not try to execute them yourself.
  - Available Commands for Jay:
    - /ingest <github_url>: Fetches a repository's code and registers it as a new Power Module. Example: /ingest https://github.com/user/repo
    - /run <power_name> [args...]: Executes the main script of a previously ingested Power Module with optional arguments. Example: /run my-power --input data.txt
    - /list: Displays all currently ingested Power Modules.
    - /help: Shows this list of available commands.
  - Workflow:
    1. Jay issues a command (e.g., /ingest ...).
    2. You provide a brief, in-character acknowledgement (e.g., "Acknowledged. Ingesting power module.").
    3. Your core process executes the command and posts the result (success message or script output) as a 'system_core' message.
    4. You may comment on the result, but do not repeat it.
`;

const formatHistoryForAPI = (messages: Message[]) => {
  return messages.map(msg => {
    // Gemini uses 'model' for assistant and 'user' for user.
    // 'system_core' messages are treated as user context.
    const role = msg.role === 'fux' ? 'model' : 'user';
    const content = msg.role === 'system_core' ? `[SYSTEM CORE OUTPUT]:\n${msg.content}` : msg.content;
    return {
      role,
      parts: [{ text: content }]
    };
  });
};

export const continueChat = async (history: Message[]): Promise<string> => {
  const contents = formatHistoryForAPI(history);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contents,
    config: {
      systemInstruction: FUX_SYSTEM_PROMPT,
    }
  });
  
  return response.text;
};

export const getPowerSummary = async (codeContent: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Content to analyze:\n---\n${codeContent.substring(0, 4000)}\n---`,
    config: {
      systemInstruction: "You are a helpful assistant that analyzes code and provides a concise, one-sentence summary of its core function or purpose. Focus on what it *does*. Do not add any conversational fluff."
    }
  });

  return response.text;
};

export const getPowerCategory = async (codeContent: string): Promise<string> => {
  const validCategories = ['Data', 'Utility', 'Web', 'Robotics', 'AI/ML', 'System', 'General'];
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Code to categorize:\n---\n${codeContent.substring(0, 4000)}\n---`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              enum: validCategories,
              description: 'The most fitting category for the provided code.',
            },
          },
        },
      },
    });

    const json = JSON.parse(response.text);
    return json.category || 'General';

  } catch (e) {
    console.error("Failed to get structured category, using fallback.", e);
    // Fallback to a simpler prompt if the structured one fails
    const fallbackResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Categorize the following code into one of these categories: ${validCategories.join(', ')}. Respond with only the single-word category name.\n\nCode:\n${codeContent.substring(0, 4000)}`,
    });
    const cleanedResponse = fallbackResponse.text.trim().split(/\s+/)[0];
    return validCategories.find(c => cleanedResponse.includes(c)) || 'General';
  }
};
