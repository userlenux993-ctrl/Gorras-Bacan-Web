import type { RequestHandler } from "express";
import { verifyToken } from "../routes/auth";

/**
 * Accepts authentication via:
 * 1. Bearer token in Authorization header  — works cross-origin (Vercel → Replit)
 * 2. Session cookie                         — works same-origin (Replit dev/deploy)
 */
const requireAuth: RequestHandler = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const username = verifyToken(authHeader.slice(7));
    if (username) { next(); return; }
  }

  if (req.session.authenticated) { next(); return; }

  res.status(401).json({ error: "No autorizado" });
};

export default requireAuth;
