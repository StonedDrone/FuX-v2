// This is a mock authentication and playback service for Spotify.

export const spotifyService = {
    /**
     * Simulates a user login flow for Spotify.
     */
    login: async (): Promise<{ account: { username: string } }> => {
      console.log("Attempting to log in to Spotify (mock)...");
      // In a real app, this would trigger an OAuth flow.
      return new Promise(resolve => setTimeout(() => {
        console.log("Logged in to Spotify successfully (mock).");
        localStorage.setItem('spotify_user', 'demo_spotify_user');
        localStorage.setItem('spotify_token', 'mock-spotify-access-token');
        resolve({ account: { username: "demo_spotify_user" } });
      }, 1000));
    },
  
    /**
     * Simulates a user logout flow for Spotify.
     */
    logout: async (): Promise<void> => {
      console.log("Logging out from Spotify (mock).");
      localStorage.removeItem('spotify_user');
      localStorage.removeItem('spotify_token');
    },
  
    /**
     * Gets the current signed-in Spotify account from local storage.
     */
    getAccount: (): { username: string } | null => {
      const username = localStorage.getItem('spotify_user');
      return username ? { username } : null;
    },
  
    /**
     * Simulates acquiring an access token for the Spotify API.
     */
    getAccessToken: async (): Promise<string | null> => {
      const token = localStorage.getItem('spotify_token');
      if (!token) {
          console.warn("No mock Spotify token found. User might need to connect.");
          return null;
      }
      return token;
    },

    /**
     * Simulates playing a track on Spotify.
     * @param track The name of the song or artist to play.
     * @returns A confirmation message.
     */
    play: async (track: string): Promise<string> => {
        const token = await spotifyService.getAccessToken();
        if (!token) {
            throw new Error("Not connected to Spotify. Please connect in the Connections Panel.");
        }
        console.log(`(Mock) Sending command to Spotify to play: ${track}`);
        // In a real app, this would make an API call to the Spotify Web Playback SDK or API.
        return `Now playing "${track}" on Spotify.`;
    }
  };