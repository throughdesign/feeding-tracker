import type { PipeTransform } from "@nestjs/common";
import type { z } from "zod";
import { ValidationError, toIssueDetails } from "./errors.js";

/** Validates and parses a request body, query or param with a shared Zod schema. */
export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ValidationError("Request validation failed", toIssueDetails(result.error.issues));
    }
    return result.data;
  }
}

export function parseEntity<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ValidationError(
      "The resulting record is invalid",
      toIssueDetails(result.error.issues),
    );
  }
  return result.data;
}
