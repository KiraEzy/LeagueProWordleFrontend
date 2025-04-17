import io from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
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