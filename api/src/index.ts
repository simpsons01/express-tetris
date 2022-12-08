import runPrivateApp from "./app/private";
import runPubicApp from "./app/public";
import env from "./config/env";

(async () => {
  try {
    if (env.PUBLIC) {
      await runPubicApp();
    } else {
      await runPrivateApp();
    }
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
})();
