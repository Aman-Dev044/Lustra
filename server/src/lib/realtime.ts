import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { corsOptions } from './cors.js';
import { tokenFromCookieHeader, verifyToken } from './auth.js';
import { User } from '../models/User.js';

let io: Server | null = null;

/** userId → open socket count, per shop, for presence. */
const presence = new Map<string, Map<string, { name: string; count: number }>>();

function presencePayload(shopId: string) {
  const users = [...(presence.get(shopId)?.entries() ?? [])].map(([_id, v]) => ({ _id, name: v.name }));
  return { users };
}

export function initRealtime(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: corsOptions.origin, credentials: true },
  });

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ?? tokenFromCookieHeader(socket.handshake.headers.cookie);
    const auth = token ? verifyToken(token) : null;
    if (!auth) return next(new Error('unauthorized'));
    socket.data.auth = auth;
    next();
  });

  io.on('connection', async (socket) => {
    const { shopId, userId } = socket.data.auth as { shopId: string; userId: string };
    const room = `shop:${shopId}`;
    await socket.join(room);

    const user = await User.findById(userId).select('name').lean();
    const shopPresence = presence.get(shopId) ?? new Map();
    const entry = shopPresence.get(userId) ?? { name: user?.name ?? 'Someone', count: 0 };
    entry.count += 1;
    shopPresence.set(userId, entry);
    presence.set(shopId, shopPresence);
    io?.to(room).emit('presence', presencePayload(shopId));

    socket.on('disconnect', () => {
      const current = presence.get(shopId)?.get(userId);
      if (current) {
        current.count -= 1;
        if (current.count <= 0) presence.get(shopId)?.delete(userId);
      }
      io?.to(room).emit('presence', presencePayload(shopId));
    });
  });

  return io;
}

export function emitToShop(shopId: unknown, event: string, payload: unknown): void {
  io?.to(`shop:${String(shopId)}`).emit(event, payload);
}

export async function closeRealtime(): Promise<void> {
  if (io) await io.close();
  io = null;
}
