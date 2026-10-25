/**
 * Raised when the data file cannot be read, parsed or validated. The file is
 * never reset automatically: a human must inspect it (or restore the backup).
 */
export class DataFileError extends Error {
  constructor(
    readonly reason: "read" | "parse" | "invalid" | "write",
    readonly filePath: string,
    detail: string,
    options?: { cause?: unknown },
  ) {
    super(
      `Data file ${filePath} could not be ${reason === "write" ? "written" : "loaded"} (${reason}): ${detail}`,
      options,
    );
    this.name = "DataFileError";
  }
}
