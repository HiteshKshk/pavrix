export class AppError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends AppError {
  details?: any;

  constructor(message: string, details?: any) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
    this.details = details;
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, "DATABASE_ERROR", 500);
    this.name = "DatabaseError";
  }
}

export class AIServiceError extends AppError {
  constructor(message: string) {
    super(message, "AI_SERVICE_ERROR", 502);
    this.name = "AIServiceError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests. Please try again later.") {
    super(message, "RATE_LIMIT_ERROR", 429);
    this.name = "RateLimitError";
  }
}

export function handleRouteError(error: any) {
  console.error("API Route Error:", error);
  
  const statusCode = error.statusCode || 500;
  const code = error.code || "INTERNAL_ERROR";
  const message = error.message || "An unexpected error occurred";
  
  return Response.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(error.details ? { details: error.details } : {}),
      },
    },
    { status: statusCode }
  );
}
