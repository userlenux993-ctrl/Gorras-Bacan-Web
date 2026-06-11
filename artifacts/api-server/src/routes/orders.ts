import { Router, type IRouter, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, productsTable, ordersTable, orderItemsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const CreateOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
});

// Public: create order
router.post("/orders", async (req, res: Response): Promise<void> => {
  const parsed = CreateOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos de pedido inválidos" });
    return;
  }

  const { items } = parsed.data;

  // Fetch all products in one query
  const productIds = items.map((i) => i.productId);
  const foundProducts = await db
    .select()
    .from(productsTable)
    .then((rows) => rows.filter((r) => productIds.includes(r.id)));

  const productMap = new Map(foundProducts.map((p) => [p.id, p]));

  // Insert order
  const [order] = await db.insert(ordersTable).values({}).returning();

  // Insert items with product snapshots
  const itemRows = items.map((item) => {
    const product = productMap.get(item.productId);
    return {
      orderId: order.id,
      productId: product?.id ?? null,
      productName: product?.name ?? "Producto desconocido",
      productImageUrl: product?.imageUrl ?? null,
      productPrice: product?.price ?? null,
      quantity: item.quantity,
    };
  });

  await db.insert(orderItemsTable).values(itemRows);

  res.status(201).json({
    id: order.id,
    createdAt: order.createdAt,
  });
});

// Public: get order detail
router.get("/orders/:id", async (req, res: Response): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(404).json({ error: "Pedido no encontrado" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, id));

  if (!order) {
    res.status(404).json({ error: "Pedido no encontrado" });
    return;
  }

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, id));

  res.json({
    id: order.id,
    createdAt: order.createdAt,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productImageUrl: item.productImageUrl,
      productPrice: item.productPrice,
      quantity: item.quantity,
    })),
  });
});

export default router;
