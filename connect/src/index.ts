import http from "http";
import app from "./app";
import { initialize as initializeSocket } from "./config/socket";
import env from "./config/env";
import { connect as connectToRedis, getRedisClient } from "./config/redis";

(async () => {
  try {
    await connectToRedis();
    const httpServer = http.createServer(app);
    initializeSocket(httpServer, {
      path: "/connect/socket.io",
      cors: {
        origin: env.ALLOW_ORIGIN,
      },
    });
    const port = env.PORT || 8080;
    httpServer.listen(port, () =>
      console.log(`Server is running at http://localhost:${port}`)
    );
    process.on("SIGTERM", async () => {
      try {
        const redisClient = getRedisClient();
        await redisClient.quit();
        httpServer.close(() => {
          process.exit(0);
        });
      } catch (error) {
        process.exit(1);
      }
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
})();
