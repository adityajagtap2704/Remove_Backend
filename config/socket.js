const jwt = require('jsonwebtoken');
const { handleSocketConnection } = require('../socket/socketHandler');

// Store active connections
const activeConnections = new Map();
const driverLocations = new Map();
const rideRooms = new Map();

const initializeSocket = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userType = decoded.userType;
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.userId} (${socket.userType})`);
    
    // Store the connection
    activeConnections.set(socket.userId, {
      socketId: socket.id,
      userType: socket.userType,
      connectedAt: new Date()
    });

    // Handle socket events
    handleSocketConnection(socket, io, {
      activeConnections,
      driverLocations,
      rideRooms
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`🔌 User disconnected: ${socket.userId}, Reason: ${reason}`);
      
      // Remove from active connections
      activeConnections.delete(socket.userId);
      
      // Remove driver location if it's a driver
      if (socket.userType === 'driver') {
        driverLocations.delete(socket.userId);
        // Notify nearby users that driver is offline
        socket.broadcast.emit('driver-offline', {
          driverId: socket.userId
        });
      }
      
      // Clean up any ride rooms
      for (const [rideId, room] of rideRooms.entries()) {
        if (room.driverId === socket.userId || room.riderId === socket.userId) {
          // Notify the other party about disconnection
          socket.to(rideId).emit('participant-disconnected', {
            userId: socket.userId,
            userType: socket.userType
          });
        }
      }
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  // Periodic cleanup of stale connections
  setInterval(() => {
    const now = new Date();
    for (const [userId, connection] of activeConnections.entries()) {
      const timeDiff = now - connection.connectedAt;
      // Remove connections older than 1 hour with no activity
      if (timeDiff > 3600000) {
        activeConnections.delete(userId);
      }
    }
  }, 300000); // Run every 5 minutes

  return {
    activeConnections,
    driverLocations,
    rideRooms
  };
};

// Helper functions for socket management
const getActiveConnections = () => activeConnections;
const getDriverLocations = () => driverLocations;
const getRideRooms = () => rideRooms;

const isUserOnline = (userId) => activeConnections.has(userId);

const emitToUser = (io, userId, event, data) => {
  const connection = activeConnections.get(userId);
  if (connection) {
    io.to(connection.socketId).emit(event, data);
    return true;
  }
  return false;
};

const emitToRoom = (io, roomId, event, data) => {
  io.to(roomId).emit(event, data);
};

const joinRoom = (io, userId, roomId) => {
  const connection = activeConnections.get(userId);
  if (connection) {
    const socket = io.sockets.sockets.get(connection.socketId);
    if (socket) {
      socket.join(roomId);
      return true;
    }
  }
  return false;
};

const leaveRoom = (io, userId, roomId) => {
  const connection = activeConnections.get(userId);
  if (connection) {
    const socket = io.sockets.sockets.get(connection.socketId);
    if (socket) {
      socket.leave(roomId);
      return true;
    }
  }
  return false;
};

module.exports = {
  initializeSocket,
  getActiveConnections,
  getDriverLocations,
  getRideRooms,
  isUserOnline,
  emitToUser,
  emitToRoom,
  joinRoom,
  leaveRoom
};