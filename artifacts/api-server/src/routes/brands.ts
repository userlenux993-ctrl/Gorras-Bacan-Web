import { Router, type IRouter, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, brandsTable } from "@workspace/db";
import { z } from "zod";
import requireAuth from "../middlewares/requireAuth";

const router: IRouter = Router();

const BrandInputSchema = z.object({
  name: z.string().min(1),
});

// Public: list all brands
router.get("/brands", async (_req, res: Response): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const brands = await db.select().from(brandsTable).orderBy(brandsTable.name);
  res.json(brands.map((b) => ({ id: b.id, name: b.name, createdAt: b.createdAt })));
});

// Admin: create brand
router.post("/brands", requireAuth, async (req, res: Response): Promise<void> => {
  const parsed = BrandInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Nombre de marca requerido" });
    return;
  }
  const [brand] = await db.insert(brandsTable).values({ name: parsed.data.name }).returning();
  res.status(201).json({ id: brand.id, name: brand.name, createdAt: brand.createdAt });
});

// Admin: rename brand
router.patch("/brands/:id", requireAuth, async (req, res: Response): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "No encontrado" }); return; }
  const parsed = BrandInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Nombre requerido" }); return; }
  const [brand] = await db
    .update(brandsTable)
    .set({ name: parsed.data.name })
    .where(eq(brandsTable.id, id))
    .returning();
  if (!brand) { res.status(404).json({ error: "Marca no encontrada" }); return; }
  res.json({ id: brand.id, name: brand.name, createdAt: brand.createdAt });
});

// Admin: delete brand
router.delete("/brands/:id", requireAuth, async (req, res: Response): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(404).json({ error: "No encontrado" }); return; }
  const deleted = await db.delete(brandsTable).where(eq(brandsTable.id, id)).returning();
  if (!deleted.length) { res.status(404).json({ error: "Marca no encontrada" }); return; }
  res.status(204).end();
});

export default router;
