// This service handles communication with a Blender web server addon.
// It allows the frontend to connect to a local Blender instance and execute Python scripts.

interface Connection {
    host: string;
    port: string;
}

class BlenderService {
    private connection: Connection | null = null;

    setConnection(host: string, port: string) {
        this.connection = { host, port };
        console.log(`Blender connection set to: http://${host}:${port}`);
    }

    disconnect() {
        this.connection = null;
        console.log('Blender connection cleared.');
    }

    getConnection(): Connection | null {
        return this.connection;
    }

    /**
     * Checks if the Blender web server addon is accessible and responding.
     * @param host The IP address or hostname of the Blender machine.
     * @param port The port of the web server addon.
     * @returns True if a successful connection is made, false otherwise.
     */
    async checkConnection(host: string, port: string): Promise<boolean> {
        try {
            // A simple GET request to a root or status endpoint can verify connectivity.
            const response = await fetch(`http://${host}:${port}/`);
            return response.ok;
        } catch (error) {
            console.error("Blender connection check failed:", error);
            return false;
        }
    }

    /**
     * Sends a Python script to the Blender addon for execution.
     * @param script The Python script to execute in Blender's context.
     * @returns The output from the script execution.
     */
    async runScript(script: string): Promise<any> {
        if (!this.connection) {
            throw new Error("Not connected to Blender. Please connect in the Connections Panel.");
        }

        const url = `http://${this.connection.host}:${this.connection.port}/run_script`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ script: script }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                throw new Error(`Blender script execution failed: ${errorData.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to send script to Blender:", error);
            throw new Error(`Failed to send command to Blender. Check connection and addon status.`);
        }
    }
}

export const blenderService = new BlenderService();
