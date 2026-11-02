"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Activity, ArrowDownToLine, BarChart3, Boxes, CheckCheck, CheckCircle2, ChevronDown, ChevronRight, Clock3, KeyRound, LayoutDashboard, LogOut, MessageSquare, Package, PanelLeft, Phone, Plus, RefreshCw, Search, ShoppingBag, SlidersHorizontal, SquarePen, Trash2, TriangleAlert, X } from "lucide-react";
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
  orderNumber: string; customerName: string; customerPhone: string; customerEmail: string | null; company: string | null;
  fulfillment: string; city: string | null; deliveryAddress: string | null; pickupLocation: string | null;
  paymentPreference: string; notes: string | null; deliveryFee: number; total: number; status: string; itemCount: number;
  items: { id: string; productId: string | null; name: string; size: string | null; quantity: number; unitPrice: number; lineTotal: number }[];
  createdAt: string;
};
type PendingReview = {
  id: string; productName: string; displayName: string; rating: number; comment: string;
  orderNumber: string; createdAt: string;
};
type Dashboard = {
  operator: { name: string; authMethod?: "telegram" | "password" };
  summary: { productCount: number; totalUnits: number; reservedUnits: number; availableUnits: number; lowStockCount: number; pendingOrders: number; orderStatusCounts: Record<string, number>; pendingReviews: number; approvedReviews: number };
  products: Product[]; orders: Order[]; pendingReviews: PendingReview[]; approvedReviews: PendingReview[];
};
type SalesPeriod = "daily" | "weekly" | "monthly" | "yearly";
type SalesReport = {
  period: SalesPeriod;
  start: string;
  end: string;
  totalUnits: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  previousRevenue: number;
  revenueChangePercent: number | null;
  bestSeller: SalesProduct | null;
  bestRevenueProduct: SalesProduct | null;
  timeline: { label: string; revenue: number; units: number; orders: number }[];
  products: SalesProduct[];
};
type SalesProduct = {
  productId: string | null;
  name: string;
  size: string | null;
  category: string | null;
  units: number;
  revenue: number;
  availableStock: number | null;
};
type Section = "overview" | "inventory" | "orders" | "reviews" | "sales";
type OrderDraft = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  company: string;
  fulfillment: "DELIVERY" | "PICKUP";
  city: string;
  deliveryAddress: string;
  pickupLocation: string;
  paymentPreference: string;
  notes: string;
  deliveryFee: string;
  items: { productId: string; quantity: string; unitPrice: string }[];
};

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>("daily");
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState("");
  const [salesReload, setSalesReload] = useState(0);
  const [query, setQuery] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderStatus, setOrderStatus] = useState("PENDING");
  const [reviewStatus, setReviewStatus] = useState<"PENDING" | "APPROVED">("PENDING");
  const [inventoryFilter, setInventoryFilter] = useState("ALL");
  const [selected, setSelected] = useState<Product | null>(null);
  const [productDetails, setProductDetails] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);
  const [quantity, setQuantity] = useState("24");
  const [priceDraft, setPriceDraft] = useState("");
  const [editingPrice, setEditingPrice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [orderActionError, setOrderActionError] = useState("");
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
      order.status === orderStatus &&
      (!term || order.orderNumber.toLowerCase().includes(term) || order.customerName.toLowerCase().includes(term) || order.customerPhone.includes(term))
    );
  }, [dashboard, orderQuery, orderStatus]);

  const visibleReviews = reviewStatus === "PENDING"
    ? dashboard?.pendingReviews || []
    : dashboard?.approvedReviews || [];
  const maxTimelineRevenue = Math.max(1, ...(salesReport?.timeline.map((point) => point.revenue) || []));
  const maxProductUnits = Math.max(1, ...(salesReport?.products.slice(0, 5).map((product) => product.units) || []));
  const draftOrderTotal = orderDraft
    ? orderDraft.items.reduce((total, item) => {
        const lineTotal = Number(item.quantity) * Number(item.unitPrice);
        return total + (Number.isFinite(lineTotal) ? lineTotal : 0);
      }, Number.isFinite(Number(orderDraft.deliveryFee)) ? Number(orderDraft.deliveryFee) : 0)
    : 0;

  function beginOrderEdit(order: Order) {
    setSelectedOrder(order);
    setOrderDraft({
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || "",
      company: order.company || "",
      fulfillment: order.fulfillment === "PICKUP" ? "PICKUP" : "DELIVERY",
      city: order.city || "",
      deliveryAddress: order.deliveryAddress || "",
      pickupLocation: order.pickupLocation || "",
      paymentPreference: order.paymentPreference,
      notes: order.notes || "",
      deliveryFee: String(order.deliveryFee),
      items: order.items.map((item) => ({
        productId: item.productId || "",
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
      })),
    });
  }

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
      const payload = await readApiResponse<{ product: string; added: number; availableStock: number; telegramNotified?: boolean; error?: string }>(response);
      if (!response.ok) throw new Error(payload.error || "Restock failed.");
      setNotice(payload.telegramNotified === false
        ? `${payload.product}: stock updated, but the Telegram notification could not be sent.`
        : `${payload.product}: added ${payload.added}. New available stock: ${payload.availableStock}.`);
      setSelected(null);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restock failed.");
    } finally {
      setSaving(false);
    }
  }

  async function manageAction(
    payload: Record<string, unknown>,
    successMessage: string,
    closeDetails = false,
  ) {
    const actionId = String(payload.orderNumber || payload.reviewId || payload.productId || payload.action || "action");
    setBusyAction(actionId);
    setError("");
    setOrderActionError("");
    try {
      const response = await fetch("/api/telegram/miniapp", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-telegram-init-data": initData() },
        body: JSON.stringify(payload),
      });
      const result = await readApiResponse<{ message?: string; error?: string; telegramNotified?: boolean }>(response);
      if (!response.ok) throw new Error(result.error || "Action failed. Please try again.");
      if (closeDetails) setProductDetails(null);
      const refreshed = await loadDashboard();
      if (refreshed && payload.orderNumber && selectedOrder) {
        setSelectedOrder(refreshed.orders.find((order) => order.orderNumber === selectedOrder.orderNumber) || null);
      }
      if (refreshed && productDetails) {
        setProductDetails(refreshed.products.find((product) => product.id === productDetails.id) || null);
      }
      if (payload.action === "order-update") setOrderDraft(null);
      setNotice(result.telegramNotified === false
        ? `${result.message || successMessage} Telegram notification could not be sent.`
        : result.message || successMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action failed. Please try again.";
      setError(message);
      if (payload.orderNumber) setOrderActionError(message);
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
        <div className="mf-topbar-brand">
          <button className="mf-sidebar-toggle" aria-label={sidebarOpen ? "Close navigation" : "Open navigation"} onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? <X size={19}/> : <PanelLeft size={19}/>}</button>
          <div><div className="mf-brand">MILANO <span>FOODS</span></div><p>ERP MANAGEMENT</p></div>
        </div>
        <div className="mf-topbar-actions">
          {passwordAuthenticated && <button className="mf-signout" onClick={() => void signOut()} aria-label="Sign out"><LogOut size={16}/> Sign out</button>}
          <button className="mf-refresh" onClick={() => void loadDashboard()} aria-label="Refresh dashboard"><RefreshCw size={18}/></button>
        </div>
      </header>

      <div className="mf-app-layout">
        {sidebarOpen && <button className="mf-sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}/>}
        <aside className={`mf-sidebar${sidebarOpen ? " is-open" : ""}`}>
          <span className="mf-sidebar-label">WORKSPACE</span>
          <button className={`mf-sidebar-link${activeSection === "overview" ? " is-active" : ""}`} onClick={() => { setActiveSection("overview"); setSidebarOpen(false); }}><LayoutDashboard size={17}/>Overview</button>
          <button className={`mf-sidebar-link${activeSection === "inventory" ? " is-active" : ""}`} onClick={() => { setActiveSection("inventory"); setSidebarOpen(false); }}><Package size={17}/>Inventory<span className="mf-sidebar-count">{dashboard?.summary.lowStockCount ?? "—"}</span></button>
          <div className="mf-sidebar-label mf-sidebar-group-label"><span>ORDERS</span><ChevronDown size={13}/></div>
          {([
            ["PENDING", "Pending"],
            ["CONFIRMED", "Confirmed"],
            ["PREPARING", "Preparing"],
            ["READY_FOR_PICKUP", "Ready for pickup"],
            ["OUT_FOR_DELIVERY", "Out for delivery"],
            ["COMPLETED", "Completed"],
            ["CANCELLED", "Cancelled"],
          ] as const).map(([status, label]) => (
            <button key={status} className={`mf-sidebar-link mf-sidebar-child${activeSection === "orders" && orderStatus === status ? " is-active" : ""}`} onClick={() => { setActiveSection("orders"); setOrderStatus(status); setSidebarOpen(false); }}>
              <span className={`mf-status-dot is-${status.toLowerCase()}`}/>{label}<span className="mf-sidebar-count">{dashboard?.summary.orderStatusCounts[status] ?? 0}</span>
            </button>
          ))}
          <div className="mf-sidebar-label mf-sidebar-group-label"><span>REVIEWS</span><ChevronDown size={13}/></div>
          <button className={`mf-sidebar-link mf-sidebar-child${activeSection === "reviews" && reviewStatus === "PENDING" ? " is-active" : ""}`} onClick={() => { setActiveSection("reviews"); setReviewStatus("PENDING"); setSidebarOpen(false); }}><span className="mf-status-dot is-pending"/><span>Awaiting approval</span><span className="mf-sidebar-count">{dashboard?.summary.pendingReviews ?? 0}</span></button>
          <button className={`mf-sidebar-link mf-sidebar-child${activeSection === "reviews" && reviewStatus === "APPROVED" ? " is-active" : ""}`} onClick={() => { setActiveSection("reviews"); setReviewStatus("APPROVED"); setSidebarOpen(false); }}><span className="mf-status-dot is-approved"/><span>Published</span><span className="mf-sidebar-count">{dashboard?.summary.approvedReviews ?? 0}</span></button>
          <span className="mf-sidebar-label mf-sidebar-reports-label">ANALYTICS</span>
          <button className={`mf-sidebar-link${activeSection === "sales" ? " is-active" : ""}`} onClick={() => { setActiveSection("sales"); setSidebarOpen(false); }}><BarChart3 size={17}/>Sales reports</button>
          <div className="mf-sidebar-footer"><span className="mf-live"><span/> Connected</span><small>{dashboard?.operator.name || "Milano Foods Admin"}</small></div>
        </aside>

        <section className="mf-main-content">
      <section className="mf-welcome">
        <div><span className="mf-kicker">MANAGEMENT PANEL</span><h1>{activeSection === "overview" ? `Good to see you${dashboard?.operator.name ? `, ${dashboard.operator.name.split(" ")[0]}` : ""}.` : activeSection === "orders" ? `${orderStatus.replaceAll("_", " ")} orders` : activeSection === "reviews" ? (reviewStatus === "PENDING" ? "Reviews awaiting approval" : "Published reviews") : activeSection === "inventory" ? "Inventory management" : "Sales performance"}</h1><p>{activeSection === "overview" ? "Your business at a glance." : activeSection === "orders" ? "Review customer details, update pending orders, and manage fulfillment." : activeSection === "reviews" ? "Keep customer feedback organized by moderation status." : activeSection === "sales" ? "Real order revenue, units, and product performance." : "Manage products, stock, and retail prices."}</p></div>
        <div className="mf-live"><span/> LIVE DATA</div>
      </section>

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
          <button className="mf-quick-card" onClick={() => { setOrderStatus("PENDING"); setActiveSection("orders"); }}><span className="mf-quick-icon is-orders"><ShoppingBag size={18}/></span><span><strong>{dashboard?.summary.pendingOrders ?? "—"} pending orders</strong><small>Review, confirm, edit, or reject orders</small></span><ChevronRight className="mf-quick-arrow" size={16}/></button>
          <button className="mf-quick-card" onClick={() => { setReviewStatus("PENDING"); setActiveSection("reviews"); }}><span className="mf-quick-icon is-reviews"><MessageSquare size={18}/></span><span><strong>{dashboard?.summary.pendingReviews ?? "—"} reviews to moderate</strong><small>Approve to publish on the storefront</small></span><ChevronRight className="mf-quick-arrow" size={16}/></button>
          <button className="mf-quick-card" onClick={() => { setInventoryFilter("LOW"); setActiveSection("inventory"); }}><span className="mf-quick-icon is-stock"><TriangleAlert size={18}/></span><span><strong>{dashboard?.summary.lowStockCount ?? "—"} products low on stock</strong><small>Check available units and restock</small></span><ChevronRight className="mf-quick-arrow" size={16}/></button>
        </div>
      </section>

      <section className="mf-section mf-overview-section">
        <div className="mf-section-heading"><div><span className="mf-kicker">RECENT ACTIVITY</span><h2>Latest orders</h2></div><button className="mf-text-action" onClick={() => { setOrderStatus("PENDING"); setActiveSection("orders"); }}>View all orders <CheckCheck size={14}/></button></div>
        <div className="mf-orders">
          {(dashboard?.orders || []).slice(0, 5).map((order) => <button className="mf-overview-order" key={order.orderNumber} onClick={() => { setActiveSection("orders"); setOrderStatus(order.status); setSelectedOrder(order); }}><span><strong>{order.orderNumber}</strong><small>{order.customerName} · {order.itemCount} unit(s)</small></span><span className={`mf-status ${order.status === "PENDING" ? "pending" : ""}`}>{order.status.replaceAll("_", " ")}</span></button>)}
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
          <article className="mf-sales-total"><span>Order revenue</span><strong>{salesLoading && !salesReport ? "—" : `ETB ${(salesReport?.totalRevenue ?? 0).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</strong>{salesReport && <small className={salesReport.revenueChangePercent !== null && salesReport.revenueChangePercent >= 0 ? "mf-trend-positive" : "mf-trend-negative"}>{salesReport.revenueChangePercent === null ? "No previous-period sales" : `${salesReport.revenueChangePercent >= 0 ? "+" : ""}${salesReport.revenueChangePercent.toFixed(1)}% vs previous period`}</small>}</article>
          <article><span>Orders</span><strong>{salesLoading && !salesReport ? "—" : (salesReport?.totalOrders ?? 0).toLocaleString("en-ET")}</strong></article>
          <article><span>Avg. order value</span><strong>{salesLoading && !salesReport ? "—" : `ETB ${(salesReport?.averageOrderValue ?? 0).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</strong></article>
          <article><span>Units sold</span><strong>{salesLoading && !salesReport ? "—" : (salesReport?.totalUnits ?? 0).toLocaleString("en-ET")}</strong></article>
        </div>
        {salesReport && <p className="mf-sales-period">From {new Date(salesReport.start).toLocaleDateString("en-ET", { timeZone: "Africa/Addis_Ababa" })} through {new Date(salesReport.end).toLocaleDateString("en-ET", { timeZone: "Africa/Addis_Ababa" })} · Addis Ababa time</p>}
        {salesReport && <section className="mf-best-sellers" aria-label="Top sales insights">
          <article className="mf-best-seller-card">
            <span className="mf-insight-eyebrow">BEST SELLER · BY UNITS</span>
            {salesReport.bestSeller ? <>
              <strong>{salesReport.bestSeller.name}</strong>
              <span>{[salesReport.bestSeller.size, salesReport.bestSeller.category].filter(Boolean).join(" · ")}</span>
              <div><b>{salesReport.bestSeller.units.toLocaleString("en-ET")}</b><small>units sold · {salesReport.totalUnits ? `${((salesReport.bestSeller.units / salesReport.totalUnits) * 100).toFixed(1)}% of units` : "0% of units"}</small></div>
            </> : <p>No product sales in this period.</p>}
          </article>
          <article className="mf-best-revenue-card">
            <span className="mf-insight-eyebrow">TOP PRODUCT · BY REVENUE</span>
            {salesReport.bestRevenueProduct ? <>
              <strong>{salesReport.bestRevenueProduct.name}</strong>
              <span>{[salesReport.bestRevenueProduct.size, salesReport.bestRevenueProduct.category].filter(Boolean).join(" · ")}</span>
              <div><b>ETB {salesReport.bestRevenueProduct.revenue.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b><small>product revenue</small></div>
            </> : <p>No product sales in this period.</p>}
          </article>
        </section>}
        <section className="mf-sales-timeline" aria-label="Sales revenue timeline">
          <div className="mf-sales-timeline-heading"><strong>Revenue over time</strong><span>Order revenue · ETB</span></div>
          {salesLoading && !salesReport ? <div className="mf-empty">Loading sales timeline…</div> : salesReport?.timeline.length ? <div className="mf-timeline-bars">
            {salesReport.timeline.map((point) => (
              <div className="mf-timeline-point" key={point.label} title={`${point.label}: ETB ${point.revenue.toLocaleString("en-ET")} · ${point.orders} order(s)`}>
                <strong>ETB {point.revenue.toLocaleString("en-ET")}</strong>
                <div className="mf-timeline-bar-track"><span style={{ height: `${Math.max(3, (point.revenue / maxTimelineRevenue) * 100)}%` }}/></div>
                <small>{point.label}</small>
                <small>{point.orders} {point.orders === 1 ? "order" : "orders"}</small>
              </div>
            ))}
          </div> : !salesError ? <div className="mf-empty">No sales recorded in this period.</div> : null}
        </section>
        {salesReport?.products.length ? <section className="mf-top-products">
          <div className="mf-sales-timeline-heading"><strong>Top products by units sold</strong><span>Best 5</span></div>
          {salesReport.products.slice(0, 5).map((product, index) => (
            <div className="mf-top-product-row" key={`top-${product.productId ?? product.name}-${index}`}>
              <span className="mf-product-rank">{index + 1}</span>
              <div className="mf-top-product-info"><strong>{product.name}</strong><small>{[product.size, product.category].filter(Boolean).join(" · ") || "Historical product"}</small><div className="mf-product-units-track"><span style={{ width: `${(product.units / maxProductUnits) * 100}%` }}/></div></div>
              <strong className="mf-top-product-units">{product.units.toLocaleString("en-ET")}<small>units</small></strong>
            </div>
          ))}
        </section> : null}
        <div className="mf-sales-list">
          <div className="mf-sales-list-heading"><span>Product</span><span>Units sold</span><span>Avg. price</span><span>Product revenue</span><span>Available stock</span></div>
          {salesLoading && !salesReport && <div className="mf-empty">Loading sales report…</div>}
          {salesReport?.products.map((product) => (
            <article className="mf-sale-row" key={`${product.productId ?? "unlinked"}-${product.name}-${product.size ?? ""}`}>
              <strong className="mf-sale-name">{product.name}{product.size ? <small>{product.size}</small> : null}</strong>
              <span className="mf-sale-units"><small>Units</small>{product.units.toLocaleString("en-ET")}</span>
              <span className="mf-sale-average"><small>Avg. price</small>ETB {(product.units ? product.revenue / product.units : 0).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <strong className="mf-sale-revenue"><small>Revenue</small>ETB {product.revenue.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              <span className={`mf-sale-stock${product.availableStock !== null && product.availableStock <= 10 ? " is-low" : ""}`}><small>Available stock</small>{product.availableStock === null ? "—" : product.availableStock.toLocaleString("en-ET")}</span>
            </article>
          ))}
          {!salesLoading && !salesError && salesReport?.products.length === 0 && <div className="mf-empty">No confirmed sales in this period.</div>}
        </div>
        <p className="mf-sales-note">Order revenue and average order value include delivery fees. Product revenue and average product prices use the historical prices recorded on confirmed orders. Stock is current available inventory.</p>
      </section>}

      {activeSection === "orders" && <section className="mf-section mf-orders-section">
        <div className="mf-section-heading"><div><span className="mf-kicker">SALES ACTIVITY</span><h2>{orderStatus.replaceAll("_", " ")} orders</h2></div><span className="mf-count">{filteredOrders.length} order(s)</span></div>
        <div className="mf-list-toolbar">
          <label className="mf-search"><Search size={17}/><input value={orderQuery} onChange={(event) => setOrderQuery(event.target.value)} placeholder="Search order, name or phone"/></label>
        </div>
        <div className="mf-orders">
          {filteredOrders.map((order) => (
            <button className="mf-order mf-order-summary mf-order-open" key={order.orderNumber} onClick={() => setSelectedOrder(order)}>
                <div className="mf-order-icon"><ShoppingBag size={18}/></div>
                <div className="mf-order-main"><strong>{order.orderNumber}</strong><span>{order.customerName} · {order.itemCount} item(s)</span><small><Clock3 size={12}/> {new Date(order.createdAt).toLocaleString()}</small></div>
                <div className="mf-order-total"><strong>ETB {order.total.toLocaleString("en-ET")}</strong><span className={order.status === "PENDING" ? "mf-status pending" : "mf-status"}>{order.status.replaceAll("_", " ")}</span></div>
            </button>
          ))}
          {!loading && !filteredOrders.length && <div className="mf-empty">No orders match this search and status.</div>}
        </div>
      </section>}

      {activeSection === "reviews" && <section className="mf-section mf-reviews-section">
        <div className="mf-section-heading"><div><span className="mf-kicker">CUSTOMER FEEDBACK</span><h2>{reviewStatus === "PENDING" ? "Reviews awaiting approval" : "Published reviews"}</h2></div><span className="mf-count">{visibleReviews.length} review(s)</span></div>
        <div className="mf-review-list">
          {visibleReviews.map((review) => (
            <article className="mf-review-card" key={review.id}>
              <div className="mf-review-heading"><div><strong>{review.displayName}</strong><span>{review.productName} · Order {review.orderNumber}</span></div><span className="mf-review-rating" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div>
              <p>{review.comment}</p>
              <small>{new Date(review.createdAt).toLocaleString()}</small>
              {reviewStatus === "PENDING"
                ? <div className="mf-review-actions">
                    <button className="mf-action-confirm" onClick={() => void manageAction({ action: "review-approve", reviewId: review.id }, "Review approved and published.")} disabled={busyAction === review.id}>Approve & publish</button>
                    <button className="mf-action-reject" onClick={() => { if (window.confirm("Reject and remove this review?")) void manageAction({ action: "review-reject", reviewId: review.id }, "Review rejected."); }} disabled={busyAction === review.id}>Reject</button>
                  </div>
                : <span className="mf-review-published">Published</span>}
            </article>
          ))}
          {!loading && !visibleReviews.length && <div className="mf-empty">{reviewStatus === "PENDING" ? "No reviews waiting for approval." : "No published reviews yet."}</div>}
        </div>
      </section>}
        </section>
      </div>

      {selectedOrder && <div className="mf-modal-backdrop mf-order-modal-backdrop" onClick={() => { if (!orderDraft && !busyAction) setSelectedOrder(null); }}>
        <section className="mf-modal mf-order-detail-modal" role="dialog" aria-modal="true" aria-labelledby="order-details-title" onClick={(event) => event.stopPropagation()}>
          <button className="mf-modal-close" onClick={() => { if (!busyAction) { setOrderDraft(null); setSelectedOrder(null); } }} disabled={Boolean(busyAction)}>×</button>
          {orderDraft ? <form className="mf-order-editor" onSubmit={(event) => {
            event.preventDefault();
            if (!selectedOrder) return;
            void manageAction({
              action: "order-update",
              orderNumber: selectedOrder.orderNumber,
              ...orderDraft,
              items: orderDraft.items.map((item) => ({ ...item, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })),
            }, "Pending order updated.");
          }}>
            <span className="mf-kicker">EDIT PENDING ORDER</span><h2 id="order-details-title">{selectedOrder.orderNumber}</h2>
            {orderActionError && <p className="mf-order-action-error" role="alert">{orderActionError}</p>}
            <div className="mf-order-edit-grid">
              <label>Customer name<input value={orderDraft.customerName} onChange={(event) => setOrderDraft({ ...orderDraft, customerName: event.target.value })} required maxLength={120}/></label>
              <label>Phone<input value={orderDraft.customerPhone} onChange={(event) => setOrderDraft({ ...orderDraft, customerPhone: event.target.value })} required maxLength={60}/></label>
              <label>Email<input type="email" value={orderDraft.customerEmail} onChange={(event) => setOrderDraft({ ...orderDraft, customerEmail: event.target.value })} maxLength={180}/></label>
              <label>Company<input value={orderDraft.company} onChange={(event) => setOrderDraft({ ...orderDraft, company: event.target.value })} maxLength={160}/></label>
              <label>Fulfillment<select value={orderDraft.fulfillment} onChange={(event) => setOrderDraft({ ...orderDraft, fulfillment: event.target.value as OrderDraft["fulfillment"] })}><option value="DELIVERY">Delivery</option><option value="PICKUP">Pickup</option></select></label>
              {orderDraft.fulfillment === "DELIVERY" ? <>
                <label>City<input value={orderDraft.city} onChange={(event) => setOrderDraft({ ...orderDraft, city: event.target.value })} required maxLength={120}/></label>
                <label className="mf-order-edit-wide">Delivery address<input value={orderDraft.deliveryAddress} onChange={(event) => setOrderDraft({ ...orderDraft, deliveryAddress: event.target.value })} required maxLength={300}/></label>
              </> : <label className="mf-order-edit-wide">Pickup location<input value={orderDraft.pickupLocation} onChange={(event) => setOrderDraft({ ...orderDraft, pickupLocation: event.target.value })} required maxLength={250}/></label>}
              <label>Payment preference<input value={orderDraft.paymentPreference} onChange={(event) => setOrderDraft({ ...orderDraft, paymentPreference: event.target.value })} required maxLength={80}/></label>
              <label>Delivery fee (ETB)<input type="number" min="0" step="0.01" value={orderDraft.deliveryFee} onChange={(event) => setOrderDraft({ ...orderDraft, deliveryFee: event.target.value })} required/></label>
              <label className="mf-order-edit-wide">Order notes<textarea value={orderDraft.notes} onChange={(event) => setOrderDraft({ ...orderDraft, notes: event.target.value })} maxLength={500}/></label>
            </div>
            <div className="mf-edit-items-heading"><strong>Order items</strong><button type="button" className="mf-add-item" onClick={() => setOrderDraft({ ...orderDraft, items: [...orderDraft.items, { productId: "", quantity: "1", unitPrice: "0" }] })}><Plus size={14}/> Add item</button></div>
            <div className="mf-edit-items">{orderDraft.items.map((item, index) => {
              const product = dashboard?.products.find((candidate) => candidate.id === item.productId);
              return <div className="mf-edit-item" key={`${item.productId}-${index}`}>
                <label>Product<select value={item.productId} onChange={(event) => {
                  const selectedProduct = dashboard?.products.find((candidate) => candidate.id === event.target.value);
                  const items = [...orderDraft.items];
                  items[index] = { ...items[index], productId: event.target.value, unitPrice: selectedProduct ? String(selectedProduct.price) : items[index].unitPrice };
                  setOrderDraft({ ...orderDraft, items });
                }} required><option value="">Select a product</option>{dashboard?.products.map((candidate) => <option key={candidate.id} value={candidate.id} disabled={orderDraft.items.some((other, otherIndex) => otherIndex !== index && other.productId === candidate.id)}>{candidate.name}{candidate.size ? ` · ${candidate.size}` : ""} ({candidate.availableStock} available)</option>)}</select></label>
                <label>Qty<input type="number" min="1" max="99" step="1" value={item.quantity} onChange={(event) => { const items = [...orderDraft.items]; items[index] = { ...items[index], quantity: event.target.value }; setOrderDraft({ ...orderDraft, items }); }} required/></label>
                <label>Unit price<input type="number" min="0.01" step="0.01" value={item.unitPrice} onChange={(event) => { const items = [...orderDraft.items]; items[index] = { ...items[index], unitPrice: event.target.value }; setOrderDraft({ ...orderDraft, items }); }} required/></label>
                <button type="button" className="mf-remove-item" aria-label={`Remove ${product?.name || "item"}`} onClick={() => setOrderDraft({ ...orderDraft, items: orderDraft.items.filter((_, itemIndex) => itemIndex !== index) })} disabled={orderDraft.items.length === 1}><Trash2 size={15}/></button>
              </div>;
            })}</div>
            <div className="mf-order-draft-total"><span>Estimated order total</span><strong>ETB {draftOrderTotal.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
            <div className="mf-order-editor-actions"><button type="button" className="mf-cancel" onClick={() => setOrderDraft(null)} disabled={Boolean(busyAction)}>Cancel edit</button><button type="submit" className="mf-confirm" disabled={Boolean(busyAction)}>{busyAction ? "Saving…" : "Save order changes"}</button></div>
          </form> : <>
            <span className="mf-kicker">ORDER DETAILS · {new Date(selectedOrder.createdAt).toLocaleString()}</span><h2 id="order-details-title">{selectedOrder.orderNumber}</h2>
            {orderActionError && <p className="mf-order-action-error" role="alert">{orderActionError}</p>}
            <span className={`mf-status-badge ${selectedOrder.status.toLowerCase()}`}>{selectedOrder.status.replaceAll("_", " ")}</span>
            <div className="mf-order-detail-sections">
              <section><h3>Customer</h3><strong>{selectedOrder.customerName}</strong>{selectedOrder.company && <span>{selectedOrder.company}</span>}<a href={`tel:${selectedOrder.customerPhone}`}>{selectedOrder.customerPhone}</a>{selectedOrder.customerEmail && <span>{selectedOrder.customerEmail}</span>}</section>
              <section><h3>{selectedOrder.fulfillment === "DELIVERY" ? "Delivery" : "Pickup"}</h3><span>{selectedOrder.fulfillment === "DELIVERY" ? [selectedOrder.city, selectedOrder.deliveryAddress].filter(Boolean).join(" · ") : selectedOrder.pickupLocation || "Pickup"}</span><span>Payment: {selectedOrder.paymentPreference}</span></section>
              {selectedOrder.notes && <section><h3>Notes</h3><span>{selectedOrder.notes}</span></section>}
            </div>
            <div className="mf-order-detail-items"><h3>Items</h3>{selectedOrder.items.map((item) => <div key={item.id}><span>{item.name}{item.size ? ` · ${item.size}` : ""}<small>{item.quantity} × ETB {item.unitPrice.toLocaleString("en-ET")}</small></span><strong>ETB {item.lineTotal.toLocaleString("en-ET")}</strong></div>)}</div>
            <div className="mf-order-detail-totals"><span>Delivery fee <strong>ETB {selectedOrder.deliveryFee.toLocaleString("en-ET")}</strong></span><span>Order total <strong>ETB {selectedOrder.total.toLocaleString("en-ET")}</strong></span></div>
            {selectedOrder.status === "PENDING" && <div className="mf-order-actions mf-order-modal-actions">
              <button className="mf-edit-order" onClick={() => beginOrderEdit(selectedOrder)}><SquarePen size={15}/> Edit order</button>
              <button className="mf-action-confirm" onClick={() => { if (window.confirm(`Confirm ${selectedOrder.orderNumber}? This deducts the reserved stock.`)) void manageAction({ action: "order-confirm", orderNumber: selectedOrder.orderNumber }, "Order confirmed."); }} disabled={busyAction === selectedOrder.orderNumber}>Confirm order</button>
              <button className="mf-action-reject" onClick={() => { if (window.confirm(`Reject ${selectedOrder.orderNumber}? The reserved stock will be released.`)) void manageAction({ action: "order-reject", orderNumber: selectedOrder.orderNumber }, "Order rejected."); }} disabled={busyAction === selectedOrder.orderNumber}>Reject</button>
            </div>}
          </>}
        </section>
      </div>}

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
