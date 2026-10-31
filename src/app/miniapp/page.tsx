"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownToLine, Boxes, CheckCircle2, Clock3, Package, RefreshCw, Search, ShoppingBag, TriangleAlert } from "lucide-react";
import "./miniapp.css";

type Product = {
  id: string; slug: string; name: string; category: string; imageUrl: string | null;
  size: string | null; stock: number; reservedStock: number; availableStock: number;
  isPublished: boolean; lowStock: boolean;
};
type Order = { orderNumber: string; customerName: string; total: number; status: string; itemCount: number; createdAt: string };
type Dashboard = {
  operator: { name: string };
  summary: { productCount: number; totalUnits: number; reservedUnits: number; availableUnits: number; lowStockCount: number; pendingOrders: number };
  products: Product[]; orders: Order[];
};

declare global {
  interface Window {
    Telegram?: { WebApp?: {
      ready: () => void; expand: () => void; close: () => void;
      initData: string; initDataUnsafe?: { user?: { first_name?: string } };
      setHeaderColor?: (color: string) => void; setBackgroundColor?: (color: string) => void;
    } };
  }
}

export default function MilanoMiniAppPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("24");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const initData = useCallback(() => window.Telegram?.WebApp?.initData || "", []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/telegram/miniapp", {
        headers: { "x-telegram-init-data": initData() },
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load dashboard.");
      setDashboard(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to connect.");
    } finally {
      setLoading(false);
    }
  }, [initData]);

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    window.Telegram?.WebApp?.setHeaderColor?.("#073d2e");
    window.Telegram?.WebApp?.setBackgroundColor?.("#f5f7f3");
    void loadDashboard();
  }, [loadDashboard]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (dashboard?.products || []).filter((product) =>
      !term || product.name.toLowerCase().includes(term) || product.category.toLowerCase().includes(term) || product.slug.toLowerCase().includes(term)
    );
  }, [dashboard, query]);

  async function restock() {
    if (!selected) return;
    const amount = Number(quantity);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000) {
      setNotice("Enter a whole number greater than zero.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/telegram/miniapp", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-telegram-init-data": initData() },
        body: JSON.stringify({ productId: selected.id, quantity: amount }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Restock failed.");
      setNotice(`${payload.product}: added ${payload.added}. New available stock: ${payload.availableStock}.`);
      setSelected(null);
      await loadDashboard();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Restock failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mf-admin">
      <header className="mf-topbar">
        <div><div className="mf-brand">MILANO <span>FOODS</span></div><p>Inventory management</p></div>
        <button className="mf-refresh" onClick={() => void loadDashboard()} aria-label="Refresh dashboard"><RefreshCw size={18}/></button>
      </header>

      <section className="mf-welcome">
        <div><span className="mf-kicker">MANAGEMENT PANEL</span><h1>Good to see you{dashboard?.operator.name ? `, ${dashboard.operator.name.split(" ")[0]}` : ""}.</h1><p>Keep your products and stock under control.</p></div>
        <div className="mf-live"><span/> LIVE INVENTORY</div>
      </section>

      {notice && <div className="mf-notice" role="status"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}
      {error && <div className="mf-error">{error}<button onClick={() => void loadDashboard()}>Retry</button></div>}

      <section className="mf-stats">
        <Stat icon={<Package/>} label="Products" value={dashboard?.summary.productCount} loading={loading}/>
        <Stat icon={<Boxes/>} label="Total units" value={dashboard?.summary.totalUnits} loading={loading}/>
        <Stat icon={<Activity/>} label="Available" value={dashboard?.summary.availableUnits} loading={loading}/>
        <Stat icon={<TriangleAlert/>} label="Low stock" value={dashboard?.summary.lowStockCount} warning loading={loading}/>
      </section>

      <section className="mf-section">
        <div className="mf-section-heading"><div><span className="mf-kicker">CATALOGUE</span><h2>Products & inventory</h2></div><span className="mf-count">{filteredProducts.length} items</span></div>
        <label className="mf-search"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products or categories"/></label>
        <div className="mf-products">
          {loading && !dashboard ? <div className="mf-empty">Loading inventory…</div> : filteredProducts.map((product) => (
            <article className="mf-product" key={product.id}>
              <div className="mf-product-image">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <div className="mf-product-placeholder"><Package size={28}/></div>}<span className={product.lowStock ? "mf-stock-tag is-low" : "mf-stock-tag"}>{product.lowStock ? "LOW STOCK" : "IN STOCK"}</span></div>
              <div className="mf-product-body"><span className="mf-category">{product.category}{product.size ? ` · ${product.size}` : ""}</span><h3>{product.name}</h3><div className="mf-stock-numbers"><div><strong>{product.availableStock}</strong><small>Available</small></div><div><strong>{product.stock}</strong><small>Total stock</small></div><div><strong>{product.reservedStock}</strong><small>Reserved</small></div></div><button className="mf-restock" onClick={() => { setSelected(product); setQuantity("24"); }}> <ArrowDownToLine size={16}/> Restock product</button></div>
            </article>
          ))}
          {!loading && filteredProducts.length === 0 && <div className="mf-empty">No matching products found.</div>}
        </div>
      </section>

      <section className="mf-section mf-orders-section">
        <div className="mf-section-heading"><div><span className="mf-kicker">SALES ACTIVITY</span><h2>Recent orders</h2></div><span className="mf-count">{dashboard?.summary.pendingOrders || 0} pending</span></div>
        <div className="mf-orders">
          {(dashboard?.orders || []).map((order) => <article className="mf-order" key={order.orderNumber}><div className="mf-order-icon"><ShoppingBag size={18}/></div><div className="mf-order-main"><strong>{order.orderNumber}</strong><span>{order.customerName} · {order.itemCount} item(s)</span><small><Clock3 size={12}/> {new Date(order.createdAt).toLocaleString()}</small></div><div className="mf-order-total"><strong>ETB {order.total.toLocaleString("en-ET")}</strong><span className={order.status === "PENDING" ? "mf-status pending" : "mf-status"}>{order.status.replaceAll("_", " ")}</span></div></article>)}
          {!loading && !dashboard?.orders.length && <div className="mf-empty">No orders yet.</div>}
        </div>
      </section>

      {selected && <div className="mf-modal-backdrop" onClick={() => !saving && setSelected(null)}><section className="mf-modal" role="dialog" aria-modal="true" aria-labelledby="restock-title" onClick={(e) => e.stopPropagation()}><button className="mf-modal-close" onClick={() => setSelected(null)} disabled={saving}>×</button><span className="mf-kicker">INVENTORY UPDATE</span><h2 id="restock-title">Restock product</h2><p>{selected.name}</p><div className="mf-current-stock">Current available stock <strong>{selected.availableStock}</strong></div><label className="mf-quantity-label">Quantity to add<input type="number" min="1" max="100000" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric"/></label><div className="mf-modal-actions"><button className="mf-cancel" onClick={() => setSelected(null)} disabled={saving}>Cancel</button><button className="mf-confirm" onClick={() => void restock()} disabled={saving}>{saving ? "Updating…" : "Confirm restock"}</button></div></section></div>}
      <footer className="mf-footer">MILANO FOODS <span>·</span> INTERNAL MANAGEMENT</footer>
    </main>
  );
}

function Stat({ icon, label, value, loading, warning = false }: { icon: React.ReactNode; label: string; value?: number; loading: boolean; warning?: boolean }) {
  return <article className={warning ? "mf-stat is-warning" : "mf-stat"}><div className="mf-stat-icon">{icon}</div><span>{label}</span><strong>{loading && value === undefined ? "—" : (value ?? 0).toLocaleString("en-ET")}</strong></article>;
}
