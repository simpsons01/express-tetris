import http from "http";
import app from "./app";
import { initialize as initializeSocket } from "./config/socket";
import env from "./config/env";
import { connect as connectToRedis } from "./config/redis";

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
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
})();
