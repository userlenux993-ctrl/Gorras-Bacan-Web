import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

const router: IRouter = Router();

const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

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
  res.json({ authenticated: true });
});

router.post("/auth/logout", (req: Request, res: Response): void => {
  req.session.destroy(() => {});
  res.sendStatus(204);
});

router.get("/auth/me", (req: Request, res: Response): void => {
  res.json({ authenticated: !!req.session.authenticated });
});

export default router;
