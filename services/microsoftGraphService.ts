import { authService } from './authService';

// This is a mock service for interacting with the Microsoft Graph API.

interface UserProfile {
    displayName: string;
    mail: string;
}

export const graphService = {
  /**
   * Fetches the profile of the signed-in user from Microsoft Graph.
   * This mock implementation returns static data.
   */
  getUserProfile: async (): Promise<UserProfile> => {
    const accessToken = await authService.getAccessToken();
    
    if (!accessToken) {
      throw new Error("Authentication failed: No access token available.");
    }

    console.log("Fetching user profile from Graph API (mock)...");

    // In a real application, you would use the access token to make a call
    // to the actual Graph API endpoint.
    // const GRAPH_ENDPOINT = 'https://graph.microsoft.com/v1.0/me';
    // const response = await fetch(GRAPH_ENDPOINT, {
    //   headers: { Authorization: `Bearer ${accessToken}` }
    // });
    // if (!response.ok) throw new Error("Failed to fetch from Graph API.");
    // return response.json();

    // Return mock data for demonstration purposes.
    return {
      displayName: "Demo User",
      mail: "demo@example.com"
    };
  }
};