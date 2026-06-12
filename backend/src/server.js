import http from "http";
import { Server } from "socket.io";
import { app } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { registerSocketHandlers } from "./socket.js";

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.clientUrl,
    credentials: true
  }
});

registerSocketHandlers(io);

httpServer.listen(env.port, "0.0.0.0", () => {
  console.log(`API listening on port ${env.port}`);

  connectDatabase().catch((error) => {
    console.error("MongoDB connection failed", error);
  });
});
