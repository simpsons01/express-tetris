import http from "http";
import app from "./app";
import socket from "./config/socket";
import env from "./config/env";
import { connect as connectToRedis } from "./config/redis";

(async () => {
  try {
    await connectToRedis();
    const httpServer = http.createServer(app);
    const socketInstance = socket.initialize(httpServer, {
      path: "/connect/socket.io",
      cors: {
        origin: env.ALLOW_ORIGIN,
      },
    });
    socketInstance.listen();
    const port = env.PORT || 8080;
    httpServer.listen(port, () =>
      console.log(`Server is running at http://localhost:${port}`)
    );
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
})();
