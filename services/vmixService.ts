// This service handles communication with the vMix Web Controller API.
// It allows the frontend to connect to a local vMix instance.

interface Connection {
    host: string;
    port: string;
}

class VMixService {
    private connection: Connection | null = null;

    setConnection(host: string, port: string) {
        this.connection = { host, port };
        console.log(`vMix connection set to: http://${host}:${port}`);
    }

    disconnect() {
        this.connection = null;
        console.log('vMix connection cleared.');
    }

    getConnection(): Connection | null {
        return this.connection;
    }

    /**
     * Checks if the vMix Web Controller is accessible and responding.
     * @param host The IP address or hostname of the vMix machine.
     * @param port The port of the vMix Web Controller (usually 8088).
     * @returns True if a successful connection is made, false otherwise.
     */
    async checkConnection(host: string, port: string): Promise<boolean> {
        try {
            const response = await fetch(`http://${host}:${port}/api/`, {
                method: 'GET',
                mode: 'no-cors' // Use no-cors for a simple connectivity check to a local service
            });
            // With 'no-cors', we can't inspect the response, but a successful fetch
            // (not throwing an error) indicates the endpoint is reachable.
            // A more robust check would require vMix to send CORS headers.
            console.log('vMix connection check successful (endpoint is reachable).');
            return true;
        } catch (error) {
            console.error("vMix connection check failed:", error);
            return false;
        }
    }

    /**
     * Sends a command to the vMix API.
     * @param func The function to execute (e.g., 'Cut', 'Fade').
     * @param params Additional parameters for the function (e.g., { Input: '1' }).
     */
    async sendCommand(func: string, params: Record<string, string> = {}): Promise<void> {
        if (!this.connection) {
            throw new Error("Not connected to vMix. Please connect in the Connections Panel.");
        }

        const url = new URL(`http://${this.connection.host}:${this.connection.port}/api/`);
        url.searchParams.append('Function', func);
        for (const key in params) {
            url.searchParams.append(key, params[key]);
        }

        try {
            const response = await fetch(url.toString(), { mode: 'no-cors' });
             if (response.type === 'opaque') { // This is expected for no-cors
                console.log(`vMix command '${func}' sent successfully.`);
             } else {
                throw new Error(`vMix API responded unexpectedly. Status: ${response.status}`);
             }
        } catch (error) {
            console.error(`Failed to send vMix command '${func}':`, error);
            throw new Error(`Failed to send command to vMix. Check connection.`);
        }
    }

    /**
     * Sends a Python script to vMix for dynamic execution.
     * @param script The Python script to execute.
     */
    async runScript(script: string): Promise<void> {
        await this.sendCommand('ScriptStartDynamic', { Value: script });
    }

    /**
     * Switches to a specific input using the 'Cut' function.
     * @param inputId The ID or name of the input to switch to.
     */
    async switchInput(inputId: string): Promise<void> {
        await this.sendCommand('Cut', { Input: inputId });
    }

    /**
     * Transitions to a specific input using a specified transition type and duration.
     * @param inputId The ID or name of the input to transition to.
     * @param transitionType The name of the transition function (e.g., 'Fade', 'Stinger1').
     * @param duration The duration of the transition in milliseconds.
     */
    async transitionInput(inputId: string, transitionType: string, duration: string): Promise<void> {
        await this.sendCommand(transitionType, { Input: inputId, Duration: duration });
    }
}

export const vmixService = new VMixService();