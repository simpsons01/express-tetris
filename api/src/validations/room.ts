import Joi from "joi";

export const createRoomSchema = Joi.object({
  name: Joi.string().alphanum().min(1).max(30).required(),
  config: Joi.object({
    initialLevel: Joi.number(),
  }),
});

export const addNewPlayerToRoomSchema = Joi.object({
  roomId: Joi.string().required(),
  playerName: Joi.string().alphanum().min(1).max(30).required(),
});

export const removePlayerFromRoomSchema = Joi.object({
  roomId: Joi.string().required(),
  playerName: Joi.string().alphanum().min(1).max(30).required(),
});
