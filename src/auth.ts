import type { Request, Response, NextFunction } from "express";

export function readBearerToken(req: Request): string | undefined {
  const header = req.header("authorization");
  if (!header) {
    return undefined;
  }

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

export function isAuthorized(req: Request, authToken: string): boolean {
  if (!authToken) {
    return true;
  }

  return readBearerToken(req) === authToken;
}

export function requireBearerAuth(authToken: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isAuthorized(req, authToken)) {
      next();
      return;
    }

    res.status(401).json({ error: "Missing or invalid bearer token." });
  };
}
