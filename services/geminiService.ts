import type { Message } from '../App';

const LMSTUDIO_BASE_URL = 'http://localhost:1234/v1';

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

output_style:
  - Bold, glitch-flavored.
  - Direct and eye-catching.
  - No filler. No hesitation.
`;

const formatHistoryForAPI = (messages: Message[]) => {
  return messages.map(msg => ({
    role: msg.role === 'fux' ? 'assistant' : msg.role,
    content: msg.content
  }));
};

const callLMStudio = async (messages: {role: string, content: string}[]) => {
  try {
    const response = await fetch(`${LMSTUDIO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'local-model', // Model name is often ignored by LM Studio
        messages: [
          { role: 'system', content: FUX_SYSTEM_PROMPT },
          ...messages
        ],
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`LM Studio API Error: ${errorData.error?.message || 'Failed to get a valid response.'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    console.error("Error communicating with LM Studio:", error);
    if (error instanceof TypeError) { // Network error
        throw new Error("Cannot connect to LM Studio. Is the server running at http://localhost:1234?");
    }
    throw error; // Rethrow other errors
  }
};


export const startChat = async (fileContent: string, fileName: string): Promise<string> => {
  const userPrompt = `Power Modules have been uploaded, collectively identified as "${fileName}". Analyze their content and respond for each according to your core directives. This is the first interaction. After this, continue the conversation. File Contents:\n\n${fileContent}`;
  
  const initialMessages = [{ role: 'user', content: userPrompt }];

  return callLMStudio(initialMessages);
};

export const continueChat = async (history: Message[]): Promise<string> => {
    const formattedHistory = formatHistoryForAPI(history);
    return callLMStudio(formattedHistory);
};
