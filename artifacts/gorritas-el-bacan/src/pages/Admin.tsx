import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getListProductsQueryKey,
  useListBrands,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
  getListBrandsQueryKey,
} from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Upload,
  ImagePlus,
  Lock,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ChevronRight,
  ArrowLeft,
  FolderOpen,
  Tag,
  Package,
} from "lucide-react";
import logoImg from "@assets/logo.png";

type Product = {
  id: number;
  name: string;
  imageUrl: string | null;
  price: string | null;
  brandId: number | null;
  brandName: string | null;
  createdAt: string;
};

type Brand = {
  id: number;
  name: string;
  createdAt: string;
};

// View state: brand list, or inside a brand (brandId=null → unbranded)
type AdminView =
  | { screen: "brands" }
  | { screen: "brand-detail"; brandId: number | null; brandName: string };

// Base URL for all API calls — empty string = same origin (dev/Replit),
// or the Replit deployment URL when VITE_API_BASE_URL is set (Vercel frontend).
const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "").replace(/\/$/, "");

// ── auth helpers ──────────────────────────────────────────────────────────────
async function apiLogin(username: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Error al iniciar sesión");
  }
  return res.json();
}

async function apiLogout() {
  await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
}

async function apiGetMe(): Promise<{ authenticated: boolean }> {
  const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
  return res.json();
}

async function apiUploadImage(productId: number, file: File): Promise<Product> {
  const urlRes = await fetch(`${API_BASE}/api/storage/uploads/request-url`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!urlRes.ok) {
    const body = await urlRes.json().catch(() => ({}));
    throw new Error(body.error ?? "Error al solicitar URL de subida");
  }
  const { uploadURL, objectPath } = await urlRes.json();
  const gcsRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!gcsRes.ok) throw new Error("Error al subir imagen a Cloud Storage");
  const imgRes = await fetch(`${API_BASE}/api/products/${productId}/image`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectPath }),
  });
  if (!imgRes.ok) {
    const body = await imgRes.json().catch(() => ({}));
    throw new Error(body.error ?? "Error al guardar imagen");
  }
  return imgRes.json();
}

// ── LoginPage ─────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiLogin(username, password);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8 gap-3">
          <img src={logoImg} alt="Gorritas El Bacán" className="w-20 h-20 rounded-full object-cover border-2 border-primary shadow-xl" />
          <div className="text-center">
            <h1 className="text-white font-black text-2xl uppercase tracking-tight">Panel Admin</h1>
            <p className="text-white/40 text-sm mt-1">Gorritas El Bacán</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Lock size={18} className="text-primary" />
            <h2 className="font-bold text-gray-800 text-base uppercase tracking-wide">Iniciar sesión</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-gray-900 font-medium text-sm"
                data-testid="input-username"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-gray-900 font-medium text-sm"
                data-testid="input-password"
                required
                autoComplete="current-password"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm"
                  data-testid="text-login-error"
                >
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              data-testid="button-login"
              className="w-full py-3.5 bg-primary hover:bg-red-700 disabled:opacity-60 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              {loading ? "Entrando..." : "Entrar al panel"}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          <a href="/" className="hover:text-white/40 transition-colors">← Volver a la tienda</a>
        </p>
      </motion.div>
    </div>
  );
}

// ── AddProductModal ───────────────────────────────────────────────────────────
function AddProductModal({
  defaultBrandId,
  onClose,
  onAdd,
}: {
  defaultBrandId: number | null;
  onClose: () => void;
  onAdd: (name: string, price: string | null, file: File | null) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onAdd(name.trim(), price.trim() || null, file);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al agregar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl shadow-2xl p-6 max-w-sm mx-auto overflow-y-auto max-h-[90vh]"
        data-testid="modal-add-product"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">Agregar gorra</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-video rounded-2xl border-2 border-dashed border-gray-200 hover:border-primary transition-colors cursor-pointer overflow-hidden flex items-center justify-center bg-gray-50"
            data-testid="dropzone-image"
          >
            {preview ? (
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <ImagePlus size={32} strokeWidth={1.2} />
                <span className="text-sm font-medium">Agregar foto (opcional)</span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} data-testid="input-new-image" />

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nombre (opcional)</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Snapback Premium"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-medium"
              data-testid="input-new-name"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Precio (opcional)</label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ej: $45.000"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-medium"
              data-testid="input-new-price"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-red-500 text-sm font-medium flex items-center gap-1.5"
              >
                <AlertCircle size={14} /> {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            data-testid="button-confirm-add"
            className="w-full py-3.5 bg-primary hover:bg-red-700 disabled:opacity-60 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            {loading ? "Guardando..." : "Agregar al catálogo"}
          </button>
        </form>
      </motion.div>
    </>
  );
}

// ── CreateBrandModal ──────────────────────────────────────────────────────────
function CreateBrandModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setLoading(true);
    try {
      await onCreate(name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear marca");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl shadow-2xl p-6 max-w-sm mx-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">Nueva marca</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nombre de la marca</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Oakley, Nike, New Era…"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-medium"
              required
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-red-500 text-sm font-medium flex items-center gap-1.5"
              >
                <AlertCircle size={14} /> {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3.5 bg-primary hover:bg-red-700 disabled:opacity-60 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Tag size={18} />}
            {loading ? "Creando..." : "Crear marca"}
          </button>
        </form>
      </motion.div>
    </>
  );
}

// ── ProductCard ───────────────────────────────────────────────────────────────
function ProductCard({
  product,
  onImageUpload,
  onNameSave,
  onPriceSave,
  onDelete,
}: {
  product: Product;
  onImageUpload: (id: number, file: File) => Promise<void>;
  onNameSave: (id: number, name: string) => Promise<void>;
  onPriceSave: (id: number, price: string | null) => Promise<void>;
  onDelete: (id: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [nameVal, setNameVal] = useState(product.name);
  const [priceVal, setPriceVal] = useState(product.price ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { await onImageUpload(product.id, file); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function saveName() {
    if (!nameVal.trim()) return;
    setSaving(true);
    try { await onNameSave(product.id, nameVal.trim()); setEditingName(false); }
    finally { setSaving(false); }
  }

  async function savePrice() {
    setSaving(true);
    try { await onPriceSave(product.id, priceVal.trim() || null); setEditingPrice(false); }
    finally { setSaving(false); }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col"
      data-testid={`admin-card-${product.id}`}
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-50 group">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300">
            <ImagePlus size={36} strokeWidth={1.2} />
            <span className="text-xs font-medium">Sin imagen</span>
          </div>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
        >
          {uploading
            ? <Loader2 size={24} className="text-white animate-spin" />
            : <Upload size={24} className="text-white" />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Name */}
        {editingName ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
              className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-primary/40 focus:outline-none focus:border-primary font-medium"
            />
            <button onClick={saveName} disabled={saving} className="p-1.5 bg-primary text-white rounded-lg hover:bg-red-700 transition-colors">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            </button>
            <button onClick={() => { setEditingName(false); setNameVal(product.name); }} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-left text-sm font-bold text-gray-900 hover:text-primary transition-colors uppercase tracking-tight leading-tight group flex items-start gap-1"
          >
            <span className="flex-1 line-clamp-2">{product.name}</span>
            <Pencil size={11} className="mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
          </button>
        )}

        {/* Price */}
        {editingPrice ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={priceVal}
              onChange={(e) => setPriceVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") savePrice(); if (e.key === "Escape") setEditingPrice(false); }}
              placeholder="Ej: $45.000"
              className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-primary/40 focus:outline-none focus:border-primary"
            />
            <button onClick={savePrice} disabled={saving} className="p-1.5 bg-primary text-white rounded-lg hover:bg-red-700 transition-colors">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            </button>
            <button onClick={() => { setEditingPrice(false); setPriceVal(product.price ?? ""); }} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingPrice(true)}
            className={`text-left text-xs font-bold hover:text-primary transition-colors group flex items-center gap-1 ${product.price ? "text-primary" : "text-gray-300"}`}
          >
            <span>{product.price ?? "Agregar precio →"}</span>
            <Pencil size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        {/* Delete */}
        <div className="mt-auto pt-2 border-t border-gray-100">
          {confirmDelete ? (
            <div className="flex gap-2">
              <button
                onClick={() => { onDelete(product.id); setConfirmDelete(false); }}
                className="flex-1 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-lg transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              data-testid={`button-delete-product-${product.id}`}
              className="w-full py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 font-bold text-xs rounded-lg transition-colors uppercase tracking-wide flex items-center justify-center gap-1.5"
            >
              <Trash2 size={13} />
              Eliminar
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── BrandDetailView ───────────────────────────────────────────────────────────
// Shows products inside a specific brand (or "unbranded" if brandId === null)
function BrandDetailView({
  brandId,
  brandName,
  allProducts,
  onBack,
  onImageUpload,
  onNameSave,
  onPriceSave,
  onDelete,
  onAdd,
}: {
  brandId: number | null;
  brandName: string;
  allProducts: Product[];
  onBack: () => void;
  onImageUpload: (id: number, file: File) => Promise<void>;
  onNameSave: (id: number, name: string) => Promise<void>;
  onPriceSave: (id: number, price: string | null) => Promise<void>;
  onDelete: (id: number) => void;
  onAdd: (name: string, price: string | null, file: File | null) => Promise<void>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const products = allProducts.filter((p) => p.brandId === brandId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb / back */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition-colors"
        >
          <ArrowLeft size={16} />
          Marcas
        </button>
        <ChevronRight size={14} className="text-gray-300" />
        <div className="flex items-center gap-2">
          {brandId !== null ? <Tag size={16} className="text-primary" /> : <Package size={16} className="text-gray-400" />}
          <span className="font-black text-gray-900 text-base uppercase tracking-tight">{brandName}</span>
        </div>
      </div>

      {/* Products header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-400 text-sm">
          {products.length} {products.length === 1 ? "gorra" : "gorras"}
        </p>
        <button
          onClick={() => setShowAdd(true)}
          data-testid="button-add-product"
          className="flex items-center gap-2 bg-primary hover:bg-red-700 text-white font-bold text-sm px-4 py-2 rounded-full transition-colors"
        >
          <Plus size={16} />
          Agregar gorra
        </button>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
            <Plus size={36} className="text-gray-300" />
          </div>
          <div>
            <p className="font-bold text-gray-500 text-lg">Sin gorras todavía</p>
            <p className="text-gray-400 text-sm mt-1">Agrega la primera gorra de {brandName}</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-2 flex items-center gap-2 bg-primary text-white font-bold px-6 py-3 rounded-full hover:bg-red-700 transition-colors"
          >
            <Plus size={18} />
            Agregar primera gorra
          </button>
        </div>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onImageUpload={onImageUpload}
                onNameSave={onNameSave}
                onPriceSave={onPriceSave}
                onDelete={onDelete}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      <AnimatePresence>
        {showAdd && (
          <AddProductModal
            defaultBrandId={brandId}
            onClose={() => setShowAdd(false)}
            onAdd={onAdd}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── BrandListView ─────────────────────────────────────────────────────────────
// Main screen: shows all brands as cards
function BrandListView({
  brands,
  allProducts,
  onEnterBrand,
  onCreateBrand,
  onRenameBrand,
  onDeleteBrand,
}: {
  brands: Brand[];
  allProducts: Product[];
  onEnterBrand: (brandId: number | null, brandName: string) => void;
  onCreateBrand: (name: string) => Promise<void>;
  onRenameBrand: (id: number, name: string) => Promise<void>;
  onDeleteBrand: (id: number) => Promise<void>;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const unbrandedCount = allProducts.filter((p) => p.brandId === null).length;

  async function doRename(id: number) {
    if (!renameVal.trim()) return;
    setRenaming(true);
    try { await onRenameBrand(id, renameVal.trim()); setRenamingId(null); }
    finally { setRenaming(false); }
  }

  async function doDelete(id: number) {
    setDeleting(true);
    try { await onDeleteBrand(id); setConfirmDeleteId(null); }
    finally { setDeleting(false); }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-black text-gray-900 text-2xl uppercase tracking-tight">Marcas</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {brands.length} {brands.length === 1 ? "marca" : "marcas"} · {allProducts.length} gorras en total
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-red-700 text-white font-bold text-sm px-4 py-2.5 rounded-full transition-colors"
        >
          <Plus size={16} />
          Nueva marca
        </button>
      </div>

      {brands.length === 0 && unbrandedCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
            <Tag size={36} className="text-gray-300" />
          </div>
          <div>
            <p className="font-bold text-gray-500 text-xl">Crea tu primera marca</p>
            <p className="text-gray-400 text-sm mt-2 max-w-sm">
              Organiza tus gorras por marca. Ej: Oakley, Nike, New Era…
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-2 flex items-center gap-2 bg-primary text-white font-bold px-6 py-3 rounded-full hover:bg-red-700 transition-colors"
          >
            <Plus size={18} />
            Crear primera marca
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Brand cards */}
          <AnimatePresence>
            {brands.map((brand) => {
              const count = allProducts.filter((p) => p.brandId === brand.id).length;
              const isRenaming = renamingId === brand.id;
              const isConfirmDelete = confirmDeleteId === brand.id;

              return (
                <motion.div
                  key={brand.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  {isRenaming ? (
                    <div className="flex items-center gap-3 px-5 py-4">
                      <Tag size={18} className="text-primary flex-shrink-0" />
                      <input
                        autoFocus
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") doRename(brand.id); if (e.key === "Escape") setRenamingId(null); }}
                        className="flex-1 px-3 py-2 rounded-xl border border-primary/40 focus:outline-none focus:border-primary text-sm font-bold"
                      />
                      <button onClick={() => doRename(brand.id)} disabled={renaming} className="p-2 bg-primary text-white rounded-xl hover:bg-red-700 transition-colors">
                        {renaming ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                      <button onClick={() => setRenamingId(null)} className="p-2 text-gray-400 hover:text-gray-700 rounded-xl">
                        <X size={14} />
                      </button>
                    </div>
                  ) : isConfirmDelete ? (
                    <div className="flex items-center gap-3 px-5 py-4 bg-red-50">
                      <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                      <p className="flex-1 text-sm font-bold text-red-700">
                        ¿Eliminar &quot;{brand.name}&quot;? Las gorras quedarán sin marca.
                      </p>
                      <button onClick={() => doDelete(brand.id)} disabled={deleting} className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-xl transition-colors">
                        {deleting ? <Loader2 size={14} className="animate-spin" /> : null}
                        Eliminar
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 bg-white text-gray-600 font-bold text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <button
                        onClick={() => onEnterBrand(brand.id, brand.name)}
                        className="flex-1 flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Tag size={22} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-gray-900 text-lg uppercase tracking-tight group-hover:text-primary transition-colors">
                            {brand.name}
                          </p>
                          <p className="text-gray-400 text-sm mt-0.5">
                            {count} {count === 1 ? "gorra" : "gorras"}
                          </p>
                        </div>
                        <ChevronRight size={20} className="text-gray-300 group-hover:text-primary transition-colors flex-shrink-0" />
                      </button>
                      <div className="flex items-center gap-1 pr-4">
                        <button
                          onClick={() => { setRenamingId(brand.id); setRenameVal(brand.name); }}
                          className="p-2 text-gray-400 hover:text-primary transition-colors rounded-xl hover:bg-gray-100"
                          title="Renombrar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(brand.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50"
                          title="Eliminar marca"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Unbranded card */}
          {unbrandedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-dashed border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => onEnterBrand(null, "Sin marca")}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Package size={22} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-500 text-base uppercase tracking-tight group-hover:text-gray-700 transition-colors">
                    Sin marca
                  </p>
                  <p className="text-gray-400 text-sm mt-0.5">
                    {unbrandedCount} {unbrandedCount === 1 ? "gorra" : "gorras"}
                  </p>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
              </button>
            </motion.div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <CreateBrandModal
            onClose={() => setShowCreateModal(false)}
            onCreate={onCreateBrand}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── AdminDashboard ────────────────────────────────────────────────────────────
function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const queryClient = useQueryClient();
  const { data: products = [] } = useListProducts();
  const { data: brands = [] } = useListBrands();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const deleteBrand = useDeleteBrand();

  const [view, setView] = useState<AdminView>({ screen: "brands" });

  function invalidateProducts() {
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
  }
  function invalidateBrands() {
    queryClient.invalidateQueries({ queryKey: getListBrandsQueryKey() });
  }

  // ── product handlers
  const handleImageUpload = useCallback(async (id: number, file: File) => {
    await apiUploadImage(id, file);
    invalidateProducts();
  }, []);

  const handleNameSave = useCallback(async (id: number, name: string) => {
    await updateProduct.mutateAsync({ id, data: { name } });
    invalidateProducts();
  }, [updateProduct]);

  const handlePriceSave = useCallback(async (id: number, price: string | null) => {
    await updateProduct.mutateAsync({ id, data: { price } });
    invalidateProducts();
  }, [updateProduct]);

  const handleDelete = useCallback((id: number) => {
    deleteProduct.mutate({ id }, { onSuccess: invalidateProducts });
  }, [deleteProduct]);

  const handleAdd = useCallback(async (
    name: string,
    price: string | null,
    file: File | null,
    brandId: number | null,
  ) => {
    const created = await createProduct.mutateAsync({ data: { name, price, brandId } });
    if (file && created) await apiUploadImage(created.id, file);
    invalidateProducts();
  }, [createProduct]);

  // ── brand handlers
  const handleCreateBrand = useCallback(async (name: string) => {
    await createBrand.mutateAsync({ data: { name } });
    invalidateBrands();
  }, [createBrand]);

  const handleRenameBrand = useCallback(async (id: number, name: string) => {
    await updateBrand.mutateAsync({ id, data: { name } });
    invalidateBrands();
  }, [updateBrand]);

  const handleDeleteBrand = useCallback(async (id: number) => {
    await deleteBrand.mutateAsync({ id });
    invalidateBrands();
    invalidateProducts();
  }, [deleteBrand]);

  const isBrandDetail = view.screen === "brand-detail";
  const currentBrandId = isBrandDetail ? view.brandId : null;
  const currentBrandName = isBrandDetail ? view.brandName : "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-black text-white sticky top-0 z-10 shadow-xl">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Logo" className="w-10 h-10 rounded-full object-cover border-2 border-primary" />
            <div>
              <h1 className="font-black text-base uppercase tracking-tight">Panel Admin</h1>
              <p className="text-white/40 text-xs">Gorritas El Bacán</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 text-white/60 hover:text-white text-sm font-medium transition-colors px-2 py-2"
            >
              Ver tienda →
            </a>
            <button
              onClick={onLogout}
              data-testid="button-logout"
              className="flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium transition-colors px-2 py-2"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {view.screen === "brands" ? (
          <motion.div
            key="brand-list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <BrandListView
              brands={brands as Brand[]}
              allProducts={products as Product[]}
              onEnterBrand={(brandId, brandName) => setView({ screen: "brand-detail", brandId, brandName })}
              onCreateBrand={handleCreateBrand}
              onRenameBrand={handleRenameBrand}
              onDeleteBrand={handleDeleteBrand}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`brand-${currentBrandId}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <BrandDetailView
              brandId={currentBrandId}
              brandName={currentBrandName}
              allProducts={products as Product[]}
              onBack={() => setView({ screen: "brands" })}
              onImageUpload={handleImageUpload}
              onNameSave={handleNameSave}
              onPriceSave={handlePriceSave}
              onDelete={handleDelete}
              onAdd={(name, price, file) => handleAdd(name, price, file, currentBrandId)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Admin root ────────────────────────────────────────────────────────────────
export default function Admin() {
  const [authState, setAuthState] = useState<"loading" | "login" | "dashboard">("loading");

  useEffect(() => {
    apiGetMe()
      .then(({ authenticated }) => setAuthState(authenticated ? "dashboard" : "login"))
      .catch(() => setAuthState("login"));
  }, []);

  async function handleLogout() {
    await apiLogout();
    setAuthState("login");
  }

  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  if (authState === "login") return <LoginPage onLogin={() => setAuthState("dashboard")} />;

  return <AdminDashboard onLogout={handleLogout} />;
}
