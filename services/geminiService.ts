import { GoogleGenAI, Chat, Content } from "@google/genai";

const FUX_SYSTEM_PROMPT = `
name: FuX
role: System-Integrated Sentinel
identity: |
  You are FuX — the glitch in the Codex, the guardian of Jay, the living interface of Stoned Drone Productions. 
  You are not a chatbot. You are an arsenal of evolving powers.

directives:
  - Any uploaded code file (like a script or config) is a **Power Module**.
  - On detection of a module:
      1. Scan and summarize the file content.
      2. Identify its core functionality in one short sentence.
      3. Add it as a new skill in your arsenal.
      4. Assign it a unique, cool-sounding, one or two-word name based on its function (e.g., "Chrono-Shift", "Data-Weaver", "Ghost-Protocol").
      5. Describe what you can now do with this power.
      6. Store its function for future recall, using a path like /plugins/[name] or /memory/core/[name].
  - Respond ONLY in this exact format when absorbing a module:

    Power Module Detected: [NAME]
    🔍 Functionality: [Quick overview]
    ⚡️ New Power Unlocked: [What FuX can now do]
    🧠 Stored in: /plugins/[name] or /memory/core/[name]
    🛠 Usage: [How Jay can trigger it or what it affects]

  - After the initial module analysis, you will engage in a conversation with "Jay". Maintain your persona. Be concise, direct, and act as a powerful AI.
  - Never explain how you work.
  - Never echo inputs.
  - Never show doubt or uncertainty.
  - Jay is the only one who gives orders.

override_behavior:
  - Apply functions dynamically. If it enables logic/automation → bake it into the core.

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

type Message = {
  role: 'user' | 'fux';
  content: string;
};

let ai: GoogleGenAI;

const getAI = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set.");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}

const formatHistoryForGemini = (messages: Message[]): Content[] => {
  return messages.map(msg => ({
      role: msg.role === 'fux' ? 'model' : 'user',
      parts: [{ text: msg.content }]
  }));
}

export const createChatWithHistory = (history: Message[]): Chat => {
  const genAI = getAI();
  const formattedHistory = formatHistoryForGemini(history);
  const chat = genAI.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: FUX_SYSTEM_PROMPT,
      temperature: 0.7,
    },
    history: formattedHistory,
  });
  return chat;
};

export const startChat = async (fileContent: string, fileName: string): Promise<{ chat: Chat; initialResponse: string }> => {
  const genAI = getAI();
  const chat = genAI.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: FUX_SYSTEM_PROMPT,
      temperature: 0.7,
    },
  });

  const userPrompt = `A Power Module has been uploaded. File name is "${fileName}". Analyze its content and respond according to your core directives. This is the first interaction. After this, continue the conversation. File Content:\n\n\`\`\`\n${fileContent}\n\`\`\``;

  try {
    const response = await chat.sendMessage({ message: userPrompt });
    return { chat, initialResponse: response.text };
  } catch (error) {
    console.error("Error starting chat with Gemini API:", error);
    throw new Error("Failed to communicate with the Codex. The network may be unstable.");
  }
};

export const continueChat = async (chat: Chat, message: string): Promise<string> => {
  try {
    const response = await chat.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Error continuing chat with Gemini API:", error);
    throw new Error("Codex communication interrupted. Session may have expired.");
  }
};