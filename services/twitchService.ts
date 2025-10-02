// This service handles Twitch integration, primarily for streaming via vMix.

import { vmixService } from './vmixService';

const TWITCH_RTMP_URL = 'rtmp://live.twitch.tv/app/';

class TwitchService {
    /**
     * Saves the Twitch stream key to localStorage.
     * @param key The user's Twitch stream key.
     */
    setStreamKey(key: string): void {
        localStorage.setItem('twitch_stream_key', key);
        console.log('Twitch stream key saved.');
    }

    /**
     * Retrieves the Twitch stream key from localStorage.
     * @returns The saved stream key or null if not found.
     */
    getStreamKey(): string | null {
        return localStorage.getItem('twitch_stream_key');
    }

    /**
     * Clears the saved Twitch stream key from localStorage.
     */
    clearStreamKey(): void {
        localStorage.removeItem('twitch_stream_key');
        console.log('Twitch stream key cleared.');
    }

    /**
     * Starts the stream on Twitch using the connected vMix instance.
     * @returns A confirmation message.
     */
    async startStream(): Promise<string> {
        if (!vmixService.getConnection()) {
            throw new Error("vMix is not connected. Cannot start stream.");
        }
        const streamKey = this.getStreamKey();
        if (!streamKey) {
            throw new Error("Twitch stream key is not configured. Please set it in the Connections Panel.");
        }

        console.log('Configuring vMix for Twitch stream...');
        await vmixService.sendCommand('StreamingSetURL', { Value: TWITCH_RTMP_URL });
        await vmixService.sendCommand('StreamingSetKey', { Value: streamKey });
        console.log('Starting vMix stream...');
        await vmixService.sendCommand('StartStreaming');
        
        return 'Twitch stream initiated via vMix.';
    }

    /**
     * Stops the stream on Twitch using the connected vMix instance.
     * @returns A confirmation message.
     */
    async stopStream(): Promise<string> {
        if (!vmixService.getConnection()) {
            throw new Error("vMix is not connected. Cannot stop stream.");
        }
        
        console.log('Stopping vMix stream...');
        await vmixService.sendCommand('StopStreaming');

        return 'Twitch stream stopped via vMix.';
    }
}

export const twitchService = new TwitchService();
