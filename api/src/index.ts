import { connect as connectToRedis } from "./config/redis";
import env from "./config/env";
import app from "./app";

(async () => {
  try {
    await connectToRedis();
    const port = env.PORT || 8080;
    const server = app.listen(env.PORT || 8080, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
    process.on("SIGTERM", () => {
      server.close();
      process.exit(0);
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
})();
