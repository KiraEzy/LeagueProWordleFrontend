import { io, Socket } from 'socket.io-client';
import { getUsername, isAuthenticated } from './sessionService';

// Get the API URL from environment or default
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5432';

// In production with relative URL, use the current domain
const API_URL = apiUrl === '/' ? window.location.origin : apiUrl;

// Socket.io events
export enum SocketEvents {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECT_ERROR = 'connect_error',
  
  // Matchmaking events
  JOIN_QUEUE = 'joinQueue',
  LEAVE_QUEUE = 'leaveQueue',
  MATCH_FOUND = 'matchFound',
  
  // Game events
  PLAYER_READY = 'playerReady',
  ROUND_START = 'roundStart',
  ROUND_END = 'roundEnd',
  SUBMIT_GUESS = 'submitGuess',
  PLAYER_GUESSED = 'playerGuessed',
  PLAYER_MAX_GUESSES = 'playerMaxGuesses',
  WAITING_FOR_NEXT_ROUND = 'waitingForNextRound',
  MATCH_END = 'matchEnd',
  
  // Player events
  PLAYER_DISCONNECTED = 'playerDisconnected',
  
  // Error events
  ERROR = 'error'
}

// Player in a match
export interface MatchPlayer {
  socketId: string;
  username: string;
  score?: number;
}

// Match found event data
export interface MatchFoundData {
  roomId: string;
  players: MatchPlayer[];
  totalRounds: number;
  maxGuesses: number;
  roundTimer: number;
}

// Round start event data
export interface RoundStartData {
  round: number;
  totalRounds: number;
  endTime: number;
  playerInfo: MatchPlayer[];
}

// Player guess feedback
export interface PropertyFeedback {
  property: string;
  isCorrect: boolean;
  isClose: boolean;
  hint?: string;
}

// Player guess event data
export interface PlayerGuessData {
  playerId: number;
  socketId: string;
  username: string;
  feedback: PropertyFeedback[];
  correct: boolean;
}

// Player answer event data
export interface AnswerData {
  id: number;
  name: string;
  team: string;
  tournament_role: string;
  nationality: string;
  appearance: number;
}

// Round end event data
export interface RoundEndData {
  round: number;
  totalRounds: number;
  winnerSocketId?: string;
  winnerUsername?: string;
  answer: AnswerData;
  scores: MatchPlayer[];
}

// Match end event data
export interface MatchEndData {
  winnerSocketId?: string;
  winnerUsername?: string;
  scores: MatchPlayer[];
}

// Socket service state
export interface SocketServiceState {
  connected: boolean;
  inQueue: boolean;
  inMatch: boolean;
  roomId?: string;
  currentRound?: number;
  totalRounds?: number;
  matchPlayers?: MatchPlayer[];
  mySocketId?: string;
  maxGuesses?: number;
  roundTimer?: number;
  roundEndTime?: number;
  gameState?: 'waiting' | 'playing' | 'roundEnd' | 'matchEnd';
}

class SocketService {
  private socket: Socket | null = null;
  private state: SocketServiceState = {
    connected: false,
    inQueue: false,
    inMatch: false
  };
  private listeners: { [key: string]: ((data: any) => void)[] } = {};
  
  // Connect to socket.io server
  connect(): void {
    if (this.socket) return;
    
    this.socket = io(API_URL, {
      autoConnect: true,
      withCredentials: true
    });
    
    // Setup basic listeners
    this.setupListeners();
  }
  
  // Disconnect from socket.io server
  disconnect(): void {
    if (!this.socket) return;
    
    this.socket.disconnect();
    this.socket = null;
    this.state = {
      connected: false,
      inQueue: false,
      inMatch: false
    };
  }
  
  // Setup basic listeners
  private setupListeners(): void {
    if (!this.socket) return;
    
    this.socket.on(SocketEvents.CONNECT, () => {
      console.log('Connected to socket.io server');
      this.state.connected = true;
      this.state.mySocketId = this.socket?.id;
      this.emitEvent(SocketEvents.CONNECT, null);
    });
    
    this.socket.on(SocketEvents.DISCONNECT, () => {
      console.log('Disconnected from socket.io server');
      this.state.connected = false;
      this.state.inQueue = false;
      this.state.inMatch = false;
      this.emitEvent(SocketEvents.DISCONNECT, null);
    });
    
    this.socket.on(SocketEvents.CONNECT_ERROR, (error) => {
      console.error('Socket.io connection error:', error);
      this.emitEvent(SocketEvents.CONNECT_ERROR, error);
    });
    
    this.socket.on(SocketEvents.MATCH_FOUND, (data: MatchFoundData) => {
      console.log('Match found:', data);
      this.state.inQueue = false;
      this.state.inMatch = true;
      this.state.roomId = data.roomId;
      this.state.matchPlayers = data.players;
      this.state.totalRounds = data.totalRounds;
      this.state.currentRound = 1;
      this.state.maxGuesses = data.maxGuesses;
      this.state.roundTimer = data.roundTimer;
      this.state.gameState = 'waiting';
      this.emitEvent(SocketEvents.MATCH_FOUND, data);
    });
    
    this.socket.on(SocketEvents.ROUND_START, (data: RoundStartData) => {
      console.log('Round start:', data);
      this.state.currentRound = data.round;
      this.state.roundEndTime = data.endTime;
      this.state.gameState = 'playing';
      this.emitEvent(SocketEvents.ROUND_START, data);
    });
    
    this.socket.on(SocketEvents.PLAYER_GUESSED, (data: PlayerGuessData) => {
      console.log('Player guessed:', data);
      this.emitEvent(SocketEvents.PLAYER_GUESSED, data);
    });
    
    this.socket.on(SocketEvents.PLAYER_MAX_GUESSES, (data: { socketId: string; username: string }) => {
      console.log('Player reached max guesses:', data);
      this.emitEvent(SocketEvents.PLAYER_MAX_GUESSES, data);
    });
    
    this.socket.on(SocketEvents.ROUND_END, (data: RoundEndData) => {
      console.log('Round end:', data);
      this.state.gameState = 'roundEnd';
      
      // Update player scores
      if (this.state.matchPlayers) {
        this.state.matchPlayers = data.scores;
      }
      
      this.emitEvent(SocketEvents.ROUND_END, data);
    });
    
    this.socket.on(SocketEvents.WAITING_FOR_NEXT_ROUND, (data: { nextRound: number; totalRounds: number }) => {
      console.log('Waiting for next round:', data);
      this.state.currentRound = data.nextRound;
      this.state.gameState = 'waiting';
      this.emitEvent(SocketEvents.WAITING_FOR_NEXT_ROUND, data);
    });
    
    this.socket.on(SocketEvents.MATCH_END, (data: MatchEndData) => {
      console.log('Match end:', data);
      this.state.gameState = 'matchEnd';
      this.state.inMatch = false;
      
      // Clean up match data after delay
      setTimeout(() => {
        this.state.roomId = undefined;
        this.state.matchPlayers = undefined;
        this.state.currentRound = undefined;
        this.state.totalRounds = undefined;
      }, 5000);
      
      this.emitEvent(SocketEvents.MATCH_END, data);
    });
    
    this.socket.on(SocketEvents.PLAYER_DISCONNECTED, (data: { socketId: string; username: string }) => {
      console.log('Player disconnected:', data);
      this.emitEvent(SocketEvents.PLAYER_DISCONNECTED, data);
    });
    
    this.socket.on(SocketEvents.ERROR, (data: { message: string }) => {
      console.error('Socket error:', data);
      this.emitEvent(SocketEvents.ERROR, data);
    });
  }
  
  // Join matchmaking queue
  joinQueue(): void {
    if (!this.socket || !this.state.connected) {
      this.connect();
    }
    
    // Get username
    const username = getUsername() || 'Anonymous Player';
    const userId = isAuthenticated() ? 'user-id' : undefined; // Replace with actual user ID
    
    this.socket?.emit(SocketEvents.JOIN_QUEUE, { userId, username });
    this.state.inQueue = true;
  }
  
  // Leave matchmaking queue
  leaveQueue(): void {
    if (!this.socket || !this.state.connected || !this.state.inQueue) return;
    
    this.socket.emit(SocketEvents.LEAVE_QUEUE);
    this.state.inQueue = false;
  }
  
  // Ready for next round
  readyForRound(): void {
    if (!this.socket || !this.state.connected || !this.state.inMatch || !this.state.roomId) return;
    
    this.socket.emit(SocketEvents.PLAYER_READY, { roomId: this.state.roomId });
  }
  
  // Submit guess
  submitGuess(playerId: number): void {
    if (!this.socket || !this.state.connected || !this.state.inMatch || !this.state.roomId) return;
    
    this.socket.emit(SocketEvents.SUBMIT_GUESS, { roomId: this.state.roomId, playerId });
  }
  
  // Add event listener
  on(event: SocketEvents, callback: (data: any) => void): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    
    this.listeners[event].push(callback);
    
    // Return cleanup function
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }
  
  // Emit event to listeners
  private emitEvent(event: SocketEvents, data: any): void {
    if (!this.listeners[event]) return;
    
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }
  
  // Get current state
  getState(): SocketServiceState {
    return { ...this.state };
  }
}

// Export singleton instance
export default new SocketService(); 