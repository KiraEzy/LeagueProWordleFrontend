import io from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    // Get the API URL from environment or default
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    // Use API URL as is since we're now providing the full URL in .env.production
    const API_URL = apiUrl;
    
    socket = io(API_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });
    
    // Add global error handler
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
  }
  
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default { getSocket, disconnectSocket }; 