import http from 'node:http';
import { config } from './config.js';
import { connectDb, disconnectDb } from './db.js';
import { createApp } from './app.js';
import { closeRealtime, initRealtime } from './lib/realtime.js';
import { startScheduler, stopScheduler, sweepOverdueInvoices } from './lib/automations.js';

async function main() {
  await connectDb();
  console.log(`[db] connected to ${config.mongoUri.replace(/\/\/[^@]*@/, '//***@')}`);

  const app = createApp();
  const server = http.createServer(app);
  initRealtime(server);
  startScheduler();
  const overdueTimer = setInterval(() => void sweepOverdueInvoices().catch((e) => console.error(e)), 60 * 60_000);
  overdueTimer.unref();
  void sweepOverdueInvoices().catch((e) => console.error(e));

  server.listen(config.port, () => {
    console.log(`[api] Lustra API listening on http://localhost:${config.port}`);
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[api] ${signal} received, shutting down…`);
    stopScheduler();
    clearInterval(overdueTimer);
    await closeRealtime();
    server.close();
    await disconnectDb();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[api] failed to start', err);
  process.exit(1);
});
