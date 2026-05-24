import type { Express, RequestHandler } from "express";

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);
}

export const isAuthenticated: RequestHandler = async (_req, _res, next) => {
  next();
};
