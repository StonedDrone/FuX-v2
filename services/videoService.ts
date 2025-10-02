// This service handles communication with a video editing backend (e.g., OpenCut).
// It allows the frontend to connect to a local video processing service.

interface Connection {
    host: string;
    port: string;
}

class VideoService {
    private connection: Connection | null = null;

    setConnection(host: string, port: string) {
        this.connection = { host, port };
        console.log(`Video service connection set to: http://${host}:${port}`);
    }

    disconnect() {
        this.connection = null;
        console.log('Video service connection cleared.');
    }

    getConnection(): Connection | null {
        return this.connection;
    }

    /**
     * Checks if the video service is accessible and responding.
     * @param host The IP address or hostname of the video service.
     * @param port The port of the video service.
     * @returns True if a successful connection is made, false otherwise.
     */
    async checkConnection(host: string, port: string): Promise<boolean> {
        try {
            // Use 'no-cors' for a simple connectivity check to a local service.
            // We can't inspect the response, but a successful fetch (not throwing an error)
            // indicates the endpoint is reachable, bypassing CORS issues for the check.
            await fetch(`http://${host}:${port}/`, { mode: 'no-cors' });
            return true;
        } catch (error) {
            console.error("Video service connection check failed:", error);
            return false;
        }
    }

    /**
     * Sends a command to the video service to automatically edit a video.
     * @param sourceFile The path to the source video file.
     * @param instructions Text-based instructions for the edit (e.g., "find the best clips").
     * @returns A result object indicating success and the output path.
     */
    async autoCutVideo(sourceFile: string, instructions: string): Promise<{ message: string; outputPath: string }> {
        if (!this.connection) {
            throw new Error("Not connected to Video Service. Please connect in the Connections Panel.");
        }

        const url = `http://${this.connection.host}:${this.connection.port}/autocut`;

        try {
            // This is a mock implementation. A real service would make a fetch request.
            console.log(`Sending auto-cut request for "${sourceFile}" with instructions "${instructions}"`);
            
            // const response = await fetch(url, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ source: sourceFile, instructions: instructions }),
            // });
            // if (!response.ok) {
            //     const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            //     throw new Error(`Video service request failed: ${errorData.message || response.statusText}`);
            // }
            // return await response.json();

            // Simulate a successful API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            const mockOutputPath = sourceFile.replace(/(\.[\w\d_-]+)$/i, '_edited$1');
            return {
                message: "Video processing task started.",
                outputPath: mockOutputPath
            };

        } catch (error) {
            console.error("Failed to send command to Video Service:", error);
            throw new Error(`Failed to send command to Video Service. Check connection.`);
        }
    }
}

export const videoService = new VideoService();