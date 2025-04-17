// API service for communicating with the backend
import { getOrCreateAnonymousId, getAuthToken } from './sessionService';

// Use the proper ImportMetaEnv interface instead of Record<string, string>
declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_BACKEND_URL: string;
    readonly VITE_SOCKET_URL: string;
    PROD: boolean;
    DEV: boolean;
    // Add other env variables as needed
  }
}

// In production with relative URL, we need to prepend /api
const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const API_BASE_URL = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`;

// Extract the base server URL (without /api)
export const SERVER_URL = API_BASE_URL.replace(/\/api$/, '');

// API endpoints
export const ENDPOINTS = {
  DAILY_GAME: '/game/daily',
  SUBMIT_GUESS: '/game/guess',
  PLAYER_LIST: '/players',
  USER_STATS: '/game/stats',
  HEALTH: '/health',
  HEALTH_DB: '/health/db',
  REGISTER: '/auth/register',
  GOOGLE_AUTH: '/auth/google',
  DEBUG_DAILY_ANSWER: '/game/debug/answer', // Debug-only endpoint
  DAILY_GAME_COMPLETE: '/game/daily/complete'
};

/**
 * Helper to create request headers with authorization/session information
 */
function getHeaders(includeContentType = false): HeadersInit {
  const headers: Record<string, string> = {};
  
  // Direct access to localStorage instead of using potentially problematic functions
  const authToken = localStorage.getItem('auth_token');
  
  // For authenticated users, the auth token is the primary identifier
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
    
    // Include session ID only if it already exists
    const existingSessionId = localStorage.getItem('anonymous_user_id');
    if (existingSessionId) {
      headers['X-Session-ID'] = existingSessionId;
    }
  } else {
    // For anonymous users, we need to ensure a session ID exists
    let sessionId = localStorage.getItem('anonymous_user_id');
    
    // Create a new anonymous ID if needed
    if (!sessionId) {
      // Simple UUID implementation
      sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      localStorage.setItem('anonymous_user_id', sessionId);
      console.log(`Created new anonymous ID for anonymous user: ${sessionId}`);
    }
    
    // Always include session ID in headers for anonymous users
    headers['X-Session-ID'] = sessionId;
  }
  
  // Add content type for JSON requests
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  
  return headers;
}

/**
 * Check if the server is online
 */
export async function checkServerStatus() {
  try {
    const response = await fetch(`${SERVER_URL}${ENDPOINTS.HEALTH}`, {
      method: 'GET',
      headers: getHeaders()
    });
    
    if (!response.ok) {
      return { online: false, error: response.statusText };
    }
    
    const data = await response.json();
    return { 
      online: data.status === 'online',
      timestamp: data.timestamp,
      message: data.message
    };
  } catch (error) {
    console.error('Failed to check server status:', error);
    return { online: false, error: error.message };
  }
}

/**
 * Check if the database connection is working
 */
export async function checkDatabaseStatus() {
  try {
    const response = await fetch(`${SERVER_URL}${ENDPOINTS.HEALTH_DB}`, {
      method: 'GET',
      headers: getHeaders()
    });
    
    if (!response.ok) {
      return { online: false, dbConnected: false, error: response.statusText };
    }
    
    const data = await response.json();
    return { 
      online: data.status === 'online',
      dbConnected: data.database === 'connected',
      timestamp: data.timestamp,
      dbTimestamp: data.dbTimestamp
    };
  } catch (error) {
    console.error('Failed to check database status:', error);
    return { online: false, dbConnected: false, error: error.message };
  }
}

/**
 * Get today's game information
 */
export async function getDailyGame() {
  try {
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.DAILY_GAME}`, {
      method: 'GET',
      headers: getHeaders(),
      credentials: 'include' // For cookie-based sessions
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching daily game: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch daily game:', error);
    throw error;
  }
}

/**
 * Submit a player guess
 * @param playerId The ID of the player being guessed
 */
export async function submitGuess(playerId: number) {
  try {
    console.log(`Submitting guess for player ID: ${playerId}`);
    
    if (!playerId || isNaN(playerId)) {
      throw new Error('Invalid player ID');
    }
    
    const url = `${API_BASE_URL}${ENDPOINTS.SUBMIT_GUESS}`;
    console.log(`Submitting to URL: ${url}`);
    
    const headers = getHeaders(true);
    console.log('Request headers:', headers);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      credentials: 'include', // For cookie-based sessions
      body: JSON.stringify({ playerId })
    });
    
    if (!response.ok) {
      let errorMessage = `Error submitting guess: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If we can't parse the error JSON, use the default message
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('Guess submission result:', result);
    return result;
  } catch (error) {
    console.error('Failed to submit guess:', error);
    throw error;
  }
}

/**
 * Get list of all players
 */
export async function getAllPlayers() {
  try {
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.PLAYER_LIST}`, {
      method: 'GET',
      headers: getHeaders(),
      credentials: 'include' // For cookie-based sessions
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching players: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch players:', error);
    throw error;
  }
}

/**
 * Get user game statistics
 */
export async function getUserStats() {
  try {
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.USER_STATS}`, {
      method: 'GET',
      headers: getHeaders(),
      credentials: 'include' // For cookie-based sessions
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching user stats: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
    throw error;
  }
}

/**
 * Register an anonymous user, converting them to a registered user
 */
export async function registerUser(username: string, email?: string) {
  try {
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.REGISTER}`, {
      method: 'POST',
      headers: getHeaders(true),
      credentials: 'include',
      body: JSON.stringify({ username, email })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Registration failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}

/**
 * Initiate Google OAuth login
 * This will redirect the user to the Google login page
 */
export function initiateGoogleLogin() {
  window.location.href = `${SERVER_URL}/api/auth/google`;
}

/**
 * Handle Google login callback
 * Extracts token and username from URL parameters and returns them
 */
export function handleGoogleLoginCallback(): { token: string | null, username: string | null, error: string | null } {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const username = urlParams.get('username');
  const error = urlParams.get('error');
  
  return { token, username, error };
}

/**
 * DEVELOPMENT ONLY: Get the daily answer for debugging
 * This should never be called in production mode
 */
export async function getDebugDailyAnswer() {
  // Only allow in development mode
  if (import.meta.env.PROD) {
    console.error('Debug endpoints cannot be called in production');
    return null;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.DEBUG_DAILY_ANSWER}`, {
      method: 'GET',
      headers: getHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching debug answer: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch debug answer:', error);
    return null;
  }
}

/**
 * Fetch all daily game data including stats, guesses, and game status
 * @returns Complete daily game data including previous guesses and stats
 */
export async function getDailyGameData() {
  // Build headers with auth token and/or session ID
  const headers = {};
  const token = localStorage.getItem('auth_token');
  const sessionId = localStorage.getItem('anonymous_user_id');
  
  console.log('getDailyGameData - Starting request');
  console.log('Token available:', !!token);
  console.log('Session ID available:', !!sessionId);
  
  // Add auth token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add session ID if available
  if (sessionId) {
    headers['X-Session-ID'] = sessionId;
    console.log('Using session ID:', sessionId);
  }
  
  try {
    const fullUrl = `${API_BASE_URL}${ENDPOINTS.DAILY_GAME_COMPLETE}`;
    console.log('Making request to:', fullUrl);
    console.log('With headers:', headers);
    
    // Make the request
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
      credentials: 'include'
    });
    
    console.log('Got response status:', response.status);
    console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
    
    // Check for a new session ID from the server
    const newSessionId = response.headers.get('X-Session-ID');
    if (newSessionId && !token) {
      localStorage.setItem('anonymous_user_id', newSessionId);
      console.log('Saved new session ID from server:', newSessionId);
    }
    
    // Handle errors
    if (!response.ok) {
      let errorMessage = `Failed to fetch daily game data: ${response.status}`;
      try {
        const errorData = await response.json();
        console.error('Error response data:', errorData);
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // Use default error message if JSON parsing fails
        console.error('Failed to parse error response as JSON:', e);
      }
      throw new Error(errorMessage);
    }
    
    // Parse and return the data
    const data = await response.json();
    console.log('Successfully got daily game data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching daily game data:', error);
    throw error;
  }
} 