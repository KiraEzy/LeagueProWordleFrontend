import { getAllPlayers as getOfflinePlayers } from './offlinePlayerService';

interface BackendPlayer {
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

interface WorldsPlayerData {
  mainName: string;
  allNames: string[];
  nationality: string;
  Residency: string;
  birthdate: string | null;
  tournament_role: string;
  team: string | null;
  appearance: number;
  current_role: string;
  isRetired: string;
  current_team: string | null;
  current_team_region: string | null;
  id: number;
}

export interface WorldsPlayersJson {
  [key: string]: WorldsPlayerData;
}

/**
 * Fetch all players from the offline data and transform them to match
 * the exact format required by the frontend
 */
export async function fetchAndFormatPlayers(): Promise<WorldsPlayersJson> {
  try {
    // Use the offline data service instead of the API
    const backendPlayers = await getOfflinePlayers();
    
    // Check if the data is valid
    if (!backendPlayers || !Array.isArray(backendPlayers) || backendPlayers.length === 0) {
      throw new Error('Offline data is empty or invalid');
    }
    
    return transformPlayersData(backendPlayers);
  } catch (error) {
    console.error('Error fetching players from offline data:', error);
    throw new Error(
      `Failed to fetch player data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Transform backend player data to match the expected format for the frontend
 */
function transformPlayersData(players: BackendPlayer[]): WorldsPlayersJson {
  const formattedPlayers: WorldsPlayersJson = {};
  
  // Log the first player for debugging purposes
  if (players.length > 0 && import.meta.env.DEV) {
    console.log('Sample player data from offline source:', players[0]);
  }

  players.forEach(player => {
    formattedPlayers[player.name] = {
      mainName: player.main_name,
      allNames: player.all_names || [player.name],
      nationality: player.nationality || '',
      Residency: player.residency || '',
      birthdate: player.birthdate,
      tournament_role: player.tournament_role || '',
      team: player.team,
      appearance: player.appearance || 0,
      current_role: player.player_current_role || '',
      isRetired: player.is_retired ? '1' : '0', // Convert boolean to string format
      current_team: player.current_team,
      current_team_region: player.current_team_region || 'null',
      id: player.id
    };
  });
  
  // Log the first transformed player for debugging purposes
  if (Object.keys(formattedPlayers).length > 0 && import.meta.env.DEV) {
    const firstPlayerKey = Object.keys(formattedPlayers)[0];
    console.log('Sample transformed player:', {
      key: firstPlayerKey,
      data: formattedPlayers[firstPlayerKey]
    });
  }

  return formattedPlayers;
} 