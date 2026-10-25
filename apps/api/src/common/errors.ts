export type IssueDetail = { path: string; message: string };

/** Domain-level errors, mapped to HTTP responses by `ApiExceptionFilter`. */
export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} ${id} was not found`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    readonly issues: IssueDetail[] = [],
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export function toIssueDetails(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): IssueDetail[] {
  return issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));
}
