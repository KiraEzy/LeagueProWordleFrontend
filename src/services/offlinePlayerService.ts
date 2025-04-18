import { WorldsPlayersJson } from './playerDataService';

let cachedPlayerData: WorldsPlayersJson | null = null;
let dailyPlayerCache: any = null;

// Interface matching the structure from the backend
export interface BackendPlayer {
  id: number;
  name: string;
  main_name: string;
  all_names: string[];
  nationality: string | null;
  residency: string | null;
  birthdate: string | null;
  tournament_role: string | null;
  team: string | null;
  appearance: number | null;
  player_current_role: string | null;
  is_retired: boolean;
  current_team: string | null;
  current_team_region: string | null;
}

/**
 * Generate a simple hash from a string for deterministic player selection
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Determine today's date string in YYYY-MM-DD format
 */
function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Get a random player for use in games
 */
export function getRandomPlayer(players: any[]): any {
  const index = Math.floor(Math.random() * players.length);
  return players[index][1];
}

/**
 * Get a consistent daily player based on the date
 */
export function getDailyPlayer(players: any[]): any {
  // Get today's date and use it to seed the random selection
  const today = getTodayDateString();
  const hash = simpleHash(today);
  const index = hash % players.length;
  return players[index][1];
}

/**
 * Load player data from the JSON file
 */
export async function loadPlayerData(): Promise<WorldsPlayersJson> {
  if (cachedPlayerData) {
    return cachedPlayerData;
  }

  try {
    const response = await fetch('/worlds_players.json');
    if (!response.ok) {
      throw new Error(`Failed to load player data: ${response.status}`);
    }
    const data = await response.json();
    cachedPlayerData = data;
    return data;
  } catch (error) {
    console.error("Error loading player data:", error);
    throw new Error(`Failed to load offline player data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Transform player data from the JSON format to the backend API format
 */
export function transformToBackendFormat(jsonData: WorldsPlayersJson): BackendPlayer[] {
  return Object.entries(jsonData).map(([name, player]) => ({
    id: player.id || Math.floor(Math.random() * 10000),
    name,
    main_name: player.mainName,
    all_names: player.allNames,
    nationality: player.nationality,
    residency: player.Residency,
    birthdate: player.birthdate,
    tournament_role: player.tournament_role,
    team: player.team,
    appearance: player.appearance,
    player_current_role: player.current_role,
    is_retired: player.isRetired === "1",
    current_team: player.current_team,
    current_team_region: player.current_team_region
  }));
}

/**
 * Get all players in the backend API format
 */
export async function getAllPlayers(): Promise<BackendPlayer[]> {
  const jsonData = await loadPlayerData();
  return transformToBackendFormat(jsonData);
}

/**
 * Compare a guess to the target player and return feedback
 */
export function comparePlayerAttributes(guess: string, target: any, allPlayers: WorldsPlayersJson): any {
  // Find the guessed player
  const guessedPlayer = allPlayers[guess];
  if (!guessedPlayer) {
    return { error: 'Player not found' };
  }

  // Compare attributes
  const feedback = {
    name: { value: guess, isCorrect: guess === target.mainName },
    team: { 
      value: guessedPlayer.current_team || guessedPlayer.team || 'None', 
      isCorrect: (guessedPlayer.current_team === target.current_team) || 
                (guessedPlayer.team === target.team),
      isClose: false 
    },
    role: { 
      value: guessedPlayer.tournament_role, 
      isCorrect: guessedPlayer.tournament_role === target.tournament_role,
      isClose: false
    },
    nationality: { 
      value: guessedPlayer.nationality, 
      isCorrect: guessedPlayer.nationality === target.nationality,
      isClose: false
    },
    appearance: { 
      value: guessedPlayer.appearance, 
      isCorrect: guessedPlayer.appearance === target.appearance,
      isHigher: guessedPlayer.appearance > target.appearance,
      isLower: guessedPlayer.appearance < target.appearance
    }
  };
  
  return feedback;
}

/**
 * Submit a guess for the daily challenge
 */
export async function submitDailyGuess(playerName: string): Promise<any> {
  try {
    // Load player data if not already cached
    const allPlayers = await loadPlayerData();
    
    // Get or create daily player
    if (!dailyPlayerCache) {
      const playerEntries = Object.entries(allPlayers);
      const dailyPlayer = getDailyPlayer(playerEntries);
      dailyPlayerCache = dailyPlayer;
    }
    
    // Compare the guess with the daily player
    const feedback = comparePlayerAttributes(playerName, dailyPlayerCache, allPlayers);
    
    // Simulate a delay to make it feel like a server call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return feedback;
  } catch (error) {
    console.error('Error processing guess:', error);
    throw new Error('Failed to process guess offline');
  }
}

/**
 * Get the complete daily game information
 */
export async function getDailyChallenge(): Promise<any> {
  try {
    // Load player data
    const jsonData = await loadPlayerData();
    
    // Get stored state from localStorage
    const savedGuesses = localStorage.getItem('leagueProWordleDailyGuesses');
    const lastPlayed = localStorage.getItem('leagueProWordleLastPlayedDaily');
    const savedStats = localStorage.getItem('leagueProWordleDailyStats');
    
    // Check if we need to select a new daily player
    const today = getTodayDateString();
    const isNewDay = lastPlayed !== today;

    // Get the daily player for today
    const playerEntries = Object.entries(jsonData);
    const dailyPlayer = getDailyPlayer(playerEntries);
    dailyPlayerCache = dailyPlayer;
    
    if (DEBUG_MODE) {
      console.log('Today\'s daily player:', dailyPlayer.mainName);
    }
    
    // Parse stored guesses or start fresh
    let guesses: any[] = [];
    if (savedGuesses && !isNewDay) {
      try {
        guesses = JSON.parse(savedGuesses);
      } catch (e) {
        console.error('Error parsing saved guesses:', e);
      }
    }
    
    // Parse stored stats or use defaults
    let stats = {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      winPercentage: 0
    };
    
    if (savedStats) {
      try {
        stats = JSON.parse(savedStats);
      } catch (e) {
        console.error('Error parsing saved stats:', e);
      }
    }
    
    // Determine game status
    let gameStatus = 'playing';
    let alreadyPlayed = false;
    
    if (guesses.length > 0) {
      // Check if the game is already won
      const lastGuess = guesses[guesses.length - 1];
      if (lastGuess && typeof lastGuess === 'object' && lastGuess.name && lastGuess.name.isCorrect) {
        gameStatus = 'won';
        alreadyPlayed = true;
      } 
      // Check if the game is lost (used all attempts)
      else if (guesses.length >= 6) {
        gameStatus = 'lost';
        alreadyPlayed = true;
      }
    }
    
    // If it's a new day, we should allow playing again
    if (isNewDay) {
      alreadyPlayed = false;
      // Don't reset guesses here - we'll let the component handle that
    }
    
    return {
      gameInfo: {
        date: today,
        isNewDay
      },
      gameStatus,
      alreadyPlayed,
      stats,
      guesses,
      remainingGuesses: 6 - guesses.length
    };
  } catch (error) {
    console.error('Error getting daily challenge:', error);
    throw new Error('Failed to get offline daily challenge');
  }
}

/**
 * For debug mode - get today's answer
 */
export async function getDebugDailyAnswer(): Promise<any> {
  const jsonData = await loadPlayerData();
  const playerEntries = Object.entries(jsonData);
  const dailyPlayer = getDailyPlayer(playerEntries);
  
  return {
    name: dailyPlayer.mainName,
    formattedTeam: dailyPlayer.current_team || dailyPlayer.team || "Retired",
    role: dailyPlayer.tournament_role,
    nationality: dailyPlayer.nationality,
    appearances: dailyPlayer.appearance
  };
}

// Add DEBUG_MODE variable for consistency with the rest of the app
const DEBUG_MODE = typeof window !== 'undefined' && window.location.hostname === 'localhost'; 