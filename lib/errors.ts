export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(error: unknown) {
  if (error instanceof HttpError) {
    return { status: error.status, body: { error: error.message } };
  }
  console.error(error);
  return { status: 500, body: { error: "Internal server error" } };
}
