// API service for communicating with the backend
// Modified to use offline data when backend is not available
import { getOrCreateAnonymousId, getAuthToken } from './sessionService';
import * as offlineService from './offlinePlayerService';

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

// Force offline mode for all API calls
const OFFLINE_MODE = true;

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

// Helper to detect if we're in offline mode
function isOfflineMode(): boolean {
  return OFFLINE_MODE;
}

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
export const checkServerStatus = async (): Promise<boolean> => {
  if (isOfflineMode()) {
    console.log('Server status check: Running in offline mode');
    return false;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL.replace(/\/api$/, '')}/health`);
    return response.ok;
  } catch (error) {
    console.error('Failed to check server status:', error);
    return false;
  }
};

/**
 * Check if the database connection is working
 */
export async function checkDatabaseStatus() {
  if (isOfflineMode()) {
    console.log('Database status check: Running in offline mode');
    return { 
      online: false, 
      dbConnected: false, 
      error: 'Running in offline mode', 
      timestamp: new Date().toISOString(),
      dbTimestamp: null
    };
  }
  
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
  if (isOfflineMode()) {
    console.log('Getting daily game: Running in offline mode');
    return offlineService.getDailyChallenge();
  }
  
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
 * Submit a guess for the daily challenge
 */
export const submitGuess = async (playerName: string) => {
  if (isOfflineMode()) {
    console.log('Submitting guess offline:', playerName);
    return offlineService.submitDailyGuess(playerName);
  }
  
  try {
    const sessionId = getOrCreateAnonymousId();
    const response = await fetch(`${API_BASE_URL}/game/guess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId
      },
      body: JSON.stringify({ playerName })
    });
    return handleApiResponse(response);
  } catch (error) {
    console.error('Failed to submit guess:', error);
    throw error;
  }
};

/**
 * Get list of all players
 */
export const getAllPlayers = async () => {
  if (isOfflineMode()) {
    console.log('Getting all players: Running in offline mode');
    return offlineService.getAllPlayers();
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/game/players`);
    return handleApiResponse(response);
  } catch (error) {
    console.error('Failed to fetch players:', error);
    throw error;
  }
};

/**
 * Get user game statistics
 */
export async function getUserStats() {
  if (isOfflineMode()) {
    console.log('Getting user stats: Running in offline mode');
    // Get stats from localStorage
    const statsJson = localStorage.getItem('leagueProWordleDailyStats');
    if (statsJson) {
      return JSON.parse(statsJson);
    }
    
    // Return default stats
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      winPercentage: 0
    };
  }
  
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
  if (isOfflineMode()) {
    console.log('Registering user offline:', username);
    // Simulate registration in localStorage
    localStorage.setItem('username', username);
    localStorage.setItem('auth_token', 'offline-token');
    return { token: 'offline-token', username };
  }
  
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
  if (isOfflineMode()) {
    console.log('Google login not available in offline mode');
    alert('Google login is not available when running offline.');
    return;
  }
  
  window.location.href = `${SERVER_URL}/auth/google`;
}

/**
 * Handle Google login callback
 * Extracts token and username from URL parameters and returns them
 */
export function handleGoogleLoginCallback(): { token: string | null, username: string | null, error: string | null } {
  if (isOfflineMode()) {
    return { token: null, username: null, error: 'Offline mode active' };
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const username = urlParams.get('username');
  const error = urlParams.get('error');
  
  return { token, username, error };
}

/**
 * Get debug daily answer (only in development mode)
 */
export const getDebugDailyAnswer = async () => {
  if (isOfflineMode()) {
    console.log('Getting debug daily answer: Running in offline mode');
    return offlineService.getDebugDailyAnswer();
  }
  
  if (import.meta.env.PROD) {
    console.warn('Debug endpoint accessed in production');
    return null;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/game/debug/answer`);
    return handleApiResponse(response);
  } catch (error) {
    console.error('Failed to fetch debug answer:', error);
    return null;
  }
};

/**
 * Fetch all daily game data including stats, guesses, and game status
 * @returns Complete daily game data including previous guesses and stats
 */
export const getDailyChallenge = async () => {
  if (isOfflineMode()) {
    console.log('Getting daily challenge: Running in offline mode');
    return offlineService.getDailyChallenge();
  }
  
  try {
    const sessionId = getOrCreateAnonymousId();
    const response = await fetch(`${API_BASE_URL}/game/daily/complete`, {
      headers: {
        'X-Session-ID': sessionId
      }
    });
    return handleApiResponse(response);
  } catch (error) {
    console.error('Failed to fetch daily challenge:', error);
    throw error;
  }
};

// Function to handle API response
const handleApiResponse = async (response: Response) => {
  // Check if response is OK (status code 200-299)
  if (!response.ok) {
    // Try to parse error response
    try {
      const errorData = await response.json();
      throw new Error(errorData.message || `API error (${response.status})`);
    } catch (jsonError) {
      // If we can't parse JSON, use the status text
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
  }
  
  // Check for empty response
  const text = await response.text();
  if (!text) return null;
  
  // Try to parse as JSON
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Invalid JSON response:', text.substring(0, 100) + '...');
    throw new Error('Invalid response format from server');
  }
}; 