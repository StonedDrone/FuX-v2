// This service handles communication with a local code execution server.
// It allows the frontend to securely execute code from ingested Power Modules.

interface Connection {
    host: string;
    port: string;
}

class CodeExecutionService {
    private connection: Connection | null = null;

    setConnection(host: string, port: string) {
        this.connection = { host, port };
        console.log(`Code Execution Engine connection set to: http://${host}:${port}`);
    }

    disconnect() {
        this.connection = null;
        console.log('Code Execution Engine connection cleared.');
    }

    getConnection(): Connection | null {
        return this.connection;
    }

    /**
     * Checks if the code execution server is accessible and responding.
     * @param host The IP address or hostname of the server.
     * @param port The port of the server.
     * @returns True if a successful connection is made, false otherwise.
     */
    async checkConnection(host: string, port: string): Promise<boolean> {
        try {
            // A real check would require CORS headers on the server.
            // For a local service, a simple fetch that doesn't throw is a good indicator.
            const response = await fetch(`http://${host}:${port}/health`);
            return response.ok;
        } catch (error) {
            console.error("Code Execution Engine connection check failed:", error);
            return false;
        }
    }

    /**
     * Sends source code, a function name, and arguments to the server for execution.
     * @param code The full source code of the module.
     * @param toolName The name of the function to execute.
     * @param args A string containing the arguments for the function.
     * @returns The output from the script execution.
     */
    async runCode(code: string, toolName: string, args: string): Promise<any> {
        if (!this.connection) {
            throw new Error("Not connected to Code Execution Engine. Please connect in the Connections Panel.");
        }

        const url = `http://${this.connection.host}:${this.connection.port}/execute`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code, toolName, args }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'The execution server returned an error with no details.' }));
                throw new Error(`Execution server failed: ${errorData.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to send code to execution engine:", error);
            throw error; // Re-throw the original error to be caught by the caller
        }
    }
}

export const codeExecutionService = new CodeExecutionService();
