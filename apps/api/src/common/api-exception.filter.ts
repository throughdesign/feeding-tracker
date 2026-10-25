import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { ApiErrorBody } from "@isaac/shared";
import type { Response } from "express";
import { DataFileError } from "../persistence/errors.js";
import { ConflictError, NotFoundError, ValidationError } from "./errors.js";

/**
 * Converts every error into `{ error: { code, message, issues? } }`. Internal
 * details and stack traces are logged on the server, never sent to the client.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("Api");

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const [status, body] = this.toResponse(exception);
    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
      );
    }
    response.status(status).json(body);
  }

  private toResponse(exception: unknown): [number, ApiErrorBody] {
    const body = (code: string, message: string, issues?: ApiErrorBody["error"]["issues"]) => ({
      error: issues ? { code, message, issues } : { code, message },
    });

    if (exception instanceof ValidationError) {
      return [
        HttpStatus.BAD_REQUEST,
        body("VALIDATION_ERROR", exception.message, exception.issues),
      ];
    }
    if (exception instanceof NotFoundError) {
      return [HttpStatus.NOT_FOUND, body("NOT_FOUND", exception.message)];
    }
    if (exception instanceof ConflictError) {
      return [HttpStatus.CONFLICT, body("CONFLICT", exception.message)];
    }
    if (exception instanceof DataFileError) {
      return [
        HttpStatus.SERVICE_UNAVAILABLE,
        body(
          "DATA_FILE_ERROR",
          "The data file could not be read or saved. It has not been modified; check the server log.",
        ),
      ];
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = status === 404 ? "NOT_FOUND" : status < 500 ? "BAD_REQUEST" : "INTERNAL_ERROR";
      const message = status < 500 ? exception.message : "Unexpected server error";
      return [status, body(code, message)];
    }
    // body-parser errors (e.g. malformed JSON) carry a 4xx status.
    const status = (exception as { status?: unknown })?.status;
    if (typeof status === "number" && status >= 400 && status < 500) {
      return [status, body("BAD_REQUEST", "Malformed request")];
    }
    return [HttpStatus.INTERNAL_SERVER_ERROR, body("INTERNAL_ERROR", "Unexpected server error")];
  }
}
