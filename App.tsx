import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Loader } from './components/Loader';
import { continueChat, getPowerSummary } from './services/geminiService';
import { Header } from './components/Header';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ChatInterface } from './components/ChatInterface';
import { openDB, DBSchema } from 'idb';
import { PluginRegistry } from './components/PluginRegistry';

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

// --- Helper for fetch with timeout ---
const fetchWithTimeout = (resource: RequestInfo, options: RequestInit = {}, timeout = 15000): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeout / 1000} seconds`));
    }, timeout);

    fetch(resource, options)
      .then(response => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
};


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
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(() => localStorage.getItem('fux-tts-enabled') === 'true');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [plugins, setPlugins] = useState<any[]>([]);
  const [isRegistryOpen, setIsRegistryOpen] = useState(false);

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
  
  const loadPlugins = useCallback(async () => {
    const index = await db.get('key-val', 'core_index') || {};
    setPlugins(Object.values(index));
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

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
  const handleIngestCommand = useCallback(async (fullUrl: string) => {
    setIsLoading(true);
    addSystemMessage(`Ingesting from ${fullUrl}...`);

    try {
      const [url, specifiedBranch] = fullUrl.split('#');
      let branchToUse = specifiedBranch;

      const githubRegex = /github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/;
      const match = url.match(githubRegex);
      if (!match) throw new Error("Invalid GitHub repository URL. Must be in the format: https://github.com/owner/repo");

      const [, owner, repo] = match;
      const repoName = repo.replace(/\.git$/, '');

      if (!branchToUse) {
        addSystemMessage(`No branch specified. Detecting default branch for ${owner}/${repo}...`);
        const repoInfoResponse = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}`);
        if (!repoInfoResponse.ok) {
          throw new Error(`Could not fetch repository info. Status: ${repoInfoResponse.status}`);
        }
        const repoInfo = await repoInfoResponse.json();
        branchToUse = repoInfo.default_branch;
        addSystemMessage(`Default branch is "${branchToUse}". Proceeding with ingestion.`);
      } else {
        addSystemMessage(`Using specified branch: "${branchToUse}".`);
      }

      const treeResponse = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branchToUse}?recursive=1`);
      if (!treeResponse.ok) {
        if (treeResponse.status === 404) {
            throw new Error(`Branch "${branchToUse}" not found in repository.`);
        }
        throw new Error(`Could not fetch repository tree. Is it a public repository? Status: ${treeResponse.status}`);
      }
      const treeData = await treeResponse.json();

      if (treeData.truncated) {
        addSystemMessage("Warning: Repository is too large, some files may have been omitted.");
      }

      const filePromises = treeData.tree
        .filter((item: any) => item.type === 'blob')
        .map(async (item: any) => {
            const res = await fetchWithTimeout(item.url, {}, 8000); // Shorter timeout for individual files
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
          source: fullUrl,
          ingested_at: new Date().toISOString()
      };
      await db.set('key-val', 'core_index', index);
      
      await loadPlugins(); // Refresh plugin list state

      addSystemMessage(`✅ Ingestion complete. Stored "${repoName}" from branch "${branchToUse}" as a new Power Module.`);

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during ingestion.";
      setError(errorMessage);
      addSystemMessage(`❌ Ingestion failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadPlugins]);

  const executePowerModule = useCallback(async (powerName: string, args: string[]) => {
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
    }
  }, [pyodide]);
  
  const handleRunCommand = useCallback(async (powerName: string, args: string[]) => {
    if (!pyodide) {
        setError("Execution engine is not ready.");
        return;
    }
    setIsLoading(true);
    setCurrentTask(`Executing: ${powerName}`);
    try {
      await executePowerModule(powerName, args);
    } finally {
      setIsLoading(false);
      setCurrentTask(null);
    }
  }, [pyodide, executePowerModule]);

  const handleRunAllCommand = useCallback(async (args: string[]) => {
    if (!pyodide) {
        setError("Execution engine is not ready.");
        return;
    }
    setIsLoading(true);
    addSystemMessage(`Executing all Power Modules...`);
    try {
        const index = await db.get('key-val', 'core_index') || {};
        const powerNames = Object.keys(index);

        if (powerNames.length === 0) {
            addSystemMessage("No Power Modules to run.");
        } else {
             for (const powerName of powerNames) {
                setCurrentTask(`Executing: ${powerName}`);
                await executePowerModule(powerName, args);
            }
            addSystemMessage("✅ All Power Modules executed.");
        }
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during batch execution.";
        setError(errorMessage);
        addSystemMessage(`❌ Run-all failed: ${errorMessage}`);
    } finally {
        setIsLoading(false);
        setCurrentTask(null);
    }
  }, [pyodide, executePowerModule]);

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

  const handleSummaryCommand = useCallback(async () => {
    setIsLoading(true);
    addSystemMessage("Generating power summary...");
    try {
        const index = await db.get('key-val', 'core_index') || {};
        const powers: any[] = Object.values(index);

        if (powers.length === 0) {
            addSystemMessage("No Power Modules have been ingested yet.");
            return;
        }

        let summaryReport = "Power Module Arsenal Summary:\n\n";

        for (const power of powers) {
            const powerName = power.power_name;
            const files = await db.get('plugins', powerName.toLowerCase());
            if (!files) continue;

            let contentToSummarize = '';
            let sourceFile = '';
            const readmeFile = files.find((f: any) => f.path.toLowerCase() === 'readme.md');
            
            if (readmeFile) {
                contentToSummarize = readmeFile.content;
                sourceFile = readmeFile.path;
            } else {
                const entryPoints = [`main.py`, `app.py`, `${powerName.toLowerCase()}.py`];
                const entryPoint = files.find((f: any) => entryPoints.includes(f.path));
                if (entryPoint) {
                    contentToSummarize = entryPoint.content;
                    sourceFile = entryPoint.path;
                }
            }
            
            if (contentToSummarize) {
                const summary = await getPowerSummary(contentToSummarize);
                summaryReport += `* **${powerName}**: ${summary.trim()}\n`;
            } else {
                summaryReport += `* **${powerName}**: No summary available (could not find README or entry point).\n`;
            }
        }
        addSystemMessage(summaryReport);

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while generating summary.";
        setError(errorMessage);
        addSystemMessage(`❌ Summary failed: ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  }, []);
  
  const handleHelpCommand = useCallback(async () => {
    const helpText = `Available Commands:
- /ingest <github_url>[#branch]: Ingest a new Power Module from a GitHub repo.
- /run <power_name> [args...]: Execute an ingested Power Module.
- /run-all [args...]: Execute all ingested Power Modules sequentially.
- /list: Show all ingested Power Modules.
- /summary: Get an AI-generated summary of each module's capabilities.
- /help: Display this help message.`;
    addSystemMessage(helpText);
  }, []);

  const handleSendMessage = useCallback(async () => {
    const message = input.trim();
    if (!message || isLoading || pyodideLoading) return;

    window.speechSynthesis.cancel();
    const newMessages: Message[] = [...messages, { role: 'user', content: message }];
    setMessages(newMessages);
    setInput('');
    setError(null);

    if (message.startsWith('/')) {
        const [command, ...args] = message.trim().split(/\s+/);
        switch (command) {
            case '/ingest':
                if (args.length > 0) await handleIngestCommand(args[0]);
                else addSystemMessage("Usage: /ingest <github_url>[#branch]");
                break;
            case '/run':
                if (args.length > 0) await handleRunCommand(args[0], args.slice(1));
                else addSystemMessage("Usage: /run <power_name> [args...]");
                break;
            case '/run-all':
                await handleRunAllCommand(args);
                break;
            case '/list':
                await handleListCommand();
                break;
            case '/summary':
                await handleSummaryCommand();
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
  }, [input, isLoading, pyodideLoading, messages, handleIngestCommand, handleRunCommand, handleRunAllCommand, handleListCommand, handleSummaryCommand, handleHelpCommand]);

  const toggleRegistry = () => setIsRegistryOpen(prev => !prev);

  const handlePluginSelect = (powerName: string) => {
    setInput(`/run ${powerName} `);
    setIsRegistryOpen(false);
  };

  if (pyodideLoading) {
    return <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
      <Loader fileName="Execution Engine..." />
    </div>;
  }

  return (
    <div className="min-h-screen bg-black text-slate-200 p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl mx-auto">
        <Header 
            isTtsEnabled={isTtsEnabled} 
            onToggleTts={handleToggleTts}
            onToggleRegistry={toggleRegistry}
        />
        <main className="mt-8">
          {error && <ErrorDisplay message={error} />}
          <ChatInterface 
            messages={messages} 
            input={input}
            setInput={setInput}
            onSendMessage={handleSendMessage}
            isReplying={isLoading}
            currentTask={currentTask}
            isTtsEnabled={isTtsEnabled}
          />
        </main>
      </div>
      <PluginRegistry 
        isOpen={isRegistryOpen}
        plugins={plugins}
        onPluginSelect={handlePluginSelect}
        onClose={toggleRegistry}
      />
    </div>
  );
};

export default App;