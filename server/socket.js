import { Server } from 'socket.io';
import logger from './utils/logger.js';

let io;

function normalizeRooms(rooms) {
  return [...new Set((rooms || []).filter(Boolean))];
}

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    logger.info(`[Socket] Client connected: ${socket.id}`);

    socket.on('register-session', (payload = {}) => {
      const userId = Number(payload.userId);
      const role = String(payload.role || '').trim().toLowerCase();

      if (Number.isInteger(userId) && userId > 0) {
        socket.join(`user:${userId}`);
      }

      if (role) {
        socket.join(`role:${role}`);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized!');
  }
  return io;
};

export const emitSocketEvent = (eventName, payload) => {
  if (!io) {
    return false;
  }

  const rooms = normalizeRooms(payload?.rooms);
  const eventPayload = rooms.length ? { ...payload, rooms: undefined } : payload;

  if (rooms.length) {
    for (const room of rooms) {
      io.to(room).emit(eventName, eventPayload);
    }
    return true;
  }

  io.emit(eventName, eventPayload);
  return true;
};
