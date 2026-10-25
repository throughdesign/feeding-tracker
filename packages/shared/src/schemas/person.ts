import { z } from "zod";
import { IsoDateTimeSchema, PersonIdSchema } from "./common.js";

export const PersonRoleSchema = z.enum(["mother", "baby"]);

export const PersonSchema = z.object({
  id: PersonIdSchema,
  name: z.string().min(1).max(100),
  role: PersonRoleSchema,
  createdAt: IsoDateTimeSchema,
});

export const DEFAULT_MOTHER_ID = "mother";
export const DEFAULT_BABY_ID = "isaac";
