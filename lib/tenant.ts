import { NextResponse } from "next/server";
import { getSessionUser } from "./auth";
import { can, Perm } from "./permissions";
import { HttpError, jsonError } from "./errors";

export { HttpError };

export async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new HttpError(401, "Not authenticated");
  return u;
}

export async function requirePerm(p: Perm) {
  const u = await requireUser();
  if (!can(u, p)) throw new HttpError(403, "Forbidden");
  return u;
}

export function handleRoute<T extends unknown[]>(
  fn: (...args: T) => Promise<Response>,
) {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (error) {
      const { status, body } = jsonError(error);
      return NextResponse.json(body, { status });
    }
  };
}
