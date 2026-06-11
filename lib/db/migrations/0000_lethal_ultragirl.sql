CREATE TABLE IF NOT EXISTS "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image_url" text,
	"price" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
