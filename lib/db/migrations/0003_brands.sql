CREATE TABLE IF NOT EXISTS "brands" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brand_id" integer REFERENCES "brands"("id") ON DELETE SET NULL;
