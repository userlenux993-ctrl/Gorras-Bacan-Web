import { Router, type IRouter, type Request, type Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

const router: IRouter = Router();

const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

function getTokenSecret(): string {
  return process.env.SESSION_SECRET ?? "dev-secret-change-me";
}

export function signToken(username: string): string {
  const payload = `${username}:${Date.now()}`;
  const sig = createHmac("sha256", getTokenSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyToken(raw: string): string | null {
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon === -1) return null;
    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);
    const expected = createHmac("sha256", getTokenSecret()).update(payload).digest("hex");
    if (sig.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
    const firstColon = payload.indexOf(":");
    return firstColon === -1 ? null : payload.slice(0, firstColon);
  } catch {
    return null;
  }
}

router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  const { username, password } = parsed.data;
  const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    req.log.error("ADMIN_PASSWORD environment variable is not set");
    res.status(500).json({ error: "El panel admin no está configurado. Contacta al desarrollador." });
    return;
  }

  if (username !== adminUsername || password !== adminPassword) {
    res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    return;
  }

  req.session.authenticated = true;
  req.session.username = username;

  res.json({ authenticated: true, token: signToken(username) });
});

router.post("/auth/logout", (req: Request, res: Response): void => {
  req.session.destroy(() => {});
  res.sendStatus(204);
});

router.get("/auth/me", (req: Request, res: Response): void => {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const username = verifyToken(authHeader.slice(7));
    if (username) { res.json({ authenticated: true }); return; }
  }
  res.json({ authenticated: !!req.session.authenticated });
});

export default router;
