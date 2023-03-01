import Joi from "joi";

export const createPlayerSchema = Joi.object({
  name: Joi.string().alphanum().min(1).max(30).required(),
});
