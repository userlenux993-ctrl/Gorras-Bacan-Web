import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { SiWhatsapp } from "react-icons/si";
import {
  Phone,
  CheckCircle2,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  ShoppingBag,
  PackageOpen,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useCallback } from "react";
import { Router, Route, Switch } from "wouter";
import { useListProducts, useListBrands, useCreateOrder } from "@workspace/api-client-react";
import Admin from "./pages/Admin";
import OrderPage from "./pages/OrderPage";

import logoImg from "@assets/file_00000000d37471f5b3367ec64f885f1e_1780083866995.png";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnWindowFocus: true,
    },
  },
});

const WHATSAPP_NUMBER = "573161928106";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola, quiero información sobre las gorras")}`;

type ApiProduct = {
  id: number;
  name: string;
  imageUrl: string | null;
  price: string | null;
  brandId: number | null;
  brandName: string | null;
  createdAt: string;
};

type CartMap = Record<number, number>;

function buildWhatsappOrderLink(orderId: number): string {
  const orderUrl = `${window.location.origin}/pedido/${orderId}`;
  const orderNumber = `#${String(orderId).padStart(4, "0")}`;
  const body = [
    "Hola, hice un pedido en Gorritas El Bacán.",
    "",
    `Pedido ${orderNumber}`,
    "",
    "Ver pedido:",
    orderUrl,
  ].join("\n");
  // whatsapp:// opens the native app directly on iOS and Android without
  // intermediate web pages. Falls back gracefully to WhatsApp Desktop on PC.
  return `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(body)}`;
}

function CartDrawer({
  cart,
  products,
  onClose,
  onAdd,
  onRemove,
  onDelete,
}: {
  cart: CartMap;
  products: ApiProduct[];
  onClose: () => void;
  onAdd: (id: number) => void;
  onRemove: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const items = products.filter((p) => (cart[p.id] ?? 0) > 0);
  const totalItems = Object.values(cart).reduce((s, q) => s + q, 0);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const { mutateAsync: createOrder } = useCreateOrder();

  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        key="drawer"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl"
        data-testid="cart-drawer"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-black text-white">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-primary" />
            <span className="font-heading font-black text-lg uppercase tracking-tight">Tu Pedido</span>
            {totalItems > 0 && (
              <span className="ml-1 bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalItems}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            data-testid="button-close-cart"
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-4 py-16">
              <ShoppingBag size={56} strokeWidth={1.2} className="text-gray-200" />
              <div>
                <p className="font-bold text-gray-500 text-base">Tu carrito está vacío</p>
                <p className="text-sm mt-1">Agrega gorras desde el catálogo</p>
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {items.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100"
                  data-testid={`cart-item-${product.id}`}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag size={24} className="text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm uppercase tracking-tight text-gray-900 truncate">
                      {product.name}
                    </p>
                    {product.price && (
                      <p className="text-xs text-gray-500 mt-0.5">{product.price}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => onRemove(product.id)}
                        data-testid={`button-remove-${product.id}`}
                        className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors touch-manipulation"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-black text-base w-6 text-center tabular-nums">
                        {cart[product.id]}
                      </span>
                      <button
                        onClick={() => onAdd(product.id)}
                        data-testid={`button-add-more-${product.id}`}
                        className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors touch-manipulation"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => onDelete(product.id)}
                    data-testid={`button-delete-${product.id}`}
                    className="p-3 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 touch-manipulation"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white space-y-3">
          {items.length > 0 ? (
            <>
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between text-sm text-gray-600 border border-gray-100">
                <span className="font-medium">Total de artículos</span>
                <span className="font-black text-gray-900 text-base">{totalItems} gorras</span>
              </div>
              {sendError && (
                <p className="text-xs text-red-500 text-center">{sendError}</p>
              )}
              <button
                data-testid="button-send-order-whatsapp"
                disabled={sending}
                onClick={async () => {
                  setSending(true);
                  setSendError("");
                  try {
                    const orderItems = items.map((p) => ({
                      productId: p.id,
                      quantity: cart[p.id] ?? 1,
                    }));
                    const order = await createOrder({ data: { items: orderItems } });
                    const waLink = buildWhatsappOrderLink(order.id);
                    // window.location.href with a custom scheme (whatsapp://) is
                    // never treated as a popup by iOS Safari — no pre-open trick needed.
                    window.location.href = waLink;
                  } catch {
                    setSendError("No se pudo crear el pedido. Intenta de nuevo.");
                  } finally {
                    setSending(false);
                  }
                }}
                className="flex items-center justify-center gap-3 w-full py-4 bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-60 disabled:cursor-not-allowed text-black font-extrabold text-base rounded-full transition-all duration-200 shadow-lg shadow-green-200 active:scale-95 touch-manipulation"
              >
                {sending ? (
                  <span className="uppercase tracking-wide">Creando pedido…</span>
                ) : (
                  <>
                    <SiWhatsapp size={22} />
                    <span className="uppercase tracking-wide">Enviar pedido por WhatsApp</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-4 bg-black text-white font-bold text-sm rounded-full uppercase tracking-wide hover:bg-gray-900 transition-colors"
            >
              Ver catálogo
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}

type StoreView =
  | { screen: "brands" }
  | { screen: "brand"; brandId: number | null; brandName: string };

type ApiBrand = { id: number; name: string; createdAt: string };

function Home() {
  const [cart, setCart] = useState<CartMap>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [storeView, setStoreView] = useState<StoreView>({ screen: "brands" });
  const { data: apiProducts = [], isLoading: productsLoading } = useListProducts();
  const { data: apiBrands = [], isLoading: brandsLoading } = useListBrands();
  const products: ApiProduct[] = apiProducts as ApiProduct[];
  const brands: ApiBrand[] = apiBrands as ApiBrand[];
  const isLoading = productsLoading || brandsLoading;

  const totalItems = Object.values(cart).reduce((s, q) => s + q, 0);

  const addToCart = useCallback((id: number) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }, []);

  const removeOne = useCallback((id: number) => {
    setCart((prev) => {
      const current = prev[id] ?? 0;
      if (current <= 1) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: current - 1 };
    });
  }, []);

  const deleteItem = useCallback((id: number) => {
    setCart((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col font-sans overflow-x-hidden">
      {/* HEADER */}
      <header className="w-full relative bg-secondary text-secondary-foreground overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')",
          }}
        />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary opacity-20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-20 w-72 h-72 bg-primary opacity-10 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 md:px-6 pt-6 pb-20 md:pt-10 md:pb-32 relative z-10">
          <nav className="flex items-center justify-between mb-16 md:mb-24">
            <div className="flex items-center gap-3">
              <img
                src={logoImg}
                alt="Gorritas El Bacán"
                className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-primary shadow-lg"
                data-testid="img-logo"
              />
              <span className="font-heading font-extrabold text-xl md:text-2xl tracking-tight uppercase" data-testid="text-logo">
                Gorritas El Bacán
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors duration-200"
              >
                <SiWhatsapp className="text-[#25D366]" size={18} />
                +57 316 1928106
              </a>
              <button
                onClick={() => setCartOpen(true)}
                data-testid="button-open-cart"
                className="relative flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-full transition-all duration-200 font-bold text-sm"
              >
                <ShoppingCart size={18} />
                <span className="hidden sm:inline uppercase tracking-wide">Carrito</span>
                <AnimatePresence>
                  {totalItems > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-2 -right-2 bg-primary text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center"
                      data-testid="cart-badge"
                    >
                      {totalItems}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </nav>

          <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6"
            >
              <CheckCircle2 size={16} />
              <span className="text-sm font-bold uppercase tracking-wider">Distribuidores Oficiales</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-heading text-5xl md:text-7xl lg:text-8xl font-black uppercase leading-[0.95] tracking-tighter mb-6"
              data-testid="text-hero-headline"
            >
              Las mejores gorras{" "}
              <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-red-400">
                al detal y al por mayor
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-secondary-foreground/70 mb-10 max-w-2xl font-medium"
            >
              Estilo urbano, calidad premium. Desde una unidad hasta cajas completas para tu negocio.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3, type: "spring", stiffness: 200 }}
            >
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="button-hero-whatsapp"
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-5 bg-[#25D366] hover:bg-[#20bd5a] text-black font-extrabold text-lg rounded-full overflow-hidden transition-all duration-300 transform hover:scale-105 shadow-[0_0_40px_rgba(37,211,102,0.4)]"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                <SiWhatsapp size={28} className="relative z-10" />
                <span className="relative z-10 uppercase tracking-wide">Pedir información</span>
              </a>
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] rotate-180 transform">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="relative block w-[calc(100%+1.3px)] h-[50px] md:h-[80px]"
          >
            <path d="M1200 120L0 16.48V0h1200v120z" className="fill-background" />
          </svg>
        </div>
      </header>

      {/* CATALOG */}
      <section className="py-16 md:py-24 px-4 md:px-6 w-full relative">
        <div className="container mx-auto max-w-5xl">

          <AnimatePresence mode="wait">
            {storeView.screen === "brands" ? (
              /* ── BRAND LIST VIEW ────────────────────────────────────── */
              <motion.div
                key="brand-list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-12 md:mb-16">
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="font-heading text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4"
                    data-testid="text-catalog-title"
                  >
                    Nuestro Catálogo
                  </motion.h2>
                  <div className="w-24 h-1.5 bg-primary mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">Elige tu marca favorita</p>
                </div>

                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="rounded-3xl bg-gray-100 animate-pulse aspect-[4/3]" />
                    ))}
                  </div>
                ) : brands.length === 0 && products.filter(p => p.brandId === null).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400 gap-4">
                    <PackageOpen size={64} strokeWidth={1.2} className="text-gray-200" />
                    <p className="font-heading font-black text-xl uppercase text-gray-400">Catálogo próximamente</p>
                    <p className="text-sm text-gray-400">Pronto agregaremos nuestros productos aquí.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {brands.map((brand, index) => {
                      const brandProducts = products.filter((p) => p.brandId === brand.id);
                      const coverImg = brandProducts.find((p) => p.imageUrl)?.imageUrl ?? null;
                      return (
                        <motion.button
                          key={brand.id}
                          initial={{ opacity: 0, y: 24 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-40px" }}
                          transition={{ duration: 0.4, delay: index * 0.07 }}
                          onClick={() => setStoreView({ screen: "brand", brandId: brand.id, brandName: brand.name })}
                          className="group relative aspect-[4/3] rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 text-left w-full"
                        >
                          {/* Background */}
                          {coverImg ? (
                            <img
                              src={coverImg}
                              alt={brand.name}
                              className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
                          )}
                          {/* Dark overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 group-hover:from-black/70 transition-colors duration-300" />

                          {/* Content */}
                          <div className="absolute inset-0 flex flex-col justify-end p-5">
                            <p className="font-heading text-2xl md:text-3xl font-black uppercase tracking-tight text-white leading-tight mb-1">
                              {brand.name}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-white/70 text-sm font-medium">
                                {brandProducts.length} {brandProducts.length === 1 ? "gorra" : "gorras"}
                              </p>
                              <div className="flex items-center gap-1 text-white/80 text-sm font-bold group-hover:text-white transition-colors">
                                Ver <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}

                    {/* Unbranded card (if any products without brand) */}
                    {(() => {
                      const unbrandedProducts = products.filter((p) => p.brandId === null);
                      if (unbrandedProducts.length === 0) return null;
                      const coverImg = unbrandedProducts.find((p) => p.imageUrl)?.imageUrl ?? null;
                      return (
                        <motion.button
                          initial={{ opacity: 0, y: 24 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-40px" }}
                          transition={{ duration: 0.4, delay: brands.length * 0.07 }}
                          onClick={() => setStoreView({ screen: "brand", brandId: null, brandName: "Otros" })}
                          className="group relative aspect-[4/3] rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 text-left w-full"
                        >
                          {coverImg ? (
                            <img src={coverImg} alt="Otros" className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-500 to-gray-700" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                          <div className="absolute inset-0 flex flex-col justify-end p-5">
                            <p className="font-heading text-2xl font-black uppercase tracking-tight text-white mb-1">Otros</p>
                            <div className="flex items-center justify-between">
                              <p className="text-white/70 text-sm font-medium">{unbrandedProducts.length} {unbrandedProducts.length === 1 ? "gorra" : "gorras"}</p>
                              <div className="flex items-center gap-1 text-white/80 text-sm font-bold group-hover:text-white transition-colors">
                                Ver <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })()}
                  </div>
                )}
              </motion.div>
            ) : (
              /* ── SINGLE BRAND PRODUCT VIEW ──────────────────────────── */
              <motion.div
                key={`brand-${storeView.brandId}`}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.3 }}
              >
                {/* Back + brand title */}
                <div className="mb-10">
                  <button
                    onClick={() => setStoreView({ screen: "brands" })}
                    className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-6 group"
                  >
                    <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    Volver a marcas
                  </button>
                  <div className="flex items-center gap-4">
                    <h2
                      className="font-heading text-4xl md:text-5xl font-black uppercase tracking-tighter"
                      data-testid="text-catalog-title"
                    >
                      {storeView.brandName}
                    </h2>
                    <div className="flex-1 h-1 bg-primary rounded-full max-w-[80px]" />
                  </div>
                </div>

                {(() => {
                  const viewId = storeView.screen === "brand" ? storeView.brandId : null;
                  const brandProducts = products.filter((p) => p.brandId === viewId);

                  if (brandProducts.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400 gap-4">
                        <ShoppingBag size={64} strokeWidth={1.2} className="text-gray-200" />
                        <p className="font-heading font-black text-xl uppercase">Sin gorras todavía</p>
                        <p className="text-sm">Pronto agregaremos productos en esta categoría.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                      {brandProducts.map((product, index) => {
                        const qty = cart[product.id] ?? 0;
                        const inCart = qty > 0;
                        return (
                          <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-40px" }}
                            transition={{ duration: 0.4, delay: index * 0.07 }}
                            className="group flex flex-col bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                            data-testid={`card-product-${product.id}`}
                          >
                            <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                  <ShoppingBag size={48} className="text-gray-200" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300 pointer-events-none" />
                              <AnimatePresence>
                                {inCart && (
                                  <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    className="absolute top-3 right-3 bg-primary text-white text-sm font-black px-2.5 py-1 rounded-full shadow-lg"
                                  >
                                    {qty} en carrito
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            <div className="p-4 md:p-5 flex flex-col flex-grow items-center text-center gap-3 border-t border-border/30">
                              <h3 className="font-heading text-lg md:text-xl font-bold uppercase text-card-foreground">
                                {product.name}
                              </h3>
                              <p className={`font-black text-lg -mt-1 ${product.price ? "text-primary" : "text-gray-400"}`}>
                                {product.price ?? "Consultar precio"}
                              </p>

                              {inCart ? (
                                <div className="flex items-center gap-3 w-full justify-center">
                                  <button
                                    onClick={() => removeOne(product.id)}
                                    data-testid={`button-qty-minus-${product.id}`}
                                    className="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors border border-gray-200 touch-manipulation"
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <span className="font-black text-xl w-8 text-center tabular-nums" data-testid={`text-qty-${product.id}`}>
                                    {qty}
                                  </span>
                                  <button
                                    onClick={() => addToCart(product.id)}
                                    data-testid={`button-qty-plus-${product.id}`}
                                    className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors touch-manipulation"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addToCart(product.id)}
                                  data-testid={`button-add-to-cart-${product.id}`}
                                  className="inline-flex items-center justify-center gap-2 px-4 py-3 w-full text-sm font-bold text-white bg-primary hover:bg-red-700 rounded-full transition-colors duration-200 uppercase tracking-wide shadow-sm active:scale-95 touch-manipulation"
                                >
                                  <ShoppingCart size={16} />
                                  <span>Agregar al carrito</span>
                                </button>
                              )}

                              {inCart && (
                                <button
                                  onClick={() => setCartOpen(true)}
                                  data-testid={`button-view-cart-${product.id}`}
                                  className="text-xs text-primary font-bold hover:underline uppercase tracking-wide"
                                >
                                  Ver carrito
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sticky send-order bar on mobile */}
          <AnimatePresence>
            {totalItems > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 60 }}
                transition={{ type: "spring", damping: 24, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-3 bg-white/80 backdrop-blur-md border-t border-gray-200 flex items-center justify-between gap-3 md:hidden"
              >
                <span className="text-sm font-bold text-gray-700">
                  {totalItems} {totalItems === 1 ? "gorra" : "gorras"} en el carrito
                </span>
                <button
                  onClick={() => setCartOpen(true)}
                  data-testid="button-open-cart-sticky"
                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-black font-extrabold text-sm px-5 py-3 rounded-full transition-colors active:scale-95 touch-manipulation"
                >
                  <SiWhatsapp size={18} />
                  Enviar pedido
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black text-white pt-20 pb-10 px-4 md:px-6 relative overflow-hidden mt-auto">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-10 mb-16 text-center md:text-left">
            <div className="flex flex-col items-center md:items-start">
              <div className="flex items-center gap-3 mb-4 text-white">
                <img src={logoImg} alt="Gorritas El Bacán" className="w-12 h-12 rounded-full object-cover border-2 border-primary shadow-lg" />
                <span className="font-heading font-black text-2xl uppercase tracking-tighter">Gorritas El Bacán</span>
              </div>
              <p className="text-white/60 font-medium tracking-wide uppercase text-sm mb-6">Al detal y al por mayor</p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-4">
              <h4 className="font-heading font-bold text-lg uppercase tracking-wide">Contáctanos</h4>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white hover:text-primary transition-colors text-xl font-bold">
                <SiWhatsapp className="text-[#25D366]" size={24} />
                +57 316 1928106
              </a>
              <a href="tel:+573161928106" className="flex items-center gap-3 text-white/70 hover:text-white transition-colors">
                <Phone size={18} />
                Llamar ahora
              </a>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-white/40 uppercase tracking-widest">
            <p>&copy; {new Date().getFullYear()} Gorritas El Bacán. Todos los derechos reservados.</p>
            <p>Diseñado en Medellín</p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <motion.a
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 200 }}
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="button-floating-whatsapp"
        className={`fixed right-6 md:bottom-10 md:right-10 w-16 h-16 md:w-20 md:h-20 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full flex items-center justify-center shadow-[0_4px_30px_rgba(37,211,102,0.5)] hover:shadow-[0_8px_40px_rgba(37,211,102,0.6)] transition-all duration-300 z-20 hover:scale-110 ${totalItems > 0 ? "bottom-24" : "bottom-6"}`}
        aria-label="Contactar por WhatsApp"
      >
        <SiWhatsapp size={32} className="md:w-10 md:h-10" />
      </motion.a>

      {/* Cart drawer */}
      <AnimatePresence>
        {cartOpen && (
          <CartDrawer
            cart={cart}
            products={products as ApiProduct[]}
            onClose={() => setCartOpen(false)}
            onAdd={addToCart}
            onRemove={removeOne}
            onDelete={deleteItem}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router>
          <Switch>
            <Route path="/admin" component={Admin} />
            <Route path="/pedido/:id" component={OrderPage} />
            <Route component={Home} />
          </Switch>
        </Router>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
