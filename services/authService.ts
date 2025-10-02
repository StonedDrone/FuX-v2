// This is a mock authentication service. In a real application, you would
// use a library like MSAL (Microsoft Authentication Library) to handle
// OAuth2 authentication against Azure Active Directory.

export const authService = {
    /**
     * Simulates a user login flow.
     */
    login: async (): Promise<{ account: { username: string } }> => {
      console.log("Attempting to log in (mock)...");
      // In a real app, this would trigger a popup or redirect to a login page.
      return new Promise(resolve => setTimeout(() => {
        console.log("Logged in successfully (mock).");
        sessionStorage.setItem('mock_user', 'demo@example.com');
        sessionStorage.setItem('mock_token', 'mock-access-token');
        resolve({ account: { username: "demo@example.com" } });
      }, 1000));
    },
  
    /**
     * Simulates a user logout flow.
     */
    logout: async (): Promise<void> => {
      console.log("Logging out (mock).");
      sessionStorage.removeItem('mock_user');
      sessionStorage.removeItem('mock_token');
    },
  
    /**
     * Gets the current signed-in user account from session storage.
     */
    getAccount: (): { username: string } | null => {
      const username = sessionStorage.getItem('mock_user');
      return username ? { username } : null;
    },
  
    /**
     * Simulates acquiring an access token for a protected resource (e.g., Microsoft Graph).
     */
    getAccessToken: async (): Promise<string | null> => {
      console.log("Acquiring access token (mock).");
      // In a real app, this would silently acquire a token from the cache
      // or refresh it if necessary.
      const token = sessionStorage.getItem('mock_token');
      if (!token) {
          console.warn("No mock token found. User might need to log in.");
          return null;
      }
      return token;
    }
  };