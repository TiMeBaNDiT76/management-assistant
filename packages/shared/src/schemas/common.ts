import { z } from "zod";
import { MOOD_MAX, MOOD_MIN } from "../constants";

export const idSchema = z.uuid();

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const moodSchema = z
  .number()
  .int()
  .min(MOOD_MIN)
  .max(MOOD_MAX)
  .nullable()
  .optional();
