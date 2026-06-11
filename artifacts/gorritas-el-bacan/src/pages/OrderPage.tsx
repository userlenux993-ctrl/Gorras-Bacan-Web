import { useParams } from "wouter";
import { useGetOrder } from "@workspace/api-client-react";
import { ShoppingBag, PackageOpen, CheckCircle2, ExternalLink } from "lucide-react";
import logoImg from "@assets/logo.png";

function formatOrderNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

function parsePrice(raw: string | null | undefined): number {
  if (!raw) return 0;
  const digits = raw.replace(/[^0-9,.]/g, "").replace(",", ".");
  return parseFloat(digits) || 0;
}

function formatPrice(raw: string | null | undefined): string {
  if (!raw) return "Consultar precio";
  return raw;
}

export default function OrderPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "", 10);

  const { data: order, isLoading, isError } = useGetOrder(id);

  if (isNaN(id) || isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center">
        <PackageOpen size={56} className="text-gray-300 mb-4" strokeWidth={1.2} />
        <h1 className="font-heading text-2xl font-black uppercase text-gray-700 mb-2">Pedido no encontrado</h1>
        <p className="text-gray-400 text-sm">Este enlace no corresponde a ningún pedido.</p>
        <a href="/" className="mt-6 text-primary font-bold underline text-sm">Ir a la tienda</a>
      </div>
    );
  }

  if (isLoading || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-gray-400 text-sm">Cargando pedido…</p>
      </div>
    );
  }

  const orderDate = new Date(order.createdAt).toLocaleString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasKnownPrices = order.items.some((item) => item.productPrice);
  const total = order.items.reduce((sum, item) => {
    return sum + parsePrice(item.productPrice) * item.quantity;
  }, 0);

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="bg-black text-white px-4 py-4 flex items-center gap-3">
        <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src={logoImg} alt="Gorritas El Bacán" className="h-10 w-auto" />
        </a>
        <div className="h-6 w-px bg-white/20" />
        <span className="text-sm font-semibold text-white/70 uppercase tracking-wider">Detalle de pedido</span>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Order header card */}
        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Pedido</p>
              <h1 className="font-heading text-4xl font-black tracking-tight text-black">
                {formatOrderNumber(order.id)}
              </h1>
              <p className="text-sm text-gray-400 mt-1">{orderDate}</p>
            </div>
            <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-200 text-xs font-bold uppercase tracking-wide flex-shrink-0">
              <CheckCircle2 size={14} />
              Recibido
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Productos ({order.items.reduce((s, i) => s + i.quantity, 0)} unidades)
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                {item.productImageUrl ? (
                  <img
                    src={item.productImageUrl}
                    alt={item.productName}
                    className="w-20 h-20 rounded-xl object-cover border border-gray-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                    <ShoppingBag size={28} className="text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-black text-base uppercase tracking-tight text-gray-900 truncate">
                    {item.productName}
                  </p>
                  <p className={`text-sm font-bold mt-0.5 ${item.productPrice ? "text-primary" : "text-gray-400"}`}>
                    {formatPrice(item.productPrice)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Cantidad: <span className="font-black text-gray-700">{item.quantity}</span>
                  </p>
                </div>
                {item.productPrice && (
                  <p className="font-black text-sm text-gray-900 flex-shrink-0 text-right">
                    {formatPrice(
                      item.productPrice
                        ? String(parsePrice(item.productPrice) * item.quantity)
                        : null,
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        {hasKnownPrices && total > 0 && (
          <div className="bg-black text-white rounded-2xl px-6 py-5 flex items-center justify-between">
            <p className="font-heading text-base font-black uppercase tracking-tight">Total estimado</p>
            <p className="font-heading text-2xl font-black">
              {total.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}
            </p>
          </div>
        )}

        {/* Notice */}
        {!hasKnownPrices && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-4 text-yellow-800 text-sm">
            Los precios serán confirmados por el vendedor al atender tu pedido.
          </div>
        )}

        {/* Back to store */}
        <div className="text-center pb-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
          >
            <ExternalLink size={14} />
            Ir a la tienda
          </a>
        </div>
      </main>
    </div>
  );
}
