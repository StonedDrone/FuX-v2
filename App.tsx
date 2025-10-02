import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Loader } from './components/Loader';
import { continueChat } from './services/geminiService';
import { Header } from './components/Header';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ChatInterface } from './components/ChatInterface';
import { openDB, DBSchema } from 'idb';

export type Message = {
  role: 'user' | 'fux' | 'system_core';
  content: string;
};

// --- TypeScript Declarations ---
declare global {
  interface Window {
    loadPyodide: (config?: any) => Promise<any>;
  }
}

interface FuXDB extends DBSchema {
  'key-val': {
    key: string;
    value: any;
  };
  'plugins': {
    key: string;
    value: any;
  }
}

// --- IndexedDB Service ---
const dbPromise = openDB<FuXDB>('fux-arsenal-db', 1, {
  upgrade(db) {
    db.createObjectStore('key-val');
    db.createObjectStore('plugins');
  },
});

const db = {
  get: async (store: 'key-val' | 'plugins', key: string) => (await dbPromise).get(store, key),
  set: async (store: 'key-val' | 'plugins', key: string, val: any) => (await dbPromise).put(store, val, key),
  keys: async (store: 'key-val' | 'plugins') => (await dbPromise).getAllKeys(store),
};


// --- Main App Component ---
const App: React.FC = () => {
  const [pyodide, setPyodide] = useState<any>(null);
  const [pyodideLoading, setPyodideLoading] = useState(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(() => localStorage.getItem('fux-tts-enabled') === 'true');
  const [messages, setMessages] = useState<Message[]>([]);

  // Effect for Pyodide initialization
  useEffect(() => {
    const loadPyodideInstance = async () => {
      try {
        const pyodideInstance = await window.loadPyodide();
        await pyodideInstance.loadPackage("micropip");
        setPyodide(pyodideInstance);
      } catch (e) {
        console.error("Pyodide loading failed:", e);
        setError("Fatal Error: Could not initialize execution engine. Refresh to try again.");
      } finally {
        setPyodideLoading(false);
      }
    };
    loadPyodideInstance();
  }, []);
  
  // Effect for TTS preference
  useEffect(() => {
    localStorage.setItem('fux-tts-enabled', String(isTtsEnabled));
  }, [isTtsEnabled]);

  const handleToggleTts = () => {
    if (isTtsEnabled) {
      window.speechSynthesis.cancel();
    }
    setIsTtsEnabled(prev => !prev);
  };
  
  const addSystemMessage = (content: string) => {
    const systemMessage: Message = { role: 'system_core', content };
    setMessages(prev => [...prev, systemMessage]);
  };

  const addFuxMessage = (content: string) => {
    const fuxMessage: Message = { role: 'fux', content };
    setMessages(prev => [...prev, fuxMessage]);
  };
  
  // --- Command Handlers ---
  const handleIngestCommand = useCallback(async (url: string) => {
    setIsLoading(true);
    addSystemMessage(`Ingesting from ${url}...`);

    try {
      const githubRegex = /github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/;
      const match = url.match(githubRegex);
      if (!match) throw new Error("Invalid GitHub repository URL.");

      const [, owner, repo] = match;
      const repoName = repo.replace(/\.git$/, '');

      const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`);
      if (!treeResponse.ok) throw new Error(`Could not fetch repository tree. Is it a public repository?`);
      const treeData = await treeResponse.json();

      if (treeData.truncated) {
        addSystemMessage("Warning: Repository is too large, some files may have been omitted.");
      }

      const filePromises = treeData.tree
        .filter((item: any) => item.type === 'blob')
        .map(async (item: any) => {
            const res = await fetch(item.url);
            if (!res.ok) throw new Error(`Failed to fetch ${item.path}`);
            const blobData = await res.json();
            return {
                path: item.path,
                content: atob(blobData.content),
            };
        });

      const files = await Promise.all(filePromises);
      await db.set('plugins', repoName.toLowerCase(), files);

      let index = await db.get('key-val', 'core_index') || {};
      index[repoName.toLowerCase()] = {
          power_name: repoName,
          source: url,
          ingested_at: new Date().toISOString()
      };
      await db.set('key-val', 'core_index', index);

      addSystemMessage(`✅ Ingestion complete. Stored "${repoName}" as a new Power Module.`);

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during ingestion.";
      setError(errorMessage);
      addSystemMessage(`❌ Ingestion failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleRunCommand = useCallback(async (powerName: string, args: string[]) => {
    if (!pyodide) {
        setError("Execution engine is not ready.");
        return;
    }
    setIsLoading(true);
    addSystemMessage(`Executing Power Module: ${powerName} with args: [${args.join(', ')}]`);

    try {
        const index = await db.get('key-val', 'core_index');
        if (!index || !index[powerName.toLowerCase()]) {
            throw new Error(`Power Module "${powerName}" not found. Use /list to see available modules.`);
        }

        const files = await db.get('plugins', powerName.toLowerCase());
        if (!files) {
            throw new Error(`Could not retrieve files for "${powerName}".`);
        }
        
        // Write files to virtual FS
        files.forEach((file: {path: string, content: string}) => {
            const pathParts = file.path.split('/');
            if (pathParts.length > 1) {
                const dir = pathParts.slice(0, -1).join('/');
                pyodide.FS.mkdirTree(dir);
            }
            pyodide.FS.writeFile(file.path, file.content);
        });

        // Handle requirements.txt
        const reqFile = files.find((f: any) => f.path === 'requirements.txt');
        if (reqFile) {
            addSystemMessage("Found requirements.txt. Installing dependencies...");
            const micropip = pyodide.pkg.micropip;
            const requirements = reqFile.content.split('\n').filter((req: string) => req.trim() && !req.trim().startsWith('#'));
            if (requirements.length > 0) {
              await micropip.install(requirements);
              addSystemMessage("Dependencies installed.");
            }
        }
        
        // Find entry point
        const entryPoints = [`main.py`, `app.py`, `${powerName.toLowerCase()}.py`];
        const entryPoint = files.find((f: any) => entryPoints.includes(f.path));
        if (!entryPoint) {
            throw new Error(`No entry point (e.g., main.py, app.py) found for "${powerName}".`);
        }
        addSystemMessage(`Found entry point: ${entryPoint.path}. Executing...`);

        // Execute script
        const pythonCode = `
import sys
import io

# Redirect stdout
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()

# Add script args
sys.argv = ['${entryPoint.path}', *${JSON.stringify(args)}]

try:
    with open('${entryPoint.path}', 'r') as f:
        code = f.read()
    exec(code, {'__name__': '__main__'})
except Exception as e:
    print(f"--- EXECUTION ERROR ---", file=sys.stderr)
    print(e, file=sys.stderr)

# Get output
stdout_val = sys.stdout.getvalue()
stderr_val = sys.stderr.getvalue()

# Combine outputs
stdout_val + stderr_val
        `;
        
        const output = await pyodide.runPythonAsync(pythonCode);
        addSystemMessage(`--- Output from ${entryPoint.path} ---\n${output || "[No output]"}`);

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during execution.";
        setError(errorMessage);
        addSystemMessage(`❌ Execution failed: ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  }, [pyodide]);

  const handleListCommand = useCallback(async () => {
    const index = await db.get('key-val', 'core_index') || {};
    const powers = Object.values(index);
    if (powers.length === 0) {
        addSystemMessage("No Power Modules have been ingested yet.");
    } else {
        const powerList = powers.map((p: any) => `- ${p.power_name} (from: ${p.source})`).join('\n');
        addSystemMessage(`Available Power Modules:\n${powerList}`);
    }
  }, []);
  
  const handleHelpCommand = useCallback(async () => {
    const helpText = `Available Commands:
- /ingest <github_url>: Ingest a new Power Module from a GitHub repo.
- /run <power_name> [args...]: Execute an ingested Power Module.
- /list: Show all ingested Power Modules.
- /help: Display this help message.`;
    addSystemMessage(helpText);
  }, []);

  const handleSendMessage = useCallback(async (message: string) => {
    if (isLoading || pyodideLoading) return;

    window.speechSynthesis.cancel();
    const newMessages: Message[] = [...messages, { role: 'user', content: message }];
    setMessages(newMessages);
    setError(null);

    if (message.startsWith('/')) {
        const [command, ...args] = message.trim().split(/\s+/);
        switch (command) {
            case '/ingest':
                if (args.length > 0) await handleIngestCommand(args[0]);
                else addSystemMessage("Usage: /ingest <github_url>");
                break;
            case '/run':
                if (args.length > 0) await handleRunCommand(args[0], args.slice(1));
                else addSystemMessage("Usage: /run <power_name> [args...]");
                break;
            case '/list':
                await handleListCommand();
                break;
            case '/help':
                await handleHelpCommand();
                break;
            default:
                addSystemMessage(`Unknown command: ${command}`);
                break;
        }
    } else {
        setIsLoading(true);
        try {
            const responseText = await continueChat(newMessages);
            addFuxMessage(responseText);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An error occurred during the chat session.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }
  }, [isLoading, messages, pyodideLoading, handleIngestCommand, handleRunCommand, handleListCommand, handleHelpCommand]);


  if (pyodideLoading) {
    return <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
      <Loader fileName="Execution Engine..." />
    </div>;
  }

  return (
    <div className="min-h-screen bg-black text-slate-200 p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl mx-auto">
        <Header isTtsEnabled={isTtsEnabled} onToggleTts={handleToggleTts} />
        <main className="mt-8">
          {error && <ErrorDisplay message={error} />}
          <ChatInterface 
            messages={messages} 
            onSendMessage={handleSendMessage}
            isReplying={isLoading}
            isTtsEnabled={isTtsEnabled}
          />
        </main>
      </div>
    </div>
  );
};

export default App;