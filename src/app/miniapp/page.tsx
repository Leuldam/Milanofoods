"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import { Activity, Archive, ArrowDownToLine, Banknote, BarChart3, Bell, Boxes, CheckCheck, CheckCircle2, ChevronDown, ChevronRight, Clock3, Eye, EyeOff, KeyRound, LayoutDashboard, Leaf, LogOut, MessageSquare, Package, PanelLeft, Pencil, Phone, Plus, RefreshCw, RotateCcw, Search, ShoppingBag, SlidersHorizontal, SquarePen, Trash2, TriangleAlert, X } from "lucide-react";
import { groupProductVariants } from "@/lib/product-variants";
import { formatTotalMeasure } from "@/lib/product-pricing";
import "./miniapp.css";
import "./miniapp-auth.css";
import "./miniapp-management.css";

type Product = {
  id: string; sku: string; categoryId: string; categoryIsActive: boolean; slug: string; name: string; description: string; category: string; imageUrl: string | null;
  galleryImageUrls: string[];
  size: string | null; flavor: string | null; variantType: string | null; price: number; stock: number; reservedStock: number; availableStock: number;
  minimumOrderQuantity: number; promotionEnabled: boolean; promotionDiscountPercent: string | null;
  packagingOptions: { id: string; label: string; unitsPerPackage: number; isEnabled: boolean }[];
  isPublished: boolean; isActive: boolean; lowStock: boolean; stockMovements: StockMovement[]; priceChanges: PriceChange[];
};
type InventoryProductGroup = { key: string; label: string; category: string; products: Product[] };
type ProductCategory = {
  id: string; name: string; slug: string; description: string; imageUrl: string | null; isActive: boolean; productCount: number;
};
type PriceChange = { id: string; previousPrice: number; newPrice: number; createdAt: string };
type StockMovement = {
  id: string; change: number; previousStock: number; newStock: number; reason: string;
  orderNumber: string | null; createdAt: string;
};
type Order = {
  orderNumber: string; customerName: string; customerPhone: string; customerEmail: string | null; company: string | null;
  fulfillment: string; city: string | null; deliveryAddress: string | null; pickupLocation: string | null;
  paymentPreference: string; hasPaymentProof: boolean; notes: string | null; deliveryFee: number; total: number; status: string; itemCount: number;
  items: { id: string; productId: string | null; sku: string; name: string; size: string | null; flavor: string | null; variantType: string | null; packagingLabel: string; unitsPerPackage: number; packageQuantity: number; quantity: number; unitPrice: number; listUnitPrice: number; promotionApplied: boolean; promotionDiscountPercent: string | null; lineTotal: number }[];
  createdAt: string;
};
type PaymentMethodConfig = {
  code: "cbe" | "telebirr" | "awash" | "boa";
  displayName: string;
  accountName: string;
  accountNumber: string;
  isEnabled: boolean;
};
type PendingReview = {
  id: string; productName: string; displayName: string; rating: number; comment: string;
  orderNumber: string; createdAt: string;
};
type Dashboard = {
  operator: { name: string; authMethod?: "telegram" | "password" };
  summary: { productCount: number; totalUnits: number; reservedUnits: number; availableUnits: number; lowStockCount: number; pendingOrders: number; orderStatusCounts: Record<string, number>; pendingReviews: number; approvedReviews: number };
  products: Product[]; categories: ProductCategory[]; orders: Order[]; pendingReviews: PendingReview[]; approvedReviews: PendingReview[];
  paymentMethods: PaymentMethodConfig[];
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
type Section = "overview" | "inventory" | "orders" | "reviews" | "sales" | "payments";
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
  items: { productId: string; quantity: string; unitPrice: string; packagingLabel: string; unitsPerPackage: number; packageQuantity: number }[];
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

async function readProductImage(file: File): Promise<string> {
  if (!["image/png", "image/jpeg"].includes(file.type)) {
    throw new Error("Choose a PNG or JPG image.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Images must be 2 MB or smaller.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Unable to read the selected image."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
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
  const [inventoryCategory, setInventoryCategory] = useState("ALL");
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
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, PaymentMethodConfig>>({});
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [editingProduct, setEditingProduct] = useState(false);

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
      setPaymentDrafts(Object.fromEntries(
        payload.paymentMethods.map((method) => [method.code, method]),
      ));
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

  const inventoryCounts = useMemo(() => {
    const products = dashboard?.products || [];
    const activeProducts = products.filter((product) => product.isActive);
    return {
      all: activeProducts.length,
      low: activeProducts.filter((product) => product.lowStock).length,
      out: activeProducts.filter((product) => product.stock === 0).length,
      archived: products.length - activeProducts.length,
    };
  }, [dashboard]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (dashboard?.products || []).filter((product) =>
      (inventoryFilter === "ARCHIVED"
        ? !product.isActive
        : product.isActive && (
          inventoryFilter === "ALL" ||
          (inventoryFilter === "LOW" && product.lowStock) ||
          (inventoryFilter === "OUT" && product.stock === 0)
        )) &&
      (inventoryCategory === "ALL" || product.category === inventoryCategory) &&
      (!term ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        product.slug.toLowerCase().includes(term) ||
        (product.flavor || "").toLowerCase().includes(term) ||
        (product.variantType || "").toLowerCase().includes(term))
    );
  }, [dashboard, inventoryCategory, inventoryFilter, query]);
  const inventoryGroups = useMemo(() => {
    const categoryOrder = new Map(
      (dashboard?.categories || []).map((category, index) => [category.name, index]),
    );
    return groupProductVariants(filteredProducts).map(({ key, product, variants }): InventoryProductGroup => ({
      key,
      category: product.category,
      products: variants,
      label: product.flavor && product.category === "Ice Cream Powders"
        ? `${product.flavor} Ice Cream`
        : product.flavor && product.category === "Milkshake Powders"
          ? `${product.flavor} Milkshake`
          : product.name,
    })).sort((first, second) =>
      (categoryOrder.get(first.category) ?? Number.MAX_SAFE_INTEGER) -
        (categoryOrder.get(second.category) ?? Number.MAX_SAFE_INTEGER) ||
      first.label.localeCompare(second.label, undefined, { sensitivity: "base", numeric: true }),
    );
  }, [dashboard?.categories, filteredProducts]);

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
        packagingLabel: item.packagingLabel,
        unitsPerPackage: item.unitsPerPackage,
        packageQuantity: item.packageQuantity,
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
    const actionId = String(payload.orderNumber || payload.reviewId || payload.productId || payload.code || payload.action || "action");
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
      if (payload.action === "category-update") setEditingCategory(null);
      const refreshed = await loadDashboard();
      if (refreshed && payload.orderNumber && selectedOrder) {
        setSelectedOrder(refreshed.orders.find((order) => order.orderNumber === selectedOrder.orderNumber) || null);
      }
      if (refreshed && productDetails && !closeDetails) {
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

  async function saveCatalogAction(payload: Record<string, unknown>, fallbackMessage: string) {
    setSavingCatalog(true);
    setError("");
    try {
      const response = await fetch("/api/telegram/miniapp", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-telegram-init-data": initData() },
        body: JSON.stringify(payload),
      });
      const result = await readApiResponse<{ message?: string; error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "Unable to save catalog changes.");
      const refreshed = await loadDashboard();
      if (refreshed && productDetails) {
        setProductDetails(refreshed.products.find((product) => product.id === productDetails.id) || null);
      }
      setNotice(result.message || fallbackMessage);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save catalog changes.");
      return false;
    } finally {
      setSavingCatalog(false);
    }
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const files = values.getAll("images").filter((file): file is File => file instanceof File && file.size > 0);
      if (files.length > 5) throw new Error("Choose no more than five product images.");
      const galleryData = await Promise.all(files.map(readProductImage));
      const saved = await saveCatalogAction({
        action: "product-create",
        name: values.get("name"),
        sku: values.get("sku"),
        categoryId: values.get("categoryId"),
        flavor: values.get("flavor"),
        variantType: values.get("variantType"),
        size: values.get("size"),
        description: values.get("description"),
        galleryData,
        packagingOptions: values.get("packagingOptions"),
        minimumOrderQuantity: values.get("minimumOrderQuantity"),
        promotionEnabled: values.get("promotionEnabled") === "on",
        promotionDiscountPercent: values.get("promotionDiscountPercent"),
      }, "Product added as hidden.");
      if (saved) {
        form.reset();
        setShowProductForm(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to read the selected image.");
    }
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const file = values.get("image");
      const imageData = file instanceof File && file.size > 0
        ? await readProductImage(file)
        : undefined;
      const saved = await saveCatalogAction({
        action: "category-create",
        name: values.get("name"),
        description: values.get("description"),
        imageData,
      }, "Category added.");
      if (saved) {
        form.reset();
        setShowCategoryForm(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to read the selected image.");
    }
  }

  async function submitCategoryUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCategory) return;
    const values = new FormData(event.currentTarget);
    const saved = await saveCatalogAction({
      action: "category-update",
      categoryId: editingCategory.id,
      name: values.get("name"),
      description: values.get("description"),
    }, "Category updated.");
    if (saved) setEditingCategory(null);
  }

  async function submitProductUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productDetails) return;
    const values = new FormData(event.currentTarget);
    const saved = await saveCatalogAction({
      action: "product-update",
      productId: productDetails.id,
      name: values.get("name"),
      sku: values.get("sku"),
      categoryId: values.get("categoryId"),
      flavor: values.get("flavor"),
      variantType: values.get("variantType"),
      size: values.get("size"),
      description: values.get("description"),
      packagingOptions: values.get("packagingOptions"),
      minimumOrderQuantity: values.get("minimumOrderQuantity"),
      promotionEnabled: values.get("promotionEnabled") === "on",
      promotionDiscountPercent: values.get("promotionDiscountPercent"),
    }, "Product details updated.");
    if (saved) setEditingProduct(false);
  }

  async function updateCatalogImage(
    event: React.ChangeEvent<HTMLInputElement>,
    action: "product-gallery-update" | "category-image-update",
    id: string,
  ) {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = "";
    if (!files.length) return;
    try {
      if (files.length > 5) throw new Error("Choose no more than five product images.");
      const images = await Promise.all(files.map(readProductImage));
      await saveCatalogAction({
        action,
        ...(action === "product-gallery-update" ? { productId: id } : { categoryId: id }),
        ...(action === "product-gallery-update" ? { galleryData: images } : { imageData: images[0] }),
      }, action === "product-gallery-update" ? "Product image gallery updated." : "Photo updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to read the selected image.");
    }
  }

  function openProductDetails(product: Product, startEditing = false) {
    setProductDetails(product);
    setPriceDraft(String(product.price));
    setEditingPrice(false);
    setEditingProduct(startEditing);
  }

  function toggleProductArchive(product: Product) {
    const nextIsActive = !product.isActive;
    const message = nextIsActive
      ? `Restore ${product.name} to active inventory? It will remain hidden from the storefront until published.`
      : `Archive ${product.name}? It will be hidden from the storefront and active inventory. Historical orders and stock records are preserved.`;
    if (!window.confirm(message)) return;
    void manageAction({
      action: "product-status-update",
      productId: product.id,
      isActive: nextIsActive,
    }, nextIsActive ? "Product restored." : "Product archived.", true);
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
          <Leaf className="mf-brand-mark" size={30} aria-hidden="true"/>
          <div><div className="mf-brand">MILANO <span>FOODS</span></div><p>ERP MANAGEMENT</p></div>
        </div>
        <label className="mf-topbar-search"><Search size={17}/><input value={query} onChange={(event) => { setQuery(event.target.value); if (event.target.value) setActiveSection("inventory"); }} placeholder="Search anything..." aria-label="Search products and inventory"/></label>
        <div className="mf-topbar-actions">
          <button className="mf-notifications" onClick={() => { setActiveSection("orders"); setOrderStatus("PENDING"); }} aria-label={`${dashboard?.summary.pendingOrders ?? 0} pending order notifications`}><Bell size={18}/>{Boolean(dashboard?.summary.pendingOrders) && <span>{dashboard?.summary.pendingOrders}</span>}</button>
          {passwordAuthenticated && <button className="mf-signout" onClick={() => void signOut()} aria-label="Sign out"><LogOut size={16}/> Sign out</button>}
          <button className="mf-refresh" onClick={() => void loadDashboard()} aria-label="Refresh dashboard"><RefreshCw size={17}/></button>
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
          <button className={`mf-sidebar-link${activeSection === "payments" ? " is-active" : ""}`} onClick={() => { setActiveSection("payments"); setSidebarOpen(false); }}><Banknote size={17}/>Payment accounts<span className="mf-sidebar-count">{dashboard?.paymentMethods.filter((method) => method.isEnabled).length ?? 0}</span></button>
          <div className="mf-sidebar-footer"><span className="mf-live"><span/> Connected</span><small>{dashboard?.operator.name || "Milano Foods Admin"}</small></div>
        </aside>

        <section className="mf-main-content">
      <section className="mf-welcome">
        <div><span className="mf-kicker">{activeSection === "inventory" ? "INVENTORY OPERATIONS" : "MANAGEMENT PANEL"}</span><h1>{activeSection === "overview" ? `Good to see you${dashboard?.operator.name ? `, ${dashboard.operator.name.split(" ")[0]}` : ""}.` : activeSection === "orders" ? `${orderStatus.replaceAll("_", " ")} orders` : activeSection === "reviews" ? (reviewStatus === "PENDING" ? "Reviews awaiting approval" : "Published reviews") : activeSection === "inventory" ? "Inventory control center" : activeSection === "sales" ? "Sales performance" : "Payment accounts"}</h1><p>{activeSection === "overview" ? "Your business at a glance." : activeSection === "orders" ? "Review customer details, update pending orders, and manage fulfillment." : activeSection === "reviews" ? "Keep customer feedback organized by moderation status." : activeSection === "sales" ? "Real order revenue, units, and product performance." : activeSection === "payments" ? "Set the account details shown to customers during checkout." : "Organize your catalog, keep stock accurate, and restock with confidence."}</p></div>
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

      {activeSection === "inventory" && <>
        <section className="mf-stats mf-inventory-stats">
          <Stat icon={<Package/>} label="Total products" value={dashboard?.summary.productCount} loading={loading} tone="green"/>
          <Stat icon={<Boxes/>} label="Total stock" value={dashboard?.summary.totalUnits} loading={loading} tone="blue"/>
          <Stat icon={<ShoppingBag/>} label="Total categories" value={dashboard?.categories.length} loading={loading} tone="green"/>
          <Stat icon={<TriangleAlert/>} label="Low stock" value={dashboard?.summary.lowStockCount} loading={loading} warning tone="orange"/>
        </section>
        <section className="mf-section">
        <div className="mf-section-heading"><div><span className="mf-kicker">PRODUCT CATALOG</span><h2>Inventory</h2><p className="mf-section-description">Products are grouped by category and flavor. Manage each size or type from its family.</p></div><div className="mf-catalog-heading-actions"><span className="mf-count">{filteredProducts.length} variants · {inventoryGroups.length} families</span><button type="button" className="mf-confirm" aria-expanded={showProductForm} onClick={() => { setShowProductForm(!showProductForm); setShowCategoryForm(false); }}><Plus size={16}/> Add product</button><button type="button" className="mf-restock" aria-expanded={showCategoryForm} onClick={() => { setShowCategoryForm(!showCategoryForm); setShowProductForm(false); }}><Boxes size={16}/> New category</button></div></div>
        {showProductForm && <form className="mf-catalog-form" onSubmit={(event) => void submitProduct(event)}>
          <div className="mf-catalog-form-heading"><div><strong>Add a product or flavor</strong><span>Each flavor/type/size combination is its own SKU. Stock and carton quantities are always tracked as individual units.</span></div><button type="button" className="mf-detail-link" onClick={() => setShowProductForm(false)}>Cancel</button></div>
          <div className="mf-catalog-form-grid">
            <label>Product name<input name="name" required maxLength={180} placeholder="e.g. Raspberry Ice Cream Powder"/></label>
            <label>SKU (optional)<input name="sku" maxLength={120} placeholder="Auto-generated from the product variant"/></label>
            <label>Category<select name="categoryId" required defaultValue=""><option value="" disabled>Select a category</option>{dashboard?.categories.filter((category) => category.isActive).map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
            <label>Flavor (optional)<input name="flavor" maxLength={80} placeholder="e.g. Raspberry"/></label>
            <label>Type or style (optional)<input name="variantType" maxLength={80} placeholder="e.g. Hard, Soft, Liquid"/></label>
            <label>Package size (optional)<input name="size" maxLength={60} placeholder="e.g. 5 kg"/></label>
            <label className="mf-catalog-image-field">Product photos (optional)<input name="images" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" multiple/><small>Upload up to 5 PNG or JPG images, max 2 MB each. The first is the main image.</small></label>
            <label className="mf-catalog-description">Description (optional)<textarea name="description" rows={3} maxLength={2000} placeholder="Product details"/></label>
            <label>Carton options (optional)<textarea name="packagingOptions" rows={3} placeholder={"Carton of 6 bottles=6\nCarton of 12 bottles=12"}/><small>One per line as label=units. Single-unit sales are always available.</small></label>
            <label>Minimum order (individual units)<input name="minimumOrderQuantity" type="number" min="1" max="100000" step="1" defaultValue="1" required/></label>
            <label>Promotion discount (%)<input name="promotionDiscountPercent" type="number" min="0.01" max="99.99" step="0.01" placeholder="Optional"/></label>
            <label className="mf-product-promotion-toggle"><input name="promotionEnabled" type="checkbox"/> Enable this configured promotion</label>
          </div>
          <button type="submit" className="mf-confirm" disabled={savingCatalog || !dashboard?.categories.length}>{savingCatalog ? "Saving…" : "Add hidden product"}</button>
        </form>}
        {showCategoryForm && <form className="mf-catalog-form" onSubmit={(event) => void submitCategory(event)}>
          <div className="mf-catalog-form-heading"><div><strong>Add a product category</strong><span>Create a new family, then add products to it. Only published products appear in the storefront.</span></div><button type="button" className="mf-detail-link" onClick={() => setShowCategoryForm(false)}>Cancel</button></div>
          <div className="mf-catalog-form-grid">
            <label>Category name<input name="name" required maxLength={100} placeholder="e.g. Fruit Concentrates"/></label>
            <label className="mf-catalog-image-field">Category photo (PNG or JPG)<input name="image" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg"/><small>Optional, up to 2 MB.</small></label>
            <label className="mf-catalog-description">Description (optional)<textarea name="description" rows={3} maxLength={500} placeholder="What customers can find in this category"/></label>
          </div>
          <button type="submit" className="mf-confirm" disabled={savingCatalog}>{savingCatalog ? "Saving…" : "Create category"}</button>
        </form>}
        {!!dashboard?.categories.length && <div className="mf-category-manager"><div className="mf-category-manager-heading"><div><strong>Product categories</strong><span>Manage names, visibility, and category images.</span></div><span className="mf-count">{dashboard.categories.filter((category) => category.isActive).length} active · {dashboard.categories.length} total</span></div><div className="mf-category-manager-grid">{dashboard.categories.map((category) => <article className={`mf-category-manager-card${category.isActive ? "" : " is-archived"}`} key={category.id}>
          {category.imageUrl ? <img src={category.imageUrl} alt="" /> : <div className="mf-product-placeholder"><Package size={22}/></div>}
          <div className="mf-category-card-content"><strong>{category.name}</strong><span className="mf-category-product-count">{category.productCount} {category.productCount === 1 ? "product" : "products"} · {category.isActive ? "Active" : "Hidden"}</span><div className="mf-category-card-actions">
            <button type="button" className="mf-category-action" onClick={() => setEditingCategory(category)} aria-label={`Edit ${category.name}`} disabled={busyAction === category.id}><Pencil size={14}/> Edit</button>
            <button type="button" className="mf-category-action" disabled={busyAction === category.id} onClick={() => {
              const nextIsActive = !category.isActive;
              if (!window.confirm(`${nextIsActive ? "Restore" : "Hide"} ${category.name}${nextIsActive ? "?" : " and all its products from the storefront?"}`)) return;
              void manageAction({ action: "category-status-update", categoryId: category.id, isActive: nextIsActive }, nextIsActive ? "Category restored." : "Category hidden.");
            }} aria-label={`${category.isActive ? "Hide" : "Restore"} ${category.name}`}>{category.isActive ? <><EyeOff size={14}/> Hide</> : <><Eye size={14}/> Restore</>}</button>
            <button type="button" className="mf-category-action is-danger" disabled={category.productCount > 0 || busyAction === category.id} title={category.productCount > 0 ? "Move or archive this category's products before deleting it." : "Permanently delete this empty category"} onClick={() => {
              if (category.productCount > 0) return;
              if (!window.confirm(`Permanently delete the empty ${category.name} category? This cannot be undone.`)) return;
              void manageAction({ action: "category-delete", categoryId: category.id }, "Category deleted.");
            }} aria-label={`Delete ${category.name}`}><Trash2 size={14}/> Delete</button>
          </div></div>
          <label className="mf-category-action mf-category-photo-upload"><Pencil size={14}/> Change photo<input type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={(event) => void updateCatalogImage(event, "category-image-update", category.id)}/></label>
        </article>)}</div></div>}
        <div className="mf-list-toolbar mf-inventory-toolbar">
          <label className="mf-search"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or category"/></label>
          <label className="mf-filter-select"><SlidersHorizontal size={16}/><select value={inventoryCategory} onChange={(event) => setInventoryCategory(event.target.value)} aria-label="Filter by product category"><option value="ALL">All categories</option>{dashboard?.categories.map((category) => <option value={category.name} key={category.id}>{category.name}</option>)}</select></label>
        </div>
        <div className="mf-inventory-filter-row">
          <div className="mf-inventory-filter-group" role="group" aria-label="Filter products by stock status">
            {([
              ["ALL", "All products", inventoryCounts.all],
              ["LOW", "Low stock", inventoryCounts.low],
              ["OUT", "Out of stock", inventoryCounts.out],
              ["ARCHIVED", "Archived", inventoryCounts.archived],
            ] as const).map(([filter, label, count]) => (
              <button type="button" className={`mf-inventory-filter${inventoryFilter === filter ? " is-active" : ""}`} key={filter} aria-pressed={inventoryFilter === filter} onClick={() => setInventoryFilter(filter)}>
                {label}<span>{count}</span>
              </button>
            ))}
          </div>
          {(query || inventoryCategory !== "ALL" || inventoryFilter !== "ALL") && <button type="button" className="mf-clear-inventory-filters" onClick={() => { setQuery(""); setInventoryCategory("ALL"); setInventoryFilter("ALL"); }}>Clear filters</button>}
        </div>
        <div className="mf-products">
          {loading && !dashboard ? <div className="mf-empty">Loading inventory…</div> : inventoryGroups.map((group, groupIndex) => {
            const startsCategory = groupIndex === 0 || inventoryGroups[groupIndex - 1].category !== group.category;
            const categoryFamilies = startsCategory
              ? inventoryGroups.filter((item) => item.category === group.category)
              : [];
            const categoryVariants = categoryFamilies.reduce((total, item) => total + item.products.length, 0);
            if (group.products.length === 1) {
              const product = group.products[0];
              return <Fragment key={group.key}>
                {startsCategory && <div className="mf-inventory-category-heading"><h3>{group.category}</h3><span>{categoryFamilies.length} {categoryFamilies.length === 1 ? "family" : "families"} · {categoryVariants} {categoryVariants === 1 ? "variant" : "variants"}</span></div>}
                <article className="mf-product">
                <div className="mf-product-image">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <div className="mf-product-placeholder"><Package size={28}/></div>}<span className={`mf-stock-tag${!product.isActive ? " is-archived" : product.stock === 0 ? " is-out" : product.lowStock ? " is-low" : ""}`}>{!product.isActive ? "ARCHIVED" : product.stock === 0 ? "OUT OF STOCK" : product.lowStock ? "LOW STOCK" : "IN STOCK"}</span></div>
                <div className="mf-product-body">
                  <span className="mf-category">{product.category}{product.size ? ` · ${product.size}` : ""}</span>
                  <button className="mf-product-name" onClick={() => openProductDetails(product)}>{product.name}</button>
                  <span className={`mf-product-publication${product.isPublished && product.isActive && product.categoryIsActive ? " is-published" : ""}`}>{!product.isActive ? "Archived" : !product.categoryIsActive ? "Category hidden" : product.isPublished ? "Live on storefront" : "Hidden from storefront"}</span>
                  <div className="mf-stock-numbers"><div><strong>{product.availableStock}</strong><small>Available</small></div><div><strong>{product.stock}</strong><small>Total stock</small></div><div><strong>{product.reservedStock}</strong><small>Reserved</small></div></div>
                  <div className="mf-product-actions">
                    {product.isActive && <button className="mf-restock" onClick={() => { setSelected(product); setQuantity("24"); }}><ArrowDownToLine size={16}/> Restock</button>}
                    <button className="mf-detail-link" onClick={() => openProductDetails(product, true)}><Pencil size={14}/> Edit product</button>
                  </div>
                </div>
                </article>
              </Fragment>;
            }

            const products = group.products;
            const firstProduct = products[0];
            const availableStock = products.reduce((total, product) => total + product.availableStock, 0);
            const totalStock = products.reduce((total, product) => total + product.stock, 0);
            const reservedStock = products.reduce((total, product) => total + product.reservedStock, 0);
            const activeVariants = products.filter((product) => product.isActive);
            const isArchived = activeVariants.length === 0;
            const hasLowStock = activeVariants.some((product) => product.lowStock);
            const hasOutOfStock = activeVariants.some((product) => product.stock === 0);
            const isPublished = activeVariants.some((product) => product.isPublished && product.categoryIsActive);
            return <Fragment key={group.key}>
              {startsCategory && <div className="mf-inventory-category-heading"><h3>{group.category}</h3><span>{categoryFamilies.length} {categoryFamilies.length === 1 ? "family" : "families"} · {categoryVariants} {categoryVariants === 1 ? "variant" : "variants"}</span></div>}
              <article className="mf-product mf-product-family">
              <div className="mf-product-image">{firstProduct.imageUrl ? <img src={firstProduct.imageUrl} alt="" /> : <div className="mf-product-placeholder"><Package size={28}/></div>}<span className={`mf-stock-tag${isArchived ? " is-archived" : hasOutOfStock ? " is-out" : hasLowStock ? " is-low" : ""}`}>{isArchived ? "ARCHIVED" : hasOutOfStock ? "OUT OF STOCK" : hasLowStock ? "LOW STOCK" : "IN STOCK"}</span></div>
              <div className="mf-product-body">
                <span className="mf-category">{firstProduct.category} · {products.length} options</span>
                <h3 className="mf-product-name-static">{group.label}</h3>
                <span className={`mf-product-publication${isPublished ? " is-published" : ""}`}>{isArchived ? "Archived" : isPublished ? "Live on storefront" : "Hidden from storefront"}</span>
                <div className="mf-stock-numbers"><div><strong>{availableStock}</strong><small>Available</small></div><div><strong>{totalStock}</strong><small>Total stock</small></div><div><strong>{reservedStock}</strong><small>Reserved</small></div></div>
                <div className="mf-family-variants" aria-label={`${group.label} size and style inventory`}>
                  {products.map((variant) => <div className="mf-family-variant" key={variant.id}>
                    <div className="mf-family-variant-info"><strong>{[variant.variantType, variant.size].filter(Boolean).join(" · ") || "Standard option"}</strong><div className="mf-family-variant-meta"><span>ETB {variant.price.toLocaleString("en-ET")}</span><span>{variant.availableStock} available</span><span className="mf-family-variant-status">{!variant.isActive ? "Archived" : !variant.categoryIsActive ? "Category hidden" : variant.isPublished ? "Live" : "Hidden"}</span><span className={`mf-family-variant-status${variant.stock === 0 ? " is-out" : variant.lowStock ? " is-low" : ""}`}>{variant.stock === 0 ? "Out of stock" : variant.lowStock ? "Low stock" : "In stock"}</span></div></div>
                    <div className="mf-family-variant-actions">
                      <button className="mf-family-action" onClick={() => openProductDetails(variant, true)}><Pencil size={13}/> Edit</button>
                      {variant.isActive && <button className="mf-family-action" onClick={() => { setSelected(variant); setQuantity("24"); }}><ArrowDownToLine size={13}/> Restock</button>}
                    </div>
                  </div>)}
                </div>
              </div>
              </article>
            </Fragment>;
          })}
          {!loading && filteredProducts.length === 0 && <div className="mf-empty">No matching products found.</div>}
        </div>
      </section>
      </>}

      {activeSection === "payments" && <section className="mf-section mf-payment-settings">
        <div className="mf-section-heading"><div><span className="mf-kicker">CUSTOMER CHECKOUT</span><h2>Payment accounts</h2></div><span className="mf-count">4 providers</span></div>
        <p className="mf-payment-settings-help">Enter the account holder and account number for each provider. Only enabled accounts with complete details appear at checkout. Customers can still place an order without choosing a payment method.</p>
        <div className="mf-payment-settings-grid">
          {(dashboard?.paymentMethods || []).map((method) => {
            const draft = paymentDrafts[method.code] || method;
            return <form className="mf-payment-setting-card" key={method.code} onSubmit={(event) => {
              event.preventDefault();
              void manageAction({ action: "payment-method-update", ...draft }, `${draft.displayName} payment settings saved.`);
            }}>
              <div className="mf-payment-setting-heading"><PaymentMethodLogo code={method.code}/><div><strong>{method.displayName}</strong><small>{draft.isEnabled ? "Shown at checkout" : "Hidden at checkout"}</small></div></div>
              <label>Account holder name<input value={draft.accountName} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [method.code]: { ...draft, accountName: event.target.value } }))} maxLength={120} placeholder="Name on account"/></label>
              <label>Account number<input value={draft.accountNumber} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [method.code]: { ...draft, accountNumber: event.target.value } }))} maxLength={80} placeholder="Account or wallet number"/></label>
              <label className="mf-payment-enabled"><input type="checkbox" checked={draft.isEnabled} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [method.code]: { ...draft, isEnabled: event.target.checked } }))}/> Enable this payment method</label>
              <button type="submit" className="mf-confirm" disabled={busyAction === method.code || (draft.isEnabled && (!draft.accountName.trim() || !draft.accountNumber.trim()))}>{busyAction === method.code ? "Saving…" : "Save payment account"}</button>
            </form>;
          })}
          {!dashboard?.paymentMethods.length && <div className="mf-empty">Payment provider settings are unavailable. Refresh the Mini App.</div>}
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
            <div className="mf-edit-items-heading"><strong>Order items</strong><button type="button" className="mf-add-item" onClick={() => setOrderDraft({ ...orderDraft, items: [...orderDraft.items, { productId: "", quantity: "1", unitPrice: "0", packagingLabel: "Single unit", unitsPerPackage: 1, packageQuantity: 1 }] })}><Plus size={14}/> Add item</button></div>
            <div className="mf-edit-items">{orderDraft.items.map((item, index) => {
              const product = dashboard?.products.find((candidate) => candidate.id === item.productId);
              return <div className="mf-edit-item" key={`${item.productId}-${index}`}>
                <label>Product<select value={item.productId} onChange={(event) => {
                  const selectedProduct = dashboard?.products.find((candidate) => candidate.id === event.target.value);
                  const items = [...orderDraft.items];
                  items[index] = { ...items[index], productId: event.target.value, unitPrice: selectedProduct ? String(selectedProduct.price) : items[index].unitPrice, packagingLabel: "Single unit", unitsPerPackage: 1, packageQuantity: Number(items[index].quantity) || 1 };
                  setOrderDraft({ ...orderDraft, items });
                }} required><option value="">Select a product</option>{dashboard?.products.map((candidate) => <option key={candidate.id} value={candidate.id} disabled={orderDraft.items.some((other, otherIndex) => otherIndex !== index && other.productId === candidate.id)}>{candidate.name}{candidate.size ? ` · ${candidate.size}` : ""} ({candidate.availableStock} available)</option>)}</select></label>
                <label>Individual units<input type="number" min="1" max="100000" step="1" value={item.quantity} onChange={(event) => { const items = [...orderDraft.items]; items[index] = { ...items[index], quantity: event.target.value, packagingLabel: "Single unit", unitsPerPackage: 1, packageQuantity: Number(event.target.value) || 1 }; setOrderDraft({ ...orderDraft, items }); }} required/></label>
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
            {selectedOrder.hasPaymentProof && <section className="mf-order-payment-proof"><h3>Payment screenshot</h3><a href={`/api/telegram/miniapp/orders/${encodeURIComponent(selectedOrder.orderNumber)}/payment-proof`} target="_blank" rel="noreferrer"><img src={`/api/telegram/miniapp/orders/${encodeURIComponent(selectedOrder.orderNumber)}/payment-proof`} alt={`Payment proof for ${selectedOrder.orderNumber}`}/><span>Open full-size screenshot</span></a></section>}
            <div className="mf-order-detail-items"><h3>Items</h3>{selectedOrder.items.map((item) => <div key={item.id}><span>{item.name}{item.sku ? ` · ${item.sku}` : ""}{[item.flavor, item.variantType, item.size].filter(Boolean).length ? ` · ${[item.flavor, item.variantType, item.size].filter(Boolean).join(" · ")}` : ""}<small>{item.packageQuantity} × {item.packagingLabel} ({item.unitsPerPackage} each · {item.quantity} individual units){formatTotalMeasure(item.size, item.quantity) ? ` · ${formatTotalMeasure(item.size, item.quantity)} total` : ""} · ETB {item.unitPrice.toLocaleString("en-ET")} / unit{item.promotionApplied && item.promotionDiscountPercent ? ` (${item.promotionDiscountPercent}% promo from ETB ${item.listUnitPrice.toLocaleString("en-ET")})` : ""}</small></span><strong>ETB {item.lineTotal.toLocaleString("en-ET")}</strong></div>)}</div>
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
        <p className="mf-product-sku">SKU <strong>{productDetails.sku}</strong></p>
        <button type="button" className="mf-product-edit-toggle" onClick={() => setEditingProduct(!editingProduct)}><Pencil size={15}/>{editingProduct ? "Cancel product edit" : "Edit product details"}</button>
        {editingProduct && <form className="mf-product-edit-form" onSubmit={(event) => void submitProductUpdate(event)}>
          <label>Product name<input name="name" defaultValue={productDetails.name} required maxLength={180}/></label>
          <label>SKU<input name="sku" defaultValue={productDetails.sku} required maxLength={120}/></label>
          <label>Category<select name="categoryId" defaultValue={productDetails.categoryId} required>{dashboard?.categories.map((category) => <option value={category.id} key={category.id} disabled={!category.isActive && category.id !== productDetails.categoryId}>{category.name}{category.isActive ? "" : " · Hidden"}</option>)}</select></label>
          <label>Flavor<input name="flavor" defaultValue={productDetails.flavor || ""} maxLength={80}/></label>
          <label>Type or style<input name="variantType" defaultValue={productDetails.variantType || ""} maxLength={80}/></label>
          <label>Package size<input name="size" defaultValue={productDetails.size || ""} maxLength={60}/></label>
          <label className="mf-product-edit-wide">Description<textarea name="description" rows={3} defaultValue={productDetails.description} maxLength={2000}/></label>
          <label className="mf-product-edit-wide">Carton options<textarea name="packagingOptions" rows={3} defaultValue={productDetails.packagingOptions.filter((option) => option.isEnabled).map((option) => `${option.label}=${option.unitsPerPackage}`).join("\n")}/><small>One option per line as label=units. Single-unit sales are always available.</small></label>
          <label>Minimum order (individual units)<input name="minimumOrderQuantity" type="number" min="1" max="100000" step="1" defaultValue={productDetails.minimumOrderQuantity} required/></label>
          <label>Promotion discount (%)<input name="promotionDiscountPercent" type="number" min="0.01" max="99.99" step="0.01" defaultValue={productDetails.promotionDiscountPercent || ""}/></label>
          <label className="mf-product-promotion-toggle"><input name="promotionEnabled" type="checkbox" defaultChecked={productDetails.promotionEnabled}/> Enable this configured promotion</label>
          <div className="mf-product-edit-actions"><button type="button" className="mf-cancel" onClick={() => setEditingProduct(false)}>Cancel</button><button type="submit" className="mf-confirm" disabled={savingCatalog}>{savingCatalog ? "Saving…" : "Save product details"}</button></div>
        </form>}
        <div className="mf-price-panel"><div><span>Individual unit price</span><strong>ETB {productDetails.price.toLocaleString("en-ET")}</strong></div>{productDetails.isActive && <button className="mf-detail-link" onClick={() => { setPriceDraft(String(productDetails.price)); setEditingPrice(!editingPrice); }}>{editingPrice ? "Cancel edit" : "Change price"}</button>}</div>
        {editingPrice && <form className="mf-price-editor" onSubmit={(event) => { event.preventDefault(); void manageAction({ action: "update-price", productId: productDetails.id, price: priceDraft }, "Price updated."); }}>
          <label className="mf-quantity-label">New price (ETB)<input type="number" min="0.01" max="1000000000" step="0.01" inputMode="decimal" value={priceDraft} onChange={(event) => setPriceDraft(event.target.value)} required /></label>
          <button type="submit" className="mf-confirm" disabled={busyAction === productDetails.id}>{busyAction === productDetails.id ? "Saving…" : "Save price"}</button>
        </form>}
        <div className="mf-product-publish">
          <div><strong>{!productDetails.isActive ? "Archived product" : productDetails.isPublished ? "Live on storefront" : "Hidden from storefront"}</strong><span>{!productDetails.isActive ? "Restore it to manage stock and publish it again." : productDetails.isPublished ? "Customers can see this product." : "Set a price and add stock before publishing."}</span></div>
          {productDetails.isActive && <button className={productDetails.isPublished ? "mf-action-reject" : "mf-confirm"} onClick={() => void manageAction({ action: "product-publish-update", productId: productDetails.id, isPublished: !productDetails.isPublished }, productDetails.isPublished ? "Product hidden from storefront." : "Product published.")} disabled={busyAction === productDetails.id || (!productDetails.isPublished && (!productDetails.categoryIsActive || productDetails.price <= 0 || productDetails.availableStock <= 0))}>{busyAction === productDetails.id ? "Saving…" : productDetails.isPublished ? <><EyeOff size={15}/> Hide product</> : <><Eye size={15}/> Publish product</>}</button>}
        </div>
        <label className="mf-image-upload">Product image gallery <span>Select up to 5 PNG or JPG images · 2 MB each</span><input type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" multiple onChange={(event) => void updateCatalogImage(event, "product-gallery-update", productDetails.id)}/></label>
        <div className="mf-detail-stock"><div><strong>{productDetails.availableStock}</strong><span>Available</span></div><div><strong>{productDetails.stock}</strong><span>Total stock</span></div><div><strong>{productDetails.reservedStock}</strong><span>Reserved</span></div></div>
        <div className="mf-detail-actions">
          {productDetails.isActive && <button className="mf-restock" onClick={() => { setSelected(productDetails); setQuantity("24"); setProductDetails(null); }}><ArrowDownToLine size={16}/> Restock</button>}
          {productDetails.isActive && <button className="mf-action-reject" onClick={() => { if (window.confirm(`Set ${productDetails.name} stock to zero?`)) void manageAction({ action: "set-out-of-stock", productId: productDetails.id }, "Product marked out of stock.", true); }} disabled={productDetails.stock === 0 || productDetails.reservedStock > 0 || busyAction === productDetails.id}>{productDetails.reservedStock > 0 ? "Reserved units prevent this" : "Set stock to zero"}</button>}
          <button className={productDetails.isActive ? "mf-action-reject" : "mf-confirm"} onClick={() => toggleProductArchive(productDetails)} disabled={busyAction === productDetails.id}>{productDetails.isActive ? <><Archive size={15}/> Archive</> : <><RotateCcw size={15}/> Restore product</>}</button>
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

      {editingCategory && <div className="mf-modal-backdrop" onClick={() => !savingCatalog && setEditingCategory(null)}><section className="mf-modal mf-category-edit-modal" role="dialog" aria-modal="true" aria-labelledby="category-edit-title" onClick={(event) => event.stopPropagation()}>
        <button className="mf-modal-close" onClick={() => setEditingCategory(null)} disabled={savingCatalog}>×</button>
        <span className="mf-kicker">CATALOG SETTINGS</span><h2 id="category-edit-title">Edit category</h2>
        <p>Update how this product family is organized and displayed.</p>
        <form className="mf-category-edit-form" onSubmit={(event) => void submitCategoryUpdate(event)}>
          <label>Category name<input name="name" defaultValue={editingCategory.name} required maxLength={100}/></label>
          <label>Description<textarea name="description" defaultValue={editingCategory.description} rows={4} maxLength={500}/></label>
          <div className="mf-product-edit-actions"><button type="button" className="mf-cancel" onClick={() => setEditingCategory(null)} disabled={savingCatalog}>Cancel</button><button type="submit" className="mf-confirm" disabled={savingCatalog}>{savingCatalog ? "Saving…" : "Save category"}</button></div>
        </form>
      </section></div>}

      {selected && <div className="mf-modal-backdrop" onClick={() => !saving && setSelected(null)}><section className="mf-modal mf-restock-modal" role="dialog" aria-modal="true" aria-labelledby="restock-title" onClick={(e) => e.stopPropagation()}><button className="mf-modal-close" onClick={() => setSelected(null)} disabled={saving}>×</button><span className="mf-kicker">INVENTORY UPDATE</span><h2 id="restock-title">Restock product</h2><p>{selected.name}{selected.variantType || selected.size ? ` · ${[selected.variantType, selected.size].filter(Boolean).join(" · ")}` : ""}</p><div className="mf-restock-stock-grid"><div><strong>{selected.availableStock}</strong><span>Available</span></div><div><strong>{selected.stock}</strong><span>Total stock</span></div><div><strong>{selected.reservedStock}</strong><span>Reserved</span></div></div><label className="mf-quantity-label">Quantity to add<input type="number" min="1" max="100000" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric"/></label><div className="mf-restock-presets"><span>Quick add</span>{[12, 24, 48].map((amount) => <button type="button" key={amount} className={quantity === String(amount) ? "is-active" : ""} onClick={() => setQuantity(String(amount))}>{amount}</button>)}</div><div className="mf-modal-actions"><button className="mf-cancel" onClick={() => setSelected(null)} disabled={saving}>Cancel</button><button className="mf-confirm" onClick={() => void restock()} disabled={saving}>{saving ? "Updating…" : "Confirm restock"}</button></div></section></div>}
      <footer className="mf-footer">MILANO FOODS <span>·</span> INTERNAL MANAGEMENT</footer>
    </main>
  );
}

function Stat({ icon, label, value, loading, warning = false, tone = "" }: { icon: React.ReactNode; label: string; value?: number; loading: boolean; warning?: boolean; tone?: string }) {
  return <article className={`mf-stat${warning ? " is-warning" : ""}${tone ? ` is-${tone}` : ""}`}><div className="mf-stat-icon">{icon}</div><span>{label}</span><strong>{loading && value === undefined ? "—" : (value ?? 0).toLocaleString("en-ET")}</strong></article>;
}

function PaymentMethodLogo({ code }: { code: PaymentMethodConfig["code"] }) {
  const logos: Record<PaymentMethodConfig["code"], { src: string; alt: string }> = {
    cbe: { src: "/images/payment-methods/cbe.jpg", alt: "Commercial Bank of Ethiopia" },
    telebirr: { src: "/images/payment-methods/telebirr.png", alt: "Telebirr" },
    awash: { src: "/images/payment-methods/awash.png", alt: "Awash Bank" },
    boa: { src: "/images/payment-methods/boa.png", alt: "Bank of Abyssinia" },
  };
  const logo = logos[code];
  return <span className={`mf-payment-logo mf-payment-logo-${code}`}><Image src={logo.src} alt={logo.alt} width={100} height={60}/></span>;
}
