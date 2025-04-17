/**
 * Session management service
 * Handles anonymous user identification and session persistence
 */

// Generate a UUID for anonymous users
function generateUUID(): string {
  // Simple UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Check if the user is authenticated (has registered)
 * @returns Boolean indicating if user is authenticated
 */
export function isAuthenticated(): boolean {
  return localStorage.getItem('auth_token') !== null;
}

/**
 * Log session information
 * @param action The action being performed (login, logout, session change)
 * @param sessionType The type of session (google, anonymous)
 */
function logSession(action: string, sessionType: string): void {
  const timestamp = new Date().toISOString();
  const sessionId = getOrCreateAnonymousId();
  const authStatus = isAuthenticated();
  const username = getUsername();
  
  console.log(`[${timestamp}] Session ${action}:`, {
    sessionId,
    sessionType,
    isAuthenticated: authStatus,
    username: username || 'anonymous',
    action
  });
}

/**
 * Get the current anonymous user ID or create one if it doesn't exist
 * @returns The anonymous user ID
 */
export function getOrCreateAnonymousId(): string {
  // If user is authenticated, don't create a new anonymous ID
  if (isAuthenticated()) {
    // Still return the stored anonymous ID for request tracking
    const existingId = localStorage.getItem('anonymous_user_id');
    if (existingId) {
      return existingId;
    }
    // Only create new ID if really needed
  }
  
  let anonymousId = localStorage.getItem('anonymous_user_id');
  
  if (!anonymousId) {
    anonymousId = generateUUID();
    localStorage.setItem('anonymous_user_id', anonymousId);
    logSession('created', 'anonymous');
  }
  
  return anonymousId;
}

/**
 * Get the authentication token if available
 * @returns The authentication token or null if not authenticated
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Save authentication data after successful registration/login
 * @param token The authentication token
 * @param username The user's username
 * @param authType The type of authentication (google, regular)
 */
export function saveAuthData(token: string, username: string, authType: string = 'regular'): void {
  // Log login with the proper auth type
  const isGoogle = authType === 'google' || token.includes('google');
  
  // Clear game cache to prevent collisions
  clearGameCache();
  
  // Store auth data
  localStorage.setItem('auth_token', token);
  localStorage.setItem('username', username);
  
  // No need to create a new anonymous ID, just log the login
  logSession('login', isGoogle ? 'google' : authType);
  
  // Log a special message for Google auth
  if (isGoogle) {
    console.log(`User authenticated via Google: ${username}`);
  }
}

/**
 * Log out the user
 */
export function logout(): void {
  // Log authentication type before clearing
  const token = localStorage.getItem('auth_token');
  const authTypeHint = token && token.includes('google') ? 'google' : 'authenticated';
  
  // Log the logout event
  const authType = token ? authTypeHint : 'anonymous';
  logSession('logout', authType);
  
  // Clear all authentication data
  localStorage.removeItem('auth_token');
  localStorage.removeItem('username');
  
  // Clear game cache to prevent data from persisting between sessions
  clearGameCache();
  
  // Always generate a new anonymous ID on logout to ensure a completely fresh session
  // Remove existing anonymous ID
  localStorage.removeItem('anonymous_user_id');
  
  // Generate and set a new anonymous ID
  const newAnonymousId = generateUUID();
  localStorage.setItem('anonymous_user_id', newAnonymousId);
  console.log('Generated new anonymous ID on logout:', newAnonymousId);
  logSession('created', 'anonymous');
  
  // Force a complete page reload to ensure a fresh session
  window.location.href = '/';
}

/**
 * Get the current username if authenticated
 * @returns The username or null if not authenticated
 */
export function getUsername(): string | null {
  return localStorage.getItem('username');
}

/**
 * Clear all game-related cache data
 * This helps prevent collisions between sessions
 */
export function clearGameCache(): void {
  console.log('Clearing game cache to prevent session collisions');
  
  // List of all game-related localStorage keys to clear
  const gameCacheKeys = [
    // Daily challenge data
    'leagueProWordleDailyGuesses',
    'leagueProWordleLastPlayedDaily',
    'leagueProWordleDailyStats',
    'leagueProWordleDailyStatus',
    
    // Single player mode data
    'leagueProWordleGuesses',
    'leagueProWordleStats',
    'leagueProWordleGameState',
    
    // Record mode data
    'leagueProWordleRecordGuesses',
    'leagueProWordleRecordStats',
    'leagueProWordleRecordBest',
    'leagueProWordleRecordAvg',
    
    // Any other game-related cache
    'playerData',
    'lastFetchedPlayers'
  ];
  
  // Remove each item
  gameCacheKeys.forEach(key => {
    localStorage.removeItem(key);
  });
} 