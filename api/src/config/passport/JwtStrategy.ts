import { Strategy, ExtractJwt } from "passport-jwt";
import { isNil } from "ramda";
import env from "../env";
import * as playerService from "../../services/player";

const strategy = new Strategy(
  {
    secretOrKey: env.JWT_SECRET,
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  },
  async (payload, done) => {
    if (isNil(payload)) {
      return done(null, false);
    }
    try {
      const player = await playerService.getPlayer(payload.id);
      if (!isNil(player)) {
        done(null, player);
      } else {
        done(null, false);
      }
    } catch (err) {
      done(err);
    }
  }
);

export default strategy;
