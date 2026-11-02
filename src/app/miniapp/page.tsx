"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Activity, ArrowDownToLine, BarChart3, Boxes, CheckCheck, CheckCircle2, ChevronRight, Clock3, KeyRound, LayoutDashboard, LogOut, MessageSquare, Package, Phone, RefreshCw, Search, ShoppingBag, SlidersHorizontal, TriangleAlert } from "lucide-react";
import "./miniapp.css";
import "./miniapp-auth.css";
import "./miniapp-management.css";

type Product = {
  id: string; slug: string; name: string; category: string; imageUrl: string | null;
  size: string | null; price: number; stock: number; reservedStock: number; availableStock: number;
  isPublished: boolean; lowStock: boolean; stockMovements: StockMovement[]; priceChanges: PriceChange[];
};
type PriceChange = { id: string; previousPrice: number; newPrice: number; createdAt: string };
type StockMovement = {
  id: string; change: number; previousStock: number; newStock: number; reason: string;
  orderNumber: string | null; createdAt: string;
};
type Order = {
  orderNumber: string; customerName: string; customerPhone: string; customerEmail: string | null;
  fulfillment: string; city: string | null; deliveryAddress: string | null; pickupLocation: string | null;
  paymentPreference: string; notes: string | null; total: number; status: string; itemCount: number;
  items: { id: string; name: string; size: string | null; quantity: number; unitPrice: number; lineTotal: number }[];
  createdAt: string;
};
type PendingReview = {
  id: string; productName: string; displayName: string; rating: number; comment: string;
  orderNumber: string; createdAt: string;
};
type Dashboard = {
  operator: { name: string; authMethod?: "telegram" | "password" };
  summary: { productCount: number; totalUnits: number; reservedUnits: number; availableUnits: number; lowStockCount: number; pendingOrders: number; pendingReviews: number };
  products: Product[]; orders: Order[]; pendingReviews: PendingReview[];
};
type SalesPeriod = "daily" | "weekly" | "monthly" | "yearly";
type SalesReport = {
  period: SalesPeriod;
  start: string;
  end: string;
  totalUnits: number;
  totalRevenue: number;
  products: { productId: string | null; name: string; size: string | null; units: number; revenue: number }[];
};
type Section = "overview" | "inventory" | "orders" | "reviews" | "sales";

async function readApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `The server returned an unexpected page instead of data (HTTP ${response.status}). Refresh the Mini App and try again.`,
    );
  }

  try {
    return await response.json() as T;
  } catch {
    throw new Error("The server response was incomplete. Refresh the Mini App and try again.");
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: {
      ready: () => void; expand: () => void; close: () => void;
      initData: string; initDataUnsafe?: { user?: { first_name?: string } };
      isVersionAtLeast?: (version: string) => boolean;
      setHeaderColor?: (color: string) => void; setBackgroundColor?: (color: string) => void;
    } };
  }
}

export default function MilanoMiniAppPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loginRequired, setLoginRequired] = useState(false);
  const [phone, setPhone] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [passwordAuthenticated, setPasswordAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>("daily");
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState("");
  const [salesReload, setSalesReload] = useState(0);
  const [query, setQuery] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderStatus, setOrderStatus] = useState("ALL");
  const [inventoryFilter, setInventoryFilter] = useState("ALL");
  const [selected, setSelected] = useState<Product | null>(null);
  const [productDetails, setProductDetails] = useState<Product | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("24");
  const [priceDraft, setPriceDraft] = useState("");
  const [editingPrice, setEditingPrice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [notice, setNotice] = useState("");

  const initData = useCallback(() => window.Telegram?.WebApp?.initData || "", []);

  const loadDashboard = useCallback(async (): Promise<Dashboard | null> => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/telegram/miniapp", {
        headers: { "x-telegram-init-data": initData() },
        cache: "no-store",
      });
      const payload = await readApiResponse<Dashboard & { error?: string }>(response);
      if (response.status === 401) {
        setDashboard(null);
        setLoginRequired(true);
        return null;
      }
      if (!response.ok) throw new Error(payload.error || "Unable to load dashboard.");
      setDashboard(payload);
      setPasswordAuthenticated(payload.operator.authMethod === "password");
      setLoginRequired(false);
      return payload;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to connect.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [initData]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      const response = await fetch("/api/telegram/miniapp/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, passcode }),
      });
      const payload = await readApiResponse<{ ok?: boolean; error?: string }>(response);
      if (!response.ok) throw new Error(payload.error || "Unable to sign in.");
      setPasswordAuthenticated(true);
      setLoginRequired(false);
      setPasscode("");
      await loadDashboard();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function signOut() {
    setError("");
    try {
      const response = await fetch("/api/telegram/miniapp/auth", { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to sign out. Please try again.");
      setDashboard(null);
      setPasswordAuthenticated(false);
      setLoginRequired(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign out.");
    }
  }

  useEffect(() => {
    const telegramWebApp = window.Telegram?.WebApp;
    telegramWebApp?.ready();
    telegramWebApp?.expand();
    if (telegramWebApp?.isVersionAtLeast?.("6.1")) {
      telegramWebApp.setHeaderColor?.("#073d2e");
      telegramWebApp.setBackgroundColor?.("#f5f7f3");
    }
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (activeSection !== "sales") return;

    let cancelled = false;
    setSalesLoading(true);
    setSalesError("");
    setSalesReport(null);

    async function loadSalesReport() {
      try {
        const response = await fetch(`/api/telegram/miniapp/sales?period=${salesPeriod}`, {
          headers: { "x-telegram-init-data": initData() },
          cache: "no-store",
        });
        const report = await readApiResponse<SalesReport & { error?: string }>(response);
        if (!response.ok) throw new Error(report.error || "Unable to load sales report.");
        if (!cancelled) setSalesReport(report);
      } catch (err) {
        if (!cancelled) setSalesError(err instanceof Error ? err.message : "Unable to load sales report.");
      } finally {
        if (!cancelled) setSalesLoading(false);
      }
    }

    void loadSalesReport();
    return () => { cancelled = true; };
  }, [activeSection, initData, salesPeriod, salesReload]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (dashboard?.products || []).filter((product) =>
      (inventoryFilter === "ALL" ||
        (inventoryFilter === "LOW" && product.lowStock) ||
        (inventoryFilter === "OUT" && product.stock === 0)) &&
      (!term || product.name.toLowerCase().includes(term) || product.category.toLowerCase().includes(term) || product.slug.toLowerCase().includes(term))
    );
  }, [dashboard, inventoryFilter, query]);

  const filteredOrders = useMemo(() => {
    const term = orderQuery.trim().toLowerCase();
    return (dashboard?.orders || []).filter((order) =>
      (orderStatus === "ALL" || order.status === orderStatus) &&
      (!term || order.orderNumber.toLowerCase().includes(term) || order.customerName.toLowerCase().includes(term) || order.customerPhone.includes(term))
    );
  }, [dashboard, orderQuery, orderStatus]);

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
        body: JSON.stringify({ action: "restock", productId: selected.id, quantity: amount }),
      });
      const payload = await readApiResponse<{ product: string; added: number; availableStock: number; error?: string }>(response);
      if (!response.ok) throw new Error(payload.error || "Restock failed.");
      setNotice(`${payload.product}: added ${payload.added}. New available stock: ${payload.availableStock}.`);
      setSelected(null);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restock failed.");
    } finally {
      setSaving(false);
    }
  }

  async function manageAction(
    payload: Record<string, string>,
    successMessage: string,
    closeDetails = false,
  ) {
    setBusyAction(payload.orderNumber || payload.reviewId || payload.productId || payload.action || "action");
    setError("");
    try {
      const response = await fetch("/api/telegram/miniapp", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-telegram-init-data": initData() },
        body: JSON.stringify(payload),
      });
      const result = await readApiResponse<{ message?: string; error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "Action failed. Please try again.");
      if (closeDetails) setProductDetails(null);
      const refreshed = await loadDashboard();
      if (refreshed && productDetails) {
        setProductDetails(refreshed.products.find((product) => product.id === productDetails.id) || null);
      }
      setNotice(result.message || successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed. Please try again.");
    } finally {
      setBusyAction("");
    }
  }

  function openProductDetails(product: Product) {
    setProductDetails(product);
    setPriceDraft(String(product.price));
    setEditingPrice(false);
  }

  if (loginRequired) {
    return (
      <main className="mf-admin mf-login-page">
        <header className="mf-topbar">
          <div><div className="mf-brand">MILANO <span>FOODS</span></div><p>Inventory management</p></div>
        </header>
        <section className="mf-login-card">
          <span className="mf-kicker">MANAGEMENT PANEL</span>
          <h1>Admin sign in</h1>
          <p>Enter your administrator phone number and passcode to continue.</p>
          <form onSubmit={signIn}>
            <label><span>Phone number</span><div className="mf-login-input"><Phone size={17}/><input autoComplete="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required /></div></label>
            <label><span>Passcode</span><div className="mf-login-input"><KeyRound size={17}/><input type="password" autoComplete="current-password" value={passcode} onChange={(event) => setPasscode(event.target.value)} required /></div></label>
            {loginError && <p className="mf-login-error" role="alert">{loginError}</p>}
            <button type="submit" className="mf-login-submit" disabled={loginBusy}>{loginBusy ? "Signing in…" : "Sign in securely"}</button>
          </form>
        </section>
        <footer className="mf-footer">MILANO FOODS <span>·</span> INTERNAL MANAGEMENT</footer>
      </main>
    );
  }

  return (
    <main className="mf-admin">
      <header className="mf-topbar">
        <div><div className="mf-brand">MILANO <span>FOODS</span></div><p>Inventory management</p></div>
        <div className="mf-topbar-actions">
          {passwordAuthenticated && <button className="mf-signout" onClick={() => void signOut()} aria-label="Sign out"><LogOut size={16}/> Sign out</button>}
          <button className="mf-refresh" onClick={() => void loadDashboard()} aria-label="Refresh dashboard"><RefreshCw size={18}/></button>
        </div>
      </header>

      <section className="mf-welcome">
        <div><span className="mf-kicker">MANAGEMENT PANEL</span><h1>Good to see you{dashboard?.operator.name ? `, ${dashboard.operator.name.split(" ")[0]}` : ""}.</h1><p>Keep your products and stock under control.</p></div>
        <div className="mf-live"><span/> LIVE INVENTORY</div>
      </section>

      <nav className="mf-workspace-nav" aria-label="Management pages">
        {([
          { id: "overview", label: "Overview", icon: <LayoutDashboard size={16}/>, count: undefined },
          { id: "inventory", label: "Inventory", icon: <Package size={16}/>, count: dashboard?.summary.lowStockCount },
          { id: "orders", label: "Orders", icon: <ShoppingBag size={16}/>, count: dashboard?.summary.pendingOrders },
          { id: "reviews", label: "Reviews", icon: <MessageSquare size={16}/>, count: dashboard?.summary.pendingReviews },
          { id: "sales", label: "Sales", icon: <BarChart3 size={16}/>, count: undefined },
        ] as const).map((item) => (
          <button key={item.id} className={activeSection === item.id ? "mf-workspace-tab is-active" : "mf-workspace-tab"} onClick={() => setActiveSection(item.id)} aria-current={activeSection === item.id ? "page" : undefined}>
            {item.icon}<span>{item.label}</span>{item.count ? <span className="mf-tab-count">{item.count}</span> : null}
          </button>
        ))}
      </nav>

      {notice && <div className="mf-notice" role="status"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}
      {error && <div className="mf-error">{error}<button onClick={() => void loadDashboard()}>Retry</button></div>}

      {activeSection === "overview" && <>
      <section className="mf-stats">
        <Stat icon={<Package/>} label="Products" value={dashboard?.summary.productCount} loading={loading}/>
        <Stat icon={<Boxes/>} label="Total units" value={dashboard?.summary.totalUnits} loading={loading}/>
        <Stat icon={<Activity/>} label="Available" value={dashboard?.summary.availableUnits} loading={loading}/>
        <Stat icon={<TriangleAlert/>} label="Low stock" value={dashboard?.summary.lowStockCount} warning loading={loading}/>
      </section>

      <section className="mf-section mf-overview-section">
        <div className="mf-section-heading"><div><span className="mf-kicker">WORK QUEUE</span><h2>Needs your attention</h2></div><span className="mf-count">Live snapshot</span></div>
        <div className="mf-quick-grid">
          <button className="mf-quick-card" onClick={() => setActiveSection("orders")}><span className="mf-quick-icon is-orders"><ShoppingBag size={18}/></span><span><strong>{dashboard?.summary.pendingOrders ?? "—"} pending orders</strong><small>Review, confirm or reject orders</small></span><ChevronRight className="mf-quick-arrow" size={16}/></button>
          <button className="mf-quick-card" onClick={() => setActiveSection("reviews")}><span className="mf-quick-icon is-reviews"><MessageSquare size={18}/></span><span><strong>{dashboard?.summary.pendingReviews ?? "—"} reviews to moderate</strong><small>Approve to publish on the storefront</small></span><ChevronRight className="mf-quick-arrow" size={16}/></button>
          <button className="mf-quick-card" onClick={() => { setInventoryFilter("LOW"); setActiveSection("inventory"); }}><span className="mf-quick-icon is-stock"><TriangleAlert size={18}/></span><span><strong>{dashboard?.summary.lowStockCount ?? "—"} products low on stock</strong><small>Check available units and restock</small></span><ChevronRight className="mf-quick-arrow" size={16}/></button>
        </div>
      </section>

      <section className="mf-section mf-overview-section">
        <div className="mf-section-heading"><div><span className="mf-kicker">RECENT ACTIVITY</span><h2>Latest orders</h2></div><button className="mf-text-action" onClick={() => setActiveSection("orders")}>View all orders <CheckCheck size={14}/></button></div>
        <div className="mf-orders">
          {(dashboard?.orders || []).slice(0, 5).map((order) => <button className="mf-overview-order" key={order.orderNumber} onClick={() => { setActiveSection("orders"); setExpandedOrder(order.orderNumber); }}><span><strong>{order.orderNumber}</strong><small>{order.customerName} · {order.itemCount} unit(s)</small></span><span className={order.status === "PENDING" ? "mf-status pending" : "mf-status"}>{order.status.replaceAll("_", " ")}</span></button>)}
          {!loading && !dashboard?.orders.length && <div className="mf-empty">No recent orders yet.</div>}
        </div>
      </section>
      </>}

      {activeSection === "inventory" && <section className="mf-section">
        <div className="mf-section-heading"><div><span className="mf-kicker">CATALOGUE</span><h2>Inventory</h2></div><span className="mf-count">{filteredProducts.length} of {dashboard?.summary.productCount || 0}</span></div>
        <div className="mf-list-toolbar">
          <label className="mf-search"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or category"/></label>
          <label className="mf-filter-select"><SlidersHorizontal size={15}/><select value={inventoryFilter} onChange={(event) => setInventoryFilter(event.target.value)} aria-label="Filter inventory"><option value="ALL">All products</option><option value="LOW">Low stock</option><option value="OUT">Out of stock</option></select></label>
        </div>
        <div className="mf-products">
          {loading && !dashboard ? <div className="mf-empty">Loading inventory…</div> : filteredProducts.map((product) => (
            <article className="mf-product" key={product.id}>
              <div className="mf-product-image">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <div className="mf-product-placeholder"><Package size={28}/></div>}<span className={product.lowStock ? "mf-stock-tag is-low" : "mf-stock-tag"}>{product.lowStock ? "LOW STOCK" : "IN STOCK"}</span></div>
              <div className="mf-product-body">
                <span className="mf-category">{product.category}{product.size ? ` · ${product.size}` : ""}</span>
                <button className="mf-product-name" onClick={() => openProductDetails(product)}>{product.name}</button>
                <div className="mf-stock-numbers"><div><strong>{product.availableStock}</strong><small>Available</small></div><div><strong>{product.stock}</strong><small>Total stock</small></div><div><strong>{product.reservedStock}</strong><small>Reserved</small></div></div>
                <div className="mf-product-actions">
                  <button className="mf-restock" onClick={() => { setSelected(product); setQuantity("24"); }}><ArrowDownToLine size={16}/> Restock</button>
                  <button className="mf-detail-link" onClick={() => openProductDetails(product)}>Details & history</button>
                </div>
              </div>
            </article>
          ))}
          {!loading && filteredProducts.length === 0 && <div className="mf-empty">No matching products found.</div>}
        </div>
      </section>}

      {activeSection === "sales" && <section className="mf-section mf-sales-section">
        <div className="mf-section-heading">
          <div><span className="mf-kicker">REVENUE & PRODUCT PERFORMANCE</span><h2>Sales report</h2></div>
          <span className="mf-count">Ethiopia time</span>
        </div>
        <div className="mf-period-switcher" role="group" aria-label="Sales reporting period">
          {([
            ["daily", "Today"],
            ["weekly", "This week"],
            ["monthly", "This month"],
            ["yearly", "This year"],
          ] as const).map(([period, label]) => (
            <button key={period} type="button" className={salesPeriod === period ? "is-active" : ""} aria-pressed={salesPeriod === period} onClick={() => setSalesPeriod(period)}>{label}</button>
          ))}
        </div>
        {salesError && <div className="mf-error" role="alert">{salesError}<button onClick={() => setSalesReload((attempt) => attempt + 1)}>Retry</button></div>}
        <div className="mf-sales-summary">
          <article className="mf-sales-total"><span>Total sales</span><strong>{salesLoading && !salesReport ? "—" : `ETB ${(salesReport?.totalRevenue ?? 0).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</strong></article>
          <article><span>Units sold</span><strong>{salesLoading && !salesReport ? "—" : (salesReport?.totalUnits ?? 0).toLocaleString("en-ET")}</strong></article>
          <article><span>Products sold</span><strong>{salesLoading && !salesReport ? "—" : (salesReport?.products.length ?? 0).toLocaleString("en-ET")}</strong></article>
        </div>
        {salesReport && <p className="mf-sales-period">From {new Date(salesReport.start).toLocaleDateString()} through {new Date(salesReport.end).toLocaleDateString()}</p>}
        <div className="mf-sales-list">
          <div className="mf-sales-list-heading"><span>Product</span><span>Units sold</span><span>Avg. price</span><span>Revenue</span></div>
          {salesLoading && !salesReport && <div className="mf-empty">Loading sales report…</div>}
          {salesReport?.products.map((product) => (
            <article className="mf-sale-row" key={`${product.productId ?? "unlinked"}-${product.name}-${product.size ?? ""}`}>
              <strong className="mf-sale-name">{product.name}{product.size ? <small>{product.size}</small> : null}</strong>
              <span className="mf-sale-units"><small>Units</small>{product.units.toLocaleString("en-ET")}</span>
              <span className="mf-sale-average"><small>Avg. price</small>ETB {(product.units ? product.revenue / product.units : 0).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <strong className="mf-sale-revenue"><small>Revenue</small>ETB {product.revenue.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </article>
          ))}
          {!salesLoading && !salesError && salesReport?.products.length === 0 && <div className="mf-empty">No confirmed sales in this period.</div>}
        </div>
        <p className="mf-sales-note">Revenue and average prices use the prices recorded on each confirmed order, not current product prices.</p>
      </section>}

      {activeSection === "orders" && <section className="mf-section mf-orders-section">
        <div className="mf-section-heading"><div><span className="mf-kicker">SALES ACTIVITY</span><h2>Orders</h2></div><span className="mf-count">{filteredOrders.length} shown · {dashboard?.summary.pendingOrders || 0} pending</span></div>
        <div className="mf-list-toolbar">
          <label className="mf-search"><Search size={17}/><input value={orderQuery} onChange={(event) => setOrderQuery(event.target.value)} placeholder="Search order, name or phone"/></label>
          <label className="mf-filter-select"><SlidersHorizontal size={15}/><select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)} aria-label="Filter orders"><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="CONFIRMED">Confirmed</option><option value="PREPARING">Preparing</option><option value="READY_FOR_PICKUP">Ready for pickup</option><option value="OUT_FOR_DELIVERY">Out for delivery</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></label>
        </div>
        <div className="mf-orders">
          {filteredOrders.map((order) => (
            <article className="mf-order mf-order-expandable" key={order.orderNumber}>
              <button className="mf-order-summary" onClick={() => setExpandedOrder(expandedOrder === order.orderNumber ? null : order.orderNumber)} aria-expanded={expandedOrder === order.orderNumber}>
                <div className="mf-order-icon"><ShoppingBag size={18}/></div>
                <div className="mf-order-main"><strong>{order.orderNumber}</strong><span>{order.customerName} · {order.itemCount} item(s)</span><small><Clock3 size={12}/> {new Date(order.createdAt).toLocaleString()}</small></div>
                <div className="mf-order-total"><strong>ETB {order.total.toLocaleString("en-ET")}</strong><span className={order.status === "PENDING" ? "mf-status pending" : "mf-status"}>{order.status.replaceAll("_", " ")}</span></div>
              </button>
              {expandedOrder === order.orderNumber && (
                <div className="mf-order-details">
                  <div className="mf-order-contact"><strong>{order.customerName}</strong><a href={`tel:${order.customerPhone}`}>{order.customerPhone}</a>{order.customerEmail && <span>{order.customerEmail}</span>}</div>
                  <div><strong>{order.fulfillment === "DELIVERY" ? "Delivery" : "Pickup"}</strong><span>{order.fulfillment === "DELIVERY" ? [order.city, order.deliveryAddress].filter(Boolean).join(" · ") : order.pickupLocation || "Pickup"}</span></div>
                  <div><strong>Payment</strong><span>{order.paymentPreference}</span></div>
                  {order.notes && <div><strong>Order notes</strong><span>{order.notes}</span></div>}
                  <div className="mf-order-items">{order.items.map((item) => <div key={item.id}><span>{item.name}{item.size ? ` · ${item.size}` : ""} × {item.quantity}</span><strong>ETB {item.lineTotal.toLocaleString("en-ET")}</strong></div>)}</div>
                  <div className="mf-order-total-line"><span>Order total</span><strong>ETB {order.total.toLocaleString("en-ET")}</strong></div>
                  {order.status === "PENDING" && <div className="mf-order-actions">
                    <button className="mf-action-confirm" onClick={() => { if (window.confirm(`Confirm ${order.orderNumber}? This deducts the reserved stock.`)) void manageAction({ action: "order-confirm", orderNumber: order.orderNumber }, "Order confirmed."); }} disabled={busyAction === order.orderNumber}>Confirm order</button>
                    <button className="mf-action-reject" onClick={() => { if (window.confirm(`Reject ${order.orderNumber}? The reserved stock will be released.`)) void manageAction({ action: "order-reject", orderNumber: order.orderNumber }, "Order rejected."); }} disabled={busyAction === order.orderNumber}>Reject</button>
                  </div>}
                </div>
              )}
            </article>
          ))}
          {!loading && !filteredOrders.length && <div className="mf-empty">No orders match this search and status.</div>}
        </div>
      </section>}

      {activeSection === "reviews" && <section className="mf-section mf-reviews-section">
        <div className="mf-section-heading"><div><span className="mf-kicker">CUSTOMER FEEDBACK</span><h2>Reviews awaiting approval</h2></div><span className="mf-count">{dashboard?.summary.pendingReviews || 0} pending</span></div>
        <div className="mf-review-list">
          {(dashboard?.pendingReviews || []).map((review) => (
            <article className="mf-review-card" key={review.id}>
              <div className="mf-review-heading"><div><strong>{review.displayName}</strong><span>{review.productName} · Order {review.orderNumber}</span></div><span className="mf-review-rating" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div>
              <p>{review.comment}</p>
              <small>{new Date(review.createdAt).toLocaleString()}</small>
              <div className="mf-review-actions">
                <button className="mf-action-confirm" onClick={() => void manageAction({ action: "review-approve", reviewId: review.id }, "Review approved and published.")} disabled={busyAction === review.id}>Approve & publish</button>
                <button className="mf-action-reject" onClick={() => { if (window.confirm("Reject and remove this review?")) void manageAction({ action: "review-reject", reviewId: review.id }, "Review rejected."); }} disabled={busyAction === review.id}>Reject</button>
              </div>
            </article>
          ))}
          {!loading && !dashboard?.pendingReviews.length && <div className="mf-empty">No reviews waiting for approval.</div>}
        </div>
      </section>}

      {productDetails && <div className="mf-modal-backdrop" onClick={() => setProductDetails(null)}><section className="mf-modal mf-product-detail-modal" role="dialog" aria-modal="true" aria-labelledby="product-details-title" onClick={(event) => event.stopPropagation()}>
        <button className="mf-modal-close" onClick={() => setProductDetails(null)}>×</button>
        <span className="mf-kicker">PRODUCT INVENTORY</span><h2 id="product-details-title">{productDetails.name}</h2><p>{productDetails.category}{productDetails.size ? ` · ${productDetails.size}` : ""}</p>
        <div className="mf-price-panel"><div><span>Current retail price</span><strong>ETB {productDetails.price.toLocaleString("en-ET")}</strong></div><button className="mf-detail-link" onClick={() => { setPriceDraft(String(productDetails.price)); setEditingPrice(!editingPrice); }}>{editingPrice ? "Cancel edit" : "Change price"}</button></div>
        {editingPrice && <form className="mf-price-editor" onSubmit={(event) => { event.preventDefault(); void manageAction({ action: "update-price", productId: productDetails.id, price: priceDraft }, "Price updated."); }}>
          <label className="mf-quantity-label">New price (ETB)<input type="number" min="0.01" max="1000000000" step="0.01" inputMode="decimal" value={priceDraft} onChange={(event) => setPriceDraft(event.target.value)} required /></label>
          <button type="submit" className="mf-confirm" disabled={busyAction === productDetails.id}>{busyAction === productDetails.id ? "Saving…" : "Save price"}</button>
        </form>}
        <div className="mf-detail-stock"><div><strong>{productDetails.availableStock}</strong><span>Available</span></div><div><strong>{productDetails.stock}</strong><span>Total stock</span></div><div><strong>{productDetails.reservedStock}</strong><span>Reserved</span></div></div>
        <div className="mf-detail-actions">
          <button className="mf-restock" onClick={() => { setSelected(productDetails); setQuantity("24"); setProductDetails(null); }}><ArrowDownToLine size={16}/> Add stock</button>
          <button className="mf-action-reject" onClick={() => { if (window.confirm(`Set ${productDetails.name} stock to zero?`)) void manageAction({ action: "set-out-of-stock", productId: productDetails.id }, "Product marked out of stock.", true); }} disabled={productDetails.stock === 0 || productDetails.reservedStock > 0 || busyAction === productDetails.id}>{productDetails.reservedStock > 0 ? "Reserved units prevent this" : "Mark out of stock"}</button>
        </div>
        {productDetails.reservedStock > 0 && <p className="mf-stock-action-hint">This product has {productDetails.reservedStock} unit(s) reserved for pending orders. Reject or complete those orders before setting stock to zero.</p>}
        <div className="mf-history-heading"><strong>Stock history</strong><span>Latest {productDetails.stockMovements.length}</span></div>
        <div className="mf-history-list">
          {productDetails.stockMovements.map((movement) => <div className="mf-history-row" key={movement.id}><span className={movement.change > 0 ? "mf-history-change is-added" : "mf-history-change"}>{movement.change > 0 ? "+" : ""}{movement.change}</span><div><strong>{movement.reason.replaceAll("_", " ")}</strong><span>{movement.orderNumber ? `Order ${movement.orderNumber} · ` : ""}{movement.previousStock} → {movement.newStock} units</span></div><small>{new Date(movement.createdAt).toLocaleString()}</small></div>)}
          {!productDetails.stockMovements.length && <div className="mf-empty">No stock changes recorded yet.</div>}
        </div>
        <div className="mf-history-heading mf-price-history-heading"><strong>Price history</strong><span>Latest {productDetails.priceChanges.length}</span></div>
        <div className="mf-history-list">
          {productDetails.priceChanges.map((change) => <div className="mf-history-row" key={change.id}><span className="mf-price-history-arrow">ETB</span><div><strong>ETB {change.previousPrice.toLocaleString("en-ET")} → ETB {change.newPrice.toLocaleString("en-ET")}</strong><span>Price updated</span></div><small>{new Date(change.createdAt).toLocaleString()}</small></div>)}
          {!productDetails.priceChanges.length && <div className="mf-history-empty">No price changes recorded.</div>}
        </div>
      </section></div>}

      {selected && <div className="mf-modal-backdrop" onClick={() => !saving && setSelected(null)}><section className="mf-modal" role="dialog" aria-modal="true" aria-labelledby="restock-title" onClick={(e) => e.stopPropagation()}><button className="mf-modal-close" onClick={() => setSelected(null)} disabled={saving}>×</button><span className="mf-kicker">INVENTORY UPDATE</span><h2 id="restock-title">Restock product</h2><p>{selected.name}</p><div className="mf-current-stock">Current available stock <strong>{selected.availableStock}</strong></div><label className="mf-quantity-label">Quantity to add<input type="number" min="1" max="100000" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric"/></label><div className="mf-modal-actions"><button className="mf-cancel" onClick={() => setSelected(null)} disabled={saving}>Cancel</button><button className="mf-confirm" onClick={() => void restock()} disabled={saving}>{saving ? "Updating…" : "Confirm restock"}</button></div></section></div>}
      <footer className="mf-footer">MILANO FOODS <span>·</span> INTERNAL MANAGEMENT</footer>
    </main>
  );
}

function Stat({ icon, label, value, loading, warning = false }: { icon: React.ReactNode; label: string; value?: number; loading: boolean; warning?: boolean }) {
  return <article className={warning ? "mf-stat is-warning" : "mf-stat"}><div className="mf-stat-icon">{icon}</div><span>{label}</span><strong>{loading && value === undefined ? "—" : (value ?? 0).toLocaleString("en-ET")}</strong></article>;
}
