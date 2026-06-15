import app from './app';
import { env } from './app/config/env';
import { connectDB } from './app/config/db';
const startServer = async () => {
  // Establish database connection (spins up local memory server if MONGODB_URI is blank)
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`🚀 Server successfully running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
  });
};
startServer();