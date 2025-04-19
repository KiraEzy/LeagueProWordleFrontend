import { WorldsPlayersJson } from './playerDataService';

// Add DEBUG_MODE variable for consistency with the rest of the app
const DEBUG_MODE = typeof window !== 'undefined' && window.location.hostname === 'localhost'; 

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
 * Get a random player for use in games, using appearance weights
 * @param players Array of player entries
 * @param gameMode The current game mode ('practice', 'daily', or 'record')
 */
export function getRandomPlayer(players: any[], gameMode: string = 'practice'): any {
  // First step: Group players by appearances 
  const appearanceGroups = {
    '1-2': [] as any[], // 1-2 appearances (low weight)
    '3-5': [] as any[], // 3-5 appearances (medium weight)
    '6+': [] as any[]   // 6+ appearances (high weight)
  };
  
  // Categorize players by appearance count
  players.forEach(([key, playerData]) => {
    const appearances = playerData.appearance || 0;
    
    if (appearances >= 6) {
      appearanceGroups['6+'].push([key, playerData]);
    } else if (appearances >= 3) {
      appearanceGroups['3-5'].push([key, playerData]);
    } else {
      appearanceGroups['1-2'].push([key, playerData]);
    }
  });
  
  // Determine which localStorage key to use based on game mode
  let storageKey;
  let retiredStorageKey;
  switch (gameMode) {
    case 'record':
      storageKey = 'leagueProWordleRecordAppearanceWeights';
      retiredStorageKey = 'leagueProWordleRecordRetiredWeight';
      break;
    case 'daily':
      storageKey = 'leagueProWordleDailyAppearanceWeights';
      retiredStorageKey = 'leagueProWordleDailyRetiredWeight';
      break;
    case 'practice':
    default:
      storageKey = 'leagueProWordleAppearanceWeights';
      retiredStorageKey = 'leagueProWordleRetiredWeight';
      break;
  }
  
  // Get saved weights from localStorage or use defaults
  let weights = {
    low: 15,    // 1-2 appearances (15%)
    medium: 25, // 3-5 appearances (25%)
    high: 60,   // 6+ appearances (60%)
  };
  
  // Get saved retired probability (default 50%)
  let retiredProbability = 50;
  
  try {
    const savedWeights = localStorage.getItem(storageKey);
    if (savedWeights) {
      weights = JSON.parse(savedWeights);
    }
    
    const savedRetiredProb = localStorage.getItem(retiredStorageKey);
    if (savedRetiredProb) {
      retiredProbability = parseInt(savedRetiredProb, 10);
    }
  } catch (e) {
    console.error(`Failed to parse saved weights for ${gameMode} mode:`, e);
  }
  
  if (DEBUG_MODE) {
    console.log(`Player appearance distribution (${gameMode} mode):`, {
      "1-2 appearances": appearanceGroups['1-2'].length,
      "3-5 appearances": appearanceGroups['3-5'].length,
      "6+ appearances": appearanceGroups['6+'].length,
      "Total players": players.length,
      "Weights used": weights,
      "Retired probability": retiredProbability,
      "StorageKey": storageKey
    });
  }
  
  // Calculate total weight
  const totalWeight = weights.low + weights.medium + weights.high;
  
  // Pick a random weight value
  const randomWeight = Math.random() * totalWeight;
  
  // Determine which group to pick from based on the weights
  let selectedGroup;
  if (randomWeight < weights.low) {
    selectedGroup = appearanceGroups['1-2'];
    if (DEBUG_MODE) console.log(`Selected group (${gameMode} mode): 1-2 appearances`);
  } else if (randomWeight < weights.low + weights.medium) {
    selectedGroup = appearanceGroups['3-5'];
    if (DEBUG_MODE) console.log(`Selected group (${gameMode} mode): 3-5 appearances`);
  } else {
    selectedGroup = appearanceGroups['6+'];
    if (DEBUG_MODE) console.log(`Selected group (${gameMode} mode): 6+ appearances`);
  }
  
  // If selected group is empty, fall back to any player
  if (!selectedGroup.length) {
    if (DEBUG_MODE) console.log(`Selected group is empty (${gameMode} mode), falling back to random player`);
    const allPlayers = [...appearanceGroups['1-2'], ...appearanceGroups['3-5'], ...appearanceGroups['6+']];
    // Get a random player
    const randomIndex = Math.floor(Math.random() * allPlayers.length);
    return selectPlayerByRetiredStatus(allPlayers, randomIndex, retiredProbability);
  }
  
  // Get a random player from the selected group
  const randomIndex = Math.floor(Math.random() * selectedGroup.length);
  return selectPlayerByRetiredStatus(selectedGroup, randomIndex, retiredProbability);
}

/**
 * Helper function to select a player while respecting the retired player probability
 * @param players Array of player entries [key, playerData]
 * @param initialIndex The initially selected random index
 * @param retiredProbability The probability (0-100) of selecting a retired player
 */
function selectPlayerByRetiredStatus(players: any[], initialIndex: number, retiredProbability: number): any {
  // Get the initially selected player
  const [_, initialPlayer] = players[initialIndex];
  
  // Check if the player is retired
  const isRetired = typeof initialPlayer.isRetired === 'string' 
    ? initialPlayer.isRetired === "1" 
    : Boolean(initialPlayer.isRetired);
  
  // Get current role info
  const currentRole = (initialPlayer.current_role || initialPlayer.player_current_role || '').toLowerCase();
  const isActiveRole = ['top', 'jungle', 'mid', 'bot', 'adc', 'support'].includes(currentRole);
  
  // Consider as "retired" in our logic if either formally retired or doesn't have active role or team
  const isConsideredRetired = isRetired || !initialPlayer.current_team || !isActiveRole;
  
  // Random roll to determine if we should respect the retired status
  const retiredRoll = Math.random() * 100;
  
  // If the player's retired status aligns with our probability roll, use this player
  if ((retiredRoll < retiredProbability && isConsideredRetired) || 
      (retiredRoll >= retiredProbability && !isConsideredRetired)) {
    return initialPlayer;
  }
  
  if (DEBUG_MODE) {
    console.log(`Re-rolling player due to retired status mismatch: 
      Selected ${isConsideredRetired ? 'retired' : 'active'} player but needed ${retiredRoll < retiredProbability ? 'retired' : 'active'}`);
  }
  
  // Try to find a player with the opposite retired status
  const matchingPlayers = players.filter(([_, player]) => {
    const playerIsRetired = typeof player.isRetired === 'string' 
      ? player.isRetired === "1" 
      : Boolean(player.isRetired);
    
    const playerRole = (player.current_role || player.player_current_role || '').toLowerCase();
    const playerIsActiveRole = ['top', 'jungle', 'mid', 'bot', 'adc', 'support'].includes(playerRole);
    
    const playerConsideredRetired = playerIsRetired || !player.current_team || !playerIsActiveRole;
    
    // Return true if the player's retired status matches what we need
    return retiredRoll < retiredProbability ? playerConsideredRetired : !playerConsideredRetired;
  });
  
  // If we found matching players, select one randomly
  if (matchingPlayers.length > 0) {
    const newIndex = Math.floor(Math.random() * matchingPlayers.length);
    if (DEBUG_MODE) console.log(`Found ${matchingPlayers.length} matching players, selected index ${newIndex}`);
    return matchingPlayers[newIndex][1];
  }
  
  // If no matching players found, just use the initial selection
  if (DEBUG_MODE) console.log(`No matching players found, using initial selection`);
  return initialPlayer;
}

/**
 * Get the player for today's daily challenge
 * @param players Array of player entries
 */
export function getDailyPlayer(players: any[]): any {
  const todayString = getTodayDateString();
  
  // Check if there's a cached daily player for today
  const cachedDaily = localStorage.getItem('leagueProWordleDailyTarget');
  if (cachedDaily) {
    try {
      const { date, player } = JSON.parse(cachedDaily);
      if (date === todayString) {
        if (DEBUG_MODE) console.log("Using cached daily player for", todayString);
        return player;
      }
    } catch (e) {
      console.error("Failed to parse cached daily player:", e);
    }
  }

  // No valid cached player for today, generate a new one
  if (DEBUG_MODE) console.log("Generating new daily player for", todayString);
  
  // Get a random player using the 'daily' game mode for appropriate weights
  const player = getRandomPlayer(players, 'daily');
  
  // Cache the daily player
  localStorage.setItem('leagueProWordleDailyTarget', JSON.stringify({
    date: todayString,
    player
  }));
  
  return player;
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