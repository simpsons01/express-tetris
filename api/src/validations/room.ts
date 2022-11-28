import Joi from "joi";

export const createRoomSchema = Joi.object({
  name: Joi.string().alphanum().min(1).max(30).required(),
});

export const addNewPlayerToRoomSchema = Joi.object({
  roomId: Joi.string().required(),
  player: {
    name: Joi.string().alphanum().min(1).max(30).required(),
    id: Joi.string().required(),
  },
});

export const removePlayerFromRoomSchema = Joi.object({
  roomId: Joi.string().required(),
  playerId: Joi.string().required(),
});
