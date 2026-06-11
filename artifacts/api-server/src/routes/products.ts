import { Router, type IRouter, type Request, type Response, type RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, productsTable, brandsTable } from "@workspace/db";
import { z } from "zod";

const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.session.authenticated) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  next();
};

const router: IRouter = Router();

function formatProduct(p: typeof productsTable.$inferSelect, brand?: typeof brandsTable.$inferSelect | null) {
  return {
    id: p.id,
    name: p.name,
    imageUrl: p.imageUrl ?? null,
    price: p.price ?? null,
    brandId: p.brandId ?? null,
    brandName: brand?.name ?? null,
    createdAt: p.createdAt,
  };
}

// Public: list all products with brand name
router.get("/products", async (_req, res: Response): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const rows = await db
    .select()
    .from(productsTable)
    .leftJoin(brandsTable, eq(productsTable.brandId, brandsTable.id))
    .orderBy(productsTable.createdAt);
  res.json(rows.map((r) => formatProduct(r.products, r.brands)));
});

// Admin: create product
const ProductInputSchema = z.object({
  name: z.string().optional().default("Producto sin nombre"),
  price: z.string().nullable().optional(),
  brandId: z.number().int().positive().nullable().optional(),
});

router.post(
  "/products",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = ProductInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [product] = await db
      .insert(productsTable)
      .values({
        name: parsed.data.name,
        price: parsed.data.price ?? null,
        brandId: parsed.data.brandId ?? null,
      })
      .returning();
    const brand = product.brandId
      ? (await db.select().from(brandsTable).where(eq(brandsTable.id, product.brandId)))[0]
      : null;
    res.status(201).json(formatProduct(product, brand));
  },
);

// Admin: update product
const ProductUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.string().nullable().optional(),
  brandId: z.number().int().positive().nullable().optional(),
});

router.patch(
  "/products/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

    const parsed = ProductUpdateSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.price !== undefined) updates.price = parsed.data.price ?? null;
    if (parsed.data.brandId !== undefined) updates.brandId = parsed.data.brandId ?? null;

    if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Sin cambios" }); return; }

    const [product] = await db
      .update(productsTable)
      .set(updates)
      .where(eq(productsTable.id, id))
      .returning();

    if (!product) { res.status(404).json({ error: "Producto no encontrado" }); return; }

    const brand = product.brandId
      ? (await db.select().from(brandsTable).where(eq(brandsTable.id, product.brandId)))[0]
      : null;
    res.json(formatProduct(product, brand));
  },
);

// Admin: delete product
router.delete(
  "/products/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    const [product] = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
    if (!product) { res.status(404).json({ error: "Producto no encontrado" }); return; }
    res.sendStatus(204);
  },
);

// Admin: set product image
const ImageUpdateSchema = z.object({ objectPath: z.string().min(1) });

router.post(
  "/products/:id/image",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

    const parsed = ImageUpdateSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "objectPath requerido" }); return; }

    const imageUrl = `/api/storage${parsed.data.objectPath}`;
    const [product] = await db
      .update(productsTable)
      .set({ imageUrl })
      .where(eq(productsTable.id, id))
      .returning();

    if (!product) { res.status(404).json({ error: "Producto no encontrado" }); return; }
    const brand = product.brandId
      ? (await db.select().from(brandsTable).where(eq(brandsTable.id, product.brandId)))[0]
      : null;
    res.json(formatProduct(product, brand));
  },
);

export default router;
