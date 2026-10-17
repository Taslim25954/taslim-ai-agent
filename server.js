import dns from "dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
import app from './app.js';
import mongoose from 'mongoose';
import { env } from './config/env.js';

async function start() {
  try {
    await mongoose.connect(env.mongoUri);
    console.log('Connected to MongoDB');

    const server = app.listen(env.port, () => {
      console.log(`Server listening on port ${env.port}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received, shutting down`);

      server.close(async () => {
        if (mongoose.connection.readyState) {
          await mongoose.disconnect();
        }
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    process.on('unhandledRejection', (reason, p) => {
      console.error('Unhandled Rejection at:', p, 'reason:', reason);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();

