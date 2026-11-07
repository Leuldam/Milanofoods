"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
// import Image from "next/image"; // Removed heavy image import for minimal UI
import {
  Activity,
  Archive,
  ArrowDownToLine,
  Banknote,
  BarChart3,
  Bell,
  Boxes,
  Check,
  CheckCheck,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  Leaf,
  LogOut,
  MessageSquare,
  Package,
  PanelLeft,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  SquarePen,
  Star,
  ThumbsUp,
  Trash2,
  TriangleAlert,
  Truck,
  X,
} from "lucide-react";
import { groupProductVariants } from "@/lib/product-variants";
import { formatTotalMeasure } from "@/lib/product-pricing";
import "./miniapp.css";
import "./miniapp-auth.css";
import "./miniapp-management.css";

const PAYMENT_LOGOS: Record<string, string> = {
  telebirr: "/images/payment-methods/telebirr.png",
  cbe: "/images/payment-methods/cbe.jpg",
  boa: "/images/payment-methods/boa.png",
  awash: "/images/payment-methods/awash.png",
};

// ── Types ───────────────────────────────────────────────────────────────────
type Product = {
  id: string;
  sku: string;
  categoryId: string;
  categoryIsActive: boolean;
  slug: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string | null;
  galleryImageUrls: string[];
  size: string | null;
  flavor: string | null;
  variantType: string | null;
  price: number;
  stock: number;
  reservedStock: number;
  availableStock: number;
  minimumOrderQuantity: number;
  promotionEnabled: boolean;
  promotionDiscountPercent: string | null;
  packagingOptions: { id: string; label: string; unitsPerPackage: number; isEnabled: boolean }[];
  isPublished: boolean;
  isActive: boolean;
  lowStock: boolean;
  stockMovements: StockMovement[];
  priceChanges: PriceChange[];
};

type InventoryProductGroup = { key: string; label: string; category: string; products: Product[] };

type ProductCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  isActive: boolean;
  productCount: number;
};

type PriceChange = { id: string; previousPrice: number; newPrice: number; createdAt: string };

type StockMovement = {
  id: string;
  change: number;
  previousStock: number;
  newStock: number;
  reason: string;
  orderNumber: string | null;
  createdAt: string;
};

type OrderItem = {
  id: string;
  productId: string | null;
  sku: string;
  name: string;
  size: string | null;
  flavor: string | null;
  variantType: string | null;
  packagingLabel: string;
  unitsPerPackage: number;
  packageQuantity: number;
  quantity: number;
  unitPrice: number;
  listUnitPrice: number;
  promotionApplied: boolean;
  promotionDiscountPercent: string | null;
  lineTotal: number;
};

type Order = {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  company: string | null;
  fulfillment: string;
  city: string | null;
  deliveryAddress: string | null;
  pickupLocation: string | null;
  paymentPreference: string;
  hasPaymentProof: boolean;
  notes: string | null;
  deliveryFee: number;
  total: number;
  status: string;
  itemCount: number;
  items: OrderItem[];
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
  id: string;
  productName: string;
  displayName: string;
  rating: number;
  comment: string;
  orderNumber: string;
  createdAt: string;
};

type Dashboard = {
  operator: { name: string; authMethod?: "telegram" | "password" };
  summary: {
    productCount: number;
    totalUnits: number;
    reservedUnits: number;
    availableUnits: number;
    lowStockCount: number;
    pendingOrders: number;
    orderStatusCounts: Record<string, number>;
    pendingReviews: number;
    approvedReviews: number;
  };
  products: Product[];
  categories: ProductCategory[];
  orders: Order[];
  pendingReviews: PendingReview[];
  approvedReviews: PendingReview[];
  paymentMethods: PaymentMethodConfig[];
};

type SalesPeriod = "daily" | "weekly" | "monthly" | "yearly";

type SalesProduct = {
  productId: string | null;
  name: string;
  size: string | null;
  category: string | null;
  units: number;
  revenue: number;
  availableStock: number | null;
};

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

type Section = "overview" | "inventory" | "orders" | "sales" | "reviews" | "payments";

function SwipeAction({
  label,
  disabled,
  onComplete,
}: {
  label: string;
  disabled: boolean;
  onComplete: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [travel, setTravel] = useState(0);

  function getProgress(clientX: number) {
    const track = trackRef.current;
    if (!track) return 0;
    const bounds = track.getBoundingClientRect();
    const thumbRadius = 22;
    const maxTravel = Math.max(0, bounds.width - thumbRadius * 2 - 8);
    setTravel(maxTravel);
    return maxTravel === 0
      ? 0
      : Math.max(0, Math.min(100, ((clientX - bounds.left - thumbRadius - 4) / maxTravel) * 100));
  }

  function complete() {
    if (disabled) return;
    setProgress(0);
    onComplete();
  }

  return (
    <div
      ref={trackRef}
      className={`mf-swipe-action${disabled ? " is-disabled" : ""}${progress > 0 ? " is-dragging" : ""}${progress >= 78 ? " is-complete" : ""}`}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Slide to ${label}. Use arrow keys to advance or press Enter to complete.`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      aria-valuetext={progress >= 90 ? `Release to ${label}` : `Slide to ${label}`}
      aria-disabled={disabled}
      onPointerDown={(event) => {
        if (disabled || !event.isPrimary) return;
        draggingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        setProgress(getProgress(event.clientX));
      }}
      onPointerMove={(event) => {
        if (draggingRef.current) setProgress(getProgress(event.clientX));
      }}
      onPointerUp={(event) => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        const finalProgress = getProgress(event.clientX);
        if (finalProgress >= 90) complete();
        else setProgress(0);
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
        setProgress(0);
      }}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "ArrowRight" || event.key === "ArrowUp") {
          event.preventDefault();
          const nextProgress = Math.min(100, progress + 10);
          setProgress(nextProgress);
          if (nextProgress === 100) complete();
        } else if (event.key === "ArrowLeft" || event.key === "ArrowDown" || event.key === "Home") {
          event.preventDefault();
          setProgress(0);
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          complete();
        }
      }}
    >
      <span className="mf-swipe-action-fill" style={{ width: `${progress}%` }} />
      <span className="mf-swipe-action-label">
        {progress >= 90 ? `Release to ${label}` : `Slide to ${label}`}
      </span>
      <span
        className="mf-swipe-action-thumb"
        style={{ left: `${4 + (travel * progress) / 100}px` }}
        aria-hidden="true"
      >
        <ChevronRight size={20} />
      </span>
    </div>
  );
}

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
  items: {
    productId: string;
    quantity: string;
    unitPrice: string;
    packagingLabel: string;
    unitsPerPackage: number;
    packageQuantity: number;
  }[];
};

// ── Telegram WebApp SDK helpers ──────────────────────────────────────────────
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe?: { user?: { first_name?: string } };
        isVersionAtLeast?: (version: string) => boolean;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        HapticFeedback?: {
          impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
          notificationOccurred: (type: "error" | "success" | "warning") => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

function triggerHaptic(type: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "medium") {
  try {
    const haptic = window.Telegram?.WebApp?.HapticFeedback;
    if (!haptic) return;
    if (type === "success" || type === "warning" || type === "error") {
      haptic.notificationOccurred(type);
    } else {
      haptic.impactOccurred(type);
    }
  } catch {
    // ignore
  }
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `The server returned an unexpected response (HTTP ${response.status}). Refresh and try again.`,
    );
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("The server response was incomplete. Please refresh and try again.");
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

function MiniAppSkeleton({ className }: { className: string }) {
  return <span className={`mf-skeleton ${className}`} aria-hidden="true" />;
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function MilanoMiniAppPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [loginRequired, setLoginRequired] = useState(false);
  const [phone, setPhone] = useState("");
  const [passcode, setPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [passwordAuthenticated, setPasswordAuthenticated] = useState(false);

  // Navigation
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Sales
  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>("monthly");
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState("");
  const [salesReload, setSalesReload] = useState(0);

  // Filters & Search
  const [query, setQuery] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderStatus, setOrderStatus] = useState("PENDING");
  const [reviewStatus, setReviewStatus] = useState<"PENDING" | "APPROVED">("PENDING");
  const [inventoryFilter, setInventoryFilter] = useState("ALL");
  const [inventoryCategory, setInventoryCategory] = useState("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [activeVariantMap, setActiveVariantMap] = useState<Record<string, string>>({});
  const [activeTypeMap, setActiveTypeMap] = useState<Record<string, string>>({});
  const [expandedGroupMap, setExpandedGroupMap] = useState<Record<string, boolean>>({});

  // Selection & Modals
  const [selected, setSelected] = useState<Product | null>(null); // For restock modal
  const [productDetails, setProductDetails] = useState<Product | null>(null); // For product details modal
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
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [categorySlide, setCategorySlide] = useState(0);
  const categoryCarouselRef = useRef<HTMLDivElement>(null);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [editingProduct, setEditingProduct] = useState(false);
  const [editingPromo, setEditingPromo] = useState(false);
  const [promoDraft, setPromoDraft] = useState({ enabled: false, discount: "" });

  const initData = useCallback(() => window.Telegram?.WebApp?.initData || "", []);

  function scrollCategoryCarousel(direction: -1 | 1) {
    const carousel = categoryCarouselRef.current;
    if (!carousel) return;
    const card = carousel.querySelector<HTMLElement>(".mf-category-card");
    const gap = Number.parseFloat(getComputedStyle(carousel).columnGap) || 0;
    carousel.scrollBy({ left: direction * ((card?.offsetWidth || carousel.clientWidth) + gap), behavior: "smooth" });
  }

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  // ── Load Dashboard ─────────────────────────────────────────────────────────
  const loadDashboard = useCallback(
    async (isManualRefresh = false): Promise<Dashboard | null> => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
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
        setPaymentDrafts(
          Object.fromEntries(payload.paymentMethods.map((method) => [method.code, method])),
        );
        setPasswordAuthenticated(payload.operator.authMethod === "password");
        setLoginRequired(false);
        if (isManualRefresh) triggerHaptic("success");

        // Preload sales analytics for the overview dashboard
        try {
          const salesRes = await fetch(`/api/telegram/miniapp/sales?period=${salesPeriod}`, {
            headers: { "x-telegram-init-data": initData() },
            cache: "no-store",
          });
          if (salesRes.ok) {
            const report = await readApiResponse<SalesReport>(salesRes);
            setSalesReport(report);
          }
        } catch {
          // silent fallback
        }

        return payload;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to connect.");
        if (isManualRefresh) triggerHaptic("error");
        return null;
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [initData],
  );

  // ── Authentication ─────────────────────────────────────────────────────────
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
      const payload = await readApiResponse<{ ok?: boolean; name?: string; error?: string }>(response);
      if (!response.ok) throw new Error(payload.error || "Unable to sign in.");
      setPasswordAuthenticated(true);
      setLoginRequired(false);
      setPasscode("");
      triggerHaptic("success");
      await loadDashboard();
    } catch (err) {
      triggerHaptic("error");
      setLoginError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function signOut() {
    setError("");
    try {
      const response = await fetch("/api/telegram/miniapp/auth", { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to sign out.");
      setDashboard(null);
      setPasswordAuthenticated(false);
      setLoginRequired(true);
      setMoreMenuOpen(false);
      triggerHaptic("medium");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign out.");
    }
  }

  // ── Telegram WebApp Ready ──────────────────────────────────────────────────
  useEffect(() => {
    const telegramWebApp = window.Telegram?.WebApp;
    telegramWebApp?.ready();
    telegramWebApp?.expand();
    if (telegramWebApp?.isVersionAtLeast?.("6.1")) {
      telegramWebApp.setHeaderColor?.("#03291f");
      telegramWebApp.setBackgroundColor?.("#f4f6f3");
    }
    void loadDashboard();
  }, [loadDashboard]);

  // ── Load Sales Report ──────────────────────────────────────────────────────
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
    return () => {
      cancelled = true;
    };
  }, [activeSection, initData, salesPeriod, salesReload]);

  // ── Memoized Data & Filters ────────────────────────────────────────────────
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

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const product of dashboard?.products || []) {
      if (product.isActive) {
        map[product.category] = (map[product.category] || 0) + 1;
      }
    }
    return map;
  }, [dashboard]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (dashboard?.products || []).filter(
      (product) =>
        (inventoryFilter === "ARCHIVED"
          ? !product.isActive
          : product.isActive &&
          (inventoryFilter === "ALL" ||
            (inventoryFilter === "LOW" && product.lowStock) ||
            (inventoryFilter === "OUT" && product.stock === 0))) &&
        (inventoryCategory === "ALL" || product.category === inventoryCategory) &&
        (!term ||
          product.name.toLowerCase().includes(term) ||
          product.category.toLowerCase().includes(term) ||
          product.slug.toLowerCase().includes(term) ||
          (product.flavor || "").toLowerCase().includes(term) ||
          (product.variantType || "").toLowerCase().includes(term)),
    );
  }, [dashboard, inventoryCategory, inventoryFilter, query]);

  const inventoryGroups = useMemo(() => {
    const categoryOrder = new Map(
      (dashboard?.categories || []).map((category, index) => [category.name, index]),
    );
    return groupProductVariants(filteredProducts)
      .map(
        ({ key, product, variants }): InventoryProductGroup => ({
          key,
          category: product.category,
          products: variants,
          label:
            product.flavor && product.category === "Ice Cream Powders"
              ? `${product.flavor} Ice Cream`
              : product.flavor && product.category === "Milkshake Powders"
                ? `${product.flavor} Milkshake`
                : product.name,
        }),
      )
      .sort(
        (first, second) =>
          (categoryOrder.get(first.category) ?? Number.MAX_SAFE_INTEGER) -
          (categoryOrder.get(second.category) ?? Number.MAX_SAFE_INTEGER) ||
          first.label.localeCompare(second.label, undefined, { sensitivity: "base", numeric: true }),
      );
  }, [dashboard?.categories, filteredProducts]);

  const filteredOrders = useMemo(() => {
    const term = orderQuery.trim().toLowerCase();
    return (dashboard?.orders || []).filter(
      (order) =>
        (orderStatus === "ALL" || order.status === orderStatus) &&
        (!term ||
          order.orderNumber.toLowerCase().includes(term) ||
          order.customerName.toLowerCase().includes(term) ||
          order.customerPhone.includes(term)),
    );
  }, [dashboard, orderQuery, orderStatus]);

  const visibleReviews =
    reviewStatus === "PENDING"
      ? dashboard?.pendingReviews || []
      : dashboard?.approvedReviews || [];

  const allApprovedReviews = dashboard?.approvedReviews || [];
  const avgRating =
    allApprovedReviews.length > 0
      ? (allApprovedReviews.reduce((acc, r) => acc + r.rating, 0) / allApprovedReviews.length).toFixed(1)
      : "5.0";

  const positiveReviewsCount = allApprovedReviews.filter((r) => r.rating >= 4).length;
  const positiveRatio =
    allApprovedReviews.length > 0
      ? `${Math.round((positiveReviewsCount / allApprovedReviews.length) * 100)}%`
      : "100%";

  const maxTimelineRevenue = Math.max(1, ...(salesReport?.timeline.map((point) => point.revenue) || []));
  const maxProductUnits = Math.max(1, ...(salesReport?.products.slice(0, 5).map((product) => product.units) || []));

  const draftOrderTotal = orderDraft
    ? orderDraft.items.reduce((total, item) => {
      const lineTotal = Number(item.quantity) * Number(item.unitPrice);
      return total + (Number.isFinite(lineTotal) ? lineTotal : 0);
    }, Number.isFinite(Number(orderDraft.deliveryFee)) ? Number(orderDraft.deliveryFee) : 0)
    : 0;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const orderStats = useMemo(() => {
    const orders = dashboard?.orders || [];
    const pending = orders.filter((o) => o.status === "PENDING");
    const confirmed = orders.filter((o) => o.status === "CONFIRMED");
    const inFulfillment = orders.filter(
      (o) => o.status === "PREPARING" || o.status === "READY_FOR_PICKUP" || o.status === "OUT_FOR_DELIVERY",
    );
    const completed = orders.filter((o) => o.status === "COMPLETED");
    const cancelled = orders.filter((o) => o.status === "CANCELLED");

    const pendingRevenue = pending.reduce((sum, o) => sum + o.total, 0);
    const confirmedRevenue = confirmed.reduce((sum, o) => sum + o.total, 0);
    const completedRevenue = completed.reduce((sum, o) => sum + o.total, 0);

    return {
      pendingCount: pending.length,
      pendingRevenue,
      confirmedCount: confirmed.length,
      confirmedRevenue,
      inFulfillmentCount: inFulfillment.length,
      completedCount: completed.length,
      completedRevenue,
      cancelledCount: cancelled.length,
      totalCount: orders.length,
    };
  }, [dashboard?.orders]);

  const fulfillmentStats = useMemo(() => {
    const orders = dashboard?.orders || [];
    if (!orders.length) return { deliveryRatio: 75, pickupRatio: 25 };
    const deliveries = orders.filter((o) => o.fulfillment === "DELIVERY").length;
    const deliveryRatio = Math.round((deliveries / orders.length) * 100);
    return { deliveryRatio, pickupRatio: 100 - deliveryRatio };
  }, [dashboard?.orders]);

  function getInitials(name: string) {
    if (!name) return "MF";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function formatOrderDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-ET", { month: "short", day: "numeric" });
  }

  // ── Actions ────────────────────────────────────────────────────────────────
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
      triggerHaptic("warning");
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
      const payload = await readApiResponse<{
        product: string;
        added: number;
        availableStock: number;
        telegramNotified?: boolean;
        error?: string;
      }>(response);
      if (!response.ok) throw new Error(payload.error || "Restock failed.");
      triggerHaptic("success");
      setNotice(`✅ Added ${payload.added} unit(s) to ${payload.product}. Available stock: ${payload.availableStock}`);
      setSelected(null);
      await loadDashboard();
    } catch (err) {
      triggerHaptic("error");
      setError(err instanceof Error ? err.message : "Restock failed.");
    } finally {
      setSaving(false);
    }
  }

  async function manageAction(
    payload: Record<string, unknown>,
    successMessage: string,
    closeDetails = false,
    closeOrderDetails = false,
  ) {
    const actionId = String(
      payload.orderNumber || payload.reviewId || payload.productId || payload.code || payload.action || "action",
    );
    setBusyAction(actionId);
    setError("");
    setOrderActionError("");
    try {
      const response = await fetch("/api/telegram/miniapp", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-telegram-init-data": initData() },
        body: JSON.stringify(payload),
      });
      const result = await readApiResponse<{ message?: string; error?: string; telegramNotified?: boolean }>(
        response,
      );
      if (!response.ok) throw new Error(result.error || "Action failed. Please try again.");
      triggerHaptic("success");
      if (closeDetails) setProductDetails(null);
      if (closeOrderDetails) {
        setSelectedOrder(null);
        setOrderDraft(null);
      }
      if (payload.action === "category-update") setEditingCategory(null);
      setNotice(result.message || successMessage);
      const refreshed = await loadDashboard();
      if (refreshed && payload.orderNumber && selectedOrder && !closeOrderDetails) {
        setSelectedOrder(
          refreshed.orders.find((order) => order.orderNumber === selectedOrder.orderNumber) || null,
        );
      }
      if (refreshed && productDetails && !closeDetails) {
        setProductDetails(refreshed.products.find((product) => product.id === productDetails.id) || null);
      }
      if (payload.action === "order-update") setOrderDraft(null);
    } catch (err) {
      triggerHaptic("error");
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
      triggerHaptic("success");
      const refreshed = await loadDashboard();
      if (refreshed && productDetails) {
        setProductDetails(refreshed.products.find((product) => product.id === productDetails.id) || null);
      }
      setNotice(result.message || fallbackMessage);
      return true;
    } catch (err) {
      triggerHaptic("error");
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
      const saved = await saveCatalogAction(
        {
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
        },
        "Product added as hidden.",
      );
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
      const imageData = file instanceof File && file.size > 0 ? await readProductImage(file) : undefined;
      const saved = await saveCatalogAction(
        {
          action: "category-create",
          name: values.get("name"),
          description: values.get("description"),
          imageData,
        },
        "Category added.",
      );
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
    const saved = await saveCatalogAction(
      {
        action: "category-update",
        categoryId: editingCategory.id,
        name: values.get("name"),
        description: values.get("description"),
      },
      "Category updated.",
    );
    if (saved) setEditingCategory(null);
  }

  async function submitProductUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productDetails) return;
    const values = new FormData(event.currentTarget);
    const saved = await saveCatalogAction(
      {
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
      },
      "Product details updated.",
    );
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
      await saveCatalogAction(
        {
          action,
          ...(action === "product-gallery-update" ? { productId: id } : { categoryId: id }),
          ...(action === "product-gallery-update" ? { galleryData: images } : { imageData: images[0] }),
        },
        action === "product-gallery-update" ? "Product images updated." : "Category photo updated.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to read the selected image.");
    }
  }

  function openProductDetails(product: Product, startEditing = false) {
    setProductDetails(product);
    setPriceDraft(String(product.price));
    setPromoDraft({
      enabled: product.promotionEnabled,
      discount: product.promotionDiscountPercent || "",
    });
    setEditingPrice(false);
    setEditingPromo(false);
    setEditingProduct(startEditing);
    triggerHaptic("light");
  }

  function toggleProductArchive(product: Product) {
    const nextIsActive = !product.isActive;
    const message = nextIsActive
      ? `Restore ${product.name} to active inventory?`
      : `Archive ${product.name}? It will be hidden from storefront and active inventory.`;
    if (!window.confirm(message)) return;
    void manageAction(
      { action: "product-status-update", productId: product.id, isActive: nextIsActive },
      nextIsActive ? "Product restored." : "Product archived.",
      true,
    );
  }

  // ── Render: Login Screen ───────────────────────────────────────────────────
  if (loginRequired) {
    return (
      <main className="mf-admin">
        <div className="mf-login-wrap">
          <div className="mf-login-box">
            <div className="mf-login-logo">
              <Leaf size={38} color="#073d2e" style={{ margin: "0 auto" }} />
              <h1>Milano Foods</h1>
              <span>Business Management</span>
              <p>Sign in with your administrator phone and passcode</p>
            </div>

            <form onSubmit={signIn}>
              <div className="mf-input-group">
                <label>Phone number</label>
                <div style={{ position: "relative" }}>
                  <input
                    className="mf-input"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="09... or +251..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  <Phone
                    size={17}
                    color="#8e9b92"
                    style={{ position: "absolute", right: "12px", top: "14px", pointerEvents: "none" }}
                  />
                </div>
              </div>

              <div className="mf-input-group">
                <label>Passcode / Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    className="mf-input"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter passcode"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "12px",
                      background: "transparent",
                      border: "0",
                      color: "#8e9b92",
                      cursor: "pointer",
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="mf-error" style={{ margin: "10px 0" }}>
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                className="mf-btn-primary"
                style={{ width: "100%", height: "46px", marginTop: "12px", fontSize: "14px" }}
                disabled={loginBusy}
                aria-busy={loginBusy}
              >
                {loginBusy ? <><RefreshCw size={16} className="mf-loading-spin" /> Signing in securely…</> : "Sign In Securely"}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: "20px", color: "#8e9b92", fontSize: "11px" }}>
              Milano Food Processing PLC · Addis Ababa, Ethiopia
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Render: Authenticated MiniApp ──────────────────────────────────────────
  return (
    <main className="mf-admin">
      {/* ── Top Header Bar ── */}
      <header className="mf-topbar">
        <div className="mf-topbar-brand">
          <Leaf className="mf-brand-mark" size={22} aria-hidden="true" />
          <div className="mf-brand-text">
            <div className="mf-brand">
              MILANO
            </div>
            <p>Management</p>
          </div>
        </div>

        {/* Desktop Header Navigation Tabs */}
        <nav className="mf-topbar-nav" aria-label="Desktop navigation">
          <button
            type="button"
            className={`mf-nav-tab${activeSection === "overview" ? " is-active" : ""}`}
            onClick={() => {
              triggerHaptic("light");
              setActiveSection("overview");
            }}
          >
            <LayoutDashboard size={14} /> Overview
          </button>

          <button
            type="button"
            className={`mf-nav-tab${activeSection === "orders" ? " is-active" : ""}`}
            onClick={() => {
              triggerHaptic("light");
              setActiveSection("orders");
            }}
          >
            <ShoppingBag size={14} /> Orders
            {Boolean(dashboard?.summary.pendingOrders) && (
              <span className="mf-nav-tab-badge">{dashboard?.summary.pendingOrders}</span>
            )}
          </button>

          <button
            type="button"
            className={`mf-nav-tab${activeSection === "inventory" ? " is-active" : ""}`}
            onClick={() => {
              triggerHaptic("light");
              setActiveSection("inventory");
            }}
          >
            <Package size={14} /> Inventory
            {Boolean(dashboard?.summary.lowStockCount) && (
              <span className="mf-nav-tab-badge is-danger">{dashboard?.summary.lowStockCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`mf-nav-tab${activeSection === "sales" ? " is-active" : ""}`}
            onClick={() => {
              triggerHaptic("light");
              setActiveSection("sales");
            }}
          >
            <BarChart3 size={14} /> Analytics
          </button>

          <button
            type="button"
            className={`mf-nav-tab${activeSection === "reviews" ? " is-active" : ""}`}
            onClick={() => {
              triggerHaptic("light");
              setActiveSection("reviews");
            }}
          >
            <MessageSquare size={14} /> Reviews
            {Boolean(dashboard?.summary.pendingReviews) && (
              <span className="mf-nav-tab-badge">{dashboard?.summary.pendingReviews}</span>
            )}
          </button>

          <button
            type="button"
            className={`mf-nav-tab${activeSection === "payments" ? " is-active" : ""}`}
            onClick={() => {
              triggerHaptic("light");
              setActiveSection("payments");
            }}
          >
            <Banknote size={14} /> Payments
          </button>
        </nav>

        <div className="mf-topbar-actions">
          <div className="mf-user-pill">
            <span className="mf-live-dot" />
            <span>{dashboard?.operator.name?.split(" ")[0] || "Admin"}</span>
          </div>

          <button
            type="button"
            className="mf-topbar-btn"
            onClick={() => {
              triggerHaptic("medium");
              setActiveSection("orders");
              setOrderStatus("PENDING");
            }}
            aria-label="Pending orders"
          >
            <Bell size={16} />
            {Boolean(dashboard?.summary.pendingOrders) && (
              <span className="mf-badge">{dashboard?.summary.pendingOrders}</span>
            )}
          </button>

          <button
            type="button"
            className={`mf-topbar-btn${refreshing ? " is-refreshing" : ""}`}
            onClick={() => void loadDashboard(true)}
            aria-label="Refresh dashboard"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>

          {passwordAuthenticated && (
            <button
              type="button"
              className="mf-topbar-btn"
              onClick={() => void signOut()}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="mf-app-layout">
        <div className="mf-main-content">
          {notice && (
            <div className="mf-notice" role="status">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{notice}</span>
              <button onClick={() => setNotice("")}>×</button>
            </div>
          )}

          {error && (
            <div className="mf-error" role="alert">
              <span>{error}</span>
              <button onClick={() => void loadDashboard()}>Retry</button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SECTION: OVERVIEW (Minimalist, Analytical, Actionable)
             ══════════════════════════════════════════════════════════════════ */}
          {activeSection === "overview" && (
            <>
              {/* Minimalist Hero Greeting Bar */}
              <div className="mf-hero-bar">
                <div className="mf-hero-greeting">
                  <h1>{greeting}, {dashboard?.operator.name?.split(" ")[0] || "Operator"}</h1>
                  <p>
                    Live Operations Snapshot ·{" "}
                    {new Date().toLocaleDateString("en-ET", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

              </div>

              {/* 4 Analytical KPI Cards */}
              <div className="mf-kpi-grid" aria-busy={loading && !dashboard}>
                {/* 1. Revenue */}
                <div
                  className="mf-kpi-card"
                  onClick={() => {
                    triggerHaptic("light");
                    setActiveSection("sales");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className="mf-kpi-head">
                    <span className="mf-kpi-title">Monthly Revenue</span>
                    <div className="mf-kpi-icon is-purple">
                      <BarChart3 size={15} />
                    </div>
                  </div>
                  <div className="mf-kpi-value">
                    {loading && !dashboard
                      ? <MiniAppSkeleton className="mf-skeleton-kpi-value" />
                      : `ETB ${(salesReport?.totalRevenue ?? orderStats.completedRevenue).toLocaleString("en-ET", {
                        maximumFractionDigits: 0,
                      })}`}
                  </div>
                  <div className="mf-kpi-sub">
                    {salesReport?.revenueChangePercent !== null && salesReport?.revenueChangePercent !== undefined ? (
                      <span className={`mf-trend-badge ${salesReport.revenueChangePercent >= 0 ? "is-up" : "is-down"}`}>
                        {salesReport.revenueChangePercent >= 0 ? "↑ +" : "↓ "}
                        {Math.abs(salesReport.revenueChangePercent).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="mf-trend-badge is-up">● Live</span>
                    )}
                    <span>vs last period</span>
                  </div>
                </div>

                {/* 2. Orders Pipeline */}
                <div
                  className="mf-kpi-card"
                  onClick={() => {
                    triggerHaptic("light");
                    setActiveSection("orders");
                    setOrderStatus("PENDING");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className="mf-kpi-head">
                    <span className="mf-kpi-title">Orders Pipeline</span>
                    <div className="mf-kpi-icon is-blue">
                      <ShoppingBag size={15} />
                    </div>
                  </div>
                  <div className="mf-kpi-value">
                    {loading && !dashboard ? <MiniAppSkeleton className="mf-skeleton-kpi-value short" /> : dashboard?.orders.length ?? 0}
                  </div>
                  <div className="mf-kpi-sub">
                    {Boolean(dashboard?.summary.pendingOrders) ? (
                      <span className="mf-trend-badge is-down" style={{ background: "#fef3c7", color: "#b45309" }}>
                        ⏳ {dashboard?.summary.pendingOrders} Pending
                      </span>
                    ) : (
                      <span className="mf-trend-badge is-up">✓ Up to date</span>
                    )}
                    <span>({orderStats.completedCount} completed)</span>
                  </div>
                </div>

                {/* 3. Total Stock */}
                <div
                  className="mf-kpi-card"
                  onClick={() => {
                    triggerHaptic("light");
                    setActiveSection("inventory");
                    setInventoryFilter("ALL");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className="mf-kpi-head">
                    <span className="mf-kpi-title">Warehouse Units</span>
                    <div className="mf-kpi-icon is-green">
                      <Boxes size={15} />
                    </div>
                  </div>
                  <div className="mf-kpi-value">
                    {loading && !dashboard
                      ? <MiniAppSkeleton className="mf-skeleton-kpi-value" />
                      : (dashboard?.summary.totalUnits ?? 0).toLocaleString("en-ET")}
                  </div>
                  <div className="mf-kpi-sub">
                    <span className="mf-trend-badge is-up">
                      {(dashboard?.summary.availableUnits ?? 0).toLocaleString("en-ET")}
                    </span>
                    <span>ready to dispatch</span>
                  </div>
                </div>

                {/* 4. Stock Health */}
                <div
                  className="mf-kpi-card"
                  onClick={() => {
                    triggerHaptic("light");
                    setActiveSection("inventory");
                    setInventoryFilter("LOW");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className="mf-kpi-head">
                    <span className="mf-kpi-title">Low Stock Alert</span>
                    <div className={`mf-kpi-icon ${dashboard?.summary.lowStockCount ? "is-amber" : "is-green"}`}>
                      <TriangleAlert size={15} />
                    </div>
                  </div>
                  <div
                    className="mf-kpi-value"
                    style={{ color: dashboard?.summary.lowStockCount ? "#b45309" : undefined }}
                  >
                    {loading && !dashboard ? <MiniAppSkeleton className="mf-skeleton-kpi-value short" /> : dashboard?.summary.lowStockCount ?? 0}
                  </div>
                  <div className="mf-kpi-sub">
                    {dashboard?.summary.lowStockCount ? (
                      <span className="mf-trend-badge is-down">Needs Restock</span>
                    ) : (
                      <span className="mf-trend-badge is-up">✓ All Optimal</span>
                    )}
                    <span>{inventoryCounts.out > 0 ? `(${inventoryCounts.out} empty)` : "across flavors"}</span>
                  </div>
                </div>
              </div>

              {/* Interactive Revenue & Orders Trend Chart (Overview Widget) */}
              <div className="mf-chart-card">
                <div className="mf-chart-header">
                  <div className="mf-chart-title">
                    <h2>Demand &amp; Revenue Overview</h2>
                    <span>Daily Sales Trajectory</span>
                  </div>
                  <button
                    type="button"
                    className="mf-text-btn"
                    onClick={() => {
                      triggerHaptic("light");
                      setActiveSection("sales");
                    }}
                  >
                    Detailed Report <ChevronRight size={14} />
                  </button>
                </div>

                {salesReport && salesReport.timeline.length > 0 ? (
                  <div className="mf-bar-chart">
                    {salesReport.timeline.map((point) => (
                      <div className="mf-chart-col" key={point.label}>
                        <div className="mf-chart-bar-bg" title={`${point.label}: ETB ${point.revenue.toLocaleString()} (${point.orders} orders)`}>
                          <div
                            className="mf-chart-bar-fill"
                            style={{
                              height: `${Math.max(8, (point.revenue / maxTimelineRevenue) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="mf-chart-label">{point.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "30px", textAlign: "center", color: "var(--mf-text-muted)" }}>
                    {salesLoading ? "Loading live analytics…" : "No sales recorded in this period yet."}
                  </div>
                )}

                <div className="mf-chart-insights">
                  <div className="mf-insight-item">
                    <strong>
                      ETB {(salesReport?.averageOrderValue ?? 0).toLocaleString("en-ET", { maximumFractionDigits: 0 })}
                    </strong>
                    <small>Average Order Value</small>
                  </div>
                  <div className="mf-insight-item">
                    <strong>{salesReport?.totalUnits ?? 0} units</strong>
                    <small>Total Units Sold</small>
                  </div>
                  <div className="mf-insight-item">
                    <strong>{fulfillmentStats.deliveryRatio}% Delivery</strong>
                    <small>{fulfillmentStats.pickupRatio}% Pickup ratio</small>
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="mf-quick-actions">
                <button
                  type="button"
                  className="mf-quick-btn"
                  onClick={() => {
                    triggerHaptic("medium");
                    setActiveSection("orders");
                  }}
                >
                  <Plus size={15} /> New Order
                </button>
                <button
                  type="button"
                  className="mf-quick-btn"
                  onClick={() => {
                    triggerHaptic("medium");
                    setActiveSection("inventory");
                    setInventoryFilter("LOW");
                  }}
                >
                  <ArrowDownToLine size={15} /> Quick Restock
                </button>
                <button
                  type="button"
                  className="mf-quick-btn"
                  onClick={() => {
                    triggerHaptic("medium");
                    setActiveSection("inventory");
                  }}
                >
                  <Pencil size={15} /> Adjust Prices
                </button>
                <button
                  type="button"
                  className="mf-quick-btn"
                  onClick={() => {
                    triggerHaptic("medium");
                    setActiveSection("sales");
                  }}
                >
                  <BarChart3 size={15} /> Full Analytics
                </button>
              </div>

              {/* Operations Split: Attention Queue + Top Products */}
              <div className="mf-ops-split">
                {/* Left: Attention Required */}
                <div className="mf-card-box">
                  <div className="mf-card-box-header">
                    <h2>Needs Attention</h2>
                    <span className="mf-tag-pill">Live Queue</span>
                  </div>

                  <div className="mf-attention-list">
                    <div
                      className="mf-attention-row"
                      onClick={() => {
                        triggerHaptic("medium");
                        setActiveSection("orders");
                        setOrderStatus("PENDING");
                      }}
                    >
                      <div className="mf-att-icon is-amber">
                        <ShoppingBag size={18} />
                      </div>
                      <div className="mf-att-info">
                        <strong>{dashboard?.summary.pendingOrders ?? 0} Pending Order(s)</strong>
                        <small>Review customer details, confirm, or reject orders</small>
                      </div>
                      <ChevronRight size={16} color="#8b998f" />
                    </div>

                    <div
                      className="mf-attention-row"
                      onClick={() => {
                        triggerHaptic("medium");
                        setActiveSection("inventory");
                        setInventoryFilter("LOW");
                      }}
                    >
                      <div className="mf-att-icon is-red">
                        <TriangleAlert size={18} />
                      </div>
                      <div className="mf-att-info">
                        <strong>{dashboard?.summary.lowStockCount ?? 0} Products Low on Stock</strong>
                        <small>Check warehouse levels and add stock</small>
                      </div>
                      <ChevronRight size={16} color="#8b998f" />
                    </div>

                    {Boolean(dashboard?.summary.pendingReviews) && (
                      <div
                        className="mf-attention-row"
                        onClick={() => {
                          triggerHaptic("medium");
                          setActiveSection("reviews");
                          setReviewStatus("PENDING");
                        }}
                      >
                        <div className="mf-att-icon is-purple">
                          <MessageSquare size={18} />
                        </div>
                        <div className="mf-att-info">
                          <strong>{dashboard?.summary.pendingReviews} Review(s) Awaiting Moderation</strong>
                          <small>Approve to publish on storefront</small>
                        </div>
                        <ChevronRight size={16} color="#8b998f" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Top Selling Flavors & Products */}
                <div className="mf-card-box">
                  <div className="mf-card-box-header">
                    <h2>Top Selling Products</h2>
                    <span className="mf-tag-pill is-gold">Leaderboard</span>
                  </div>

                  {salesReport && salesReport.products.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {salesReport.products.slice(0, 4).map((prod, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            style={{
                              width: "22px",
                              height: "22px",
                              borderRadius: "50%",
                              background: "var(--mf-forest-surface)",
                              color: "var(--mf-forest)",
                              fontSize: "11px",
                              fontWeight: 800,
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--mf-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {prod.name}
                            </div>
                            <div
                              style={{
                                height: "5px",
                                background: "var(--mf-border-subtle)",
                                borderRadius: "3px",
                                overflow: "hidden",
                                marginTop: "3px",
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(100, (prod.units / maxProductUnits) * 100)}%`,
                                  height: "100%",
                                  background: "var(--mf-forest)",
                                }}
                              />
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--mf-forest)" }}>
                              {prod.units} units
                            </div>
                            <small style={{ fontSize: "10px", color: "var(--mf-text-muted)" }}>
                              ETB {prod.revenue.toLocaleString("en-ET")}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "20px", textAlign: "center", color: "var(--mf-text-muted)", fontSize: "12px" }}>
                      No product sales recorded in this period yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Orders Stream */}
              <div className="mf-card-box">
                <div className="mf-card-box-header">
                  <h2>Recent Orders Feed</h2>
                  <button
                    type="button"
                    className="mf-text-btn"
                    onClick={() => {
                      triggerHaptic("light");
                      setActiveSection("orders");
                    }}
                  >
                    View All Orders <ChevronRight size={14} />
                  </button>
                </div>

                <div className="mf-orders-stack" aria-busy={loading && !dashboard}>
                  {loading && !dashboard ? Array.from({ length: 3 }, (_, index) => (
                    <div className="mf-order-card mf-order-skeleton" key={`recent-skeleton-${index}`} aria-hidden="true">
                      <div className="mf-order-skeleton-heading">
                        <MiniAppSkeleton className="mf-skeleton-avatar" />
                        <span><MiniAppSkeleton className="mf-skeleton-order-name" /><MiniAppSkeleton className="mf-skeleton-order-meta" /></span>
                        <MiniAppSkeleton className="mf-skeleton-status" />
                      </div>
                      <MiniAppSkeleton className="mf-skeleton-order-line" />
                      <MiniAppSkeleton className="mf-skeleton-order-button" />
                    </div>
                  )) : (dashboard?.orders || []).slice(0, 5).map((order) => (
                    <div
                      className="mf-order-card"
                      key={order.orderNumber}
                      onClick={() => {
                        triggerHaptic("light");
                        setSelectedOrder(order);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="mf-order-card-top">
                        <div className="mf-order-customer-row">
                          <div className="mf-customer-avatar">
                            {getInitials(order.customerName)}
                          </div>
                          <div className="mf-customer-meta">
                            <span className="mf-customer-name">{order.customerName}</span>
                            <div className="mf-order-num-time">
                              <span>#{order.orderNumber.slice(-8)}</span>
                              <span>·</span>
                              <span>{formatOrderDate(order.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        <span className={`mf-status-pill is-${order.status.toLowerCase()}`}>
                          <span className="mf-status-dot" />
                          {order.status.replaceAll("_", " ")}
                        </span>
                      </div>

                      <div className="mf-order-card-body">
                        <div className="mf-order-meta-info">
                          <span className="mf-order-items-snippet">
                            {order.itemCount} unit(s) · {order.fulfillment === "DELIVERY" ? (order.city || "Delivery") : "Pickup"}
                          </span>
                          <span style={{ fontSize: "10.5px", color: "var(--mf-text-muted)" }}>
                            Via {order.paymentPreference}
                          </span>
                        </div>
                        <div className="mf-order-total-block">
                          <strong>ETB {order.total.toLocaleString("en-ET")}</strong>
                        </div>
                      </div>

                      <div className="mf-order-actions-row">
                        <button
                          type="button"
                          className="mf-btn-secondary"
                          style={{ height: "30px", fontSize: "11px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic("light");
                            setSelectedOrder(order);
                          }}
                        >
                          View Details
                        </button>
                        {order.status === "PENDING" && (
                          <button
                            type="button"
                            className="mf-btn-primary"
                            style={{ height: "30px", fontSize: "11px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic("medium");
                              if (window.confirm(`Confirm order ${order.orderNumber}?`)) {
                                void manageAction(
                                  { action: "order-confirm", orderNumber: order.orderNumber },
                                  "Order confirmed.",
                                );
                              }
                            }}
                            disabled={busyAction === order.orderNumber}
                          >
                            <Check size={13} /> Confirm
                          </button>
                        )}
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="mf-btn-secondary"
                          style={{ height: "30px", fontSize: "11px", marginLeft: "auto", textDecoration: "none" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone size={12} /> Call
                        </a>
                      </div>
                    </div>
                  ))}

                  {!loading && !dashboard?.orders.length && (
                    <div style={{ textAlign: "center", padding: "30px", color: "var(--mf-text-muted)" }}>
                      No recent orders found.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SECTION: ORDERS (Dedicated Order Flow & Pipeline Dashboard)
             ══════════════════════════════════════════════════════════════════ */}
          {activeSection === "orders" && (
            <>
              {/* Dedicated Orders KPI Pipeline Dashboard */}
              <div className="mf-order-pipeline-kpi">
                <div
                  className={`mf-pipeline-stat-card${orderStatus === "PENDING" ? " is-active" : ""}`}
                  onClick={() => {
                    triggerHaptic("light");
                    setOrderStatus("PENDING");
                  }}
                >
                  <div className="mf-pip-icon is-pending">
                    <Clock3 size={17} />
                  </div>
                  <div className="mf-pip-meta">
                    <strong>{orderStats.pendingCount}</strong>
                    <span>Pending (ETB {orderStats.pendingRevenue.toLocaleString()})</span>
                  </div>
                </div>

                <div
                  className={`mf-pipeline-stat-card${orderStatus === "CONFIRMED" ? " is-active" : ""}`}
                  onClick={() => {
                    triggerHaptic("light");
                    setOrderStatus("CONFIRMED");
                  }}
                >
                  <div className="mf-pip-icon is-confirmed">
                    <CheckCircle2 size={17} />
                  </div>
                  <div className="mf-pip-meta">
                    <strong>{orderStats.confirmedCount}</strong>
                    <span>Confirmed Orders</span>
                  </div>
                </div>

                <div
                  className={`mf-pipeline-stat-card${orderStatus === "PREPARING" || orderStatus === "OUT_FOR_DELIVERY" ? " is-active" : ""
                    }`}
                  onClick={() => {
                    triggerHaptic("light");
                    setOrderStatus("PREPARING");
                  }}
                >
                  <div className="mf-pip-icon is-completed" style={{ background: "#f5f3ff", color: "#6d28d9" }}>
                    <Truck size={17} />
                  </div>
                  <div className="mf-pip-meta">
                    <strong>{orderStats.inFulfillmentCount}</strong>
                    <span>In Fulfillment</span>
                  </div>
                </div>

                <div
                  className={`mf-pipeline-stat-card${orderStatus === "COMPLETED" ? " is-active" : ""}`}
                  onClick={() => {
                    triggerHaptic("light");
                    setOrderStatus("COMPLETED");
                  }}
                >
                  <div className="mf-pip-icon is-completed">
                    <CheckCheck size={17} />
                  </div>
                  <div className="mf-pip-meta">
                    <strong>{orderStats.completedCount}</strong>
                    <span>Completed (ETB {orderStats.completedRevenue.toLocaleString()})</span>
                  </div>
                </div>
              </div>

              {/* Status Chips */}
              <div className="mf-chip-bar" role="group" aria-label="Filter orders by status">
                {[
                  ["ALL", "All Orders", dashboard?.orders.length ?? 0],
                  ["PENDING", "Pending", orderStats.pendingCount],
                  ["CONFIRMED", "Confirmed", orderStats.confirmedCount],
                  ["PREPARING", "Preparing", dashboard?.summary.orderStatusCounts.PREPARING ?? 0],
                  ["READY_FOR_PICKUP", "Ready", dashboard?.summary.orderStatusCounts.READY_FOR_PICKUP ?? 0],
                  ["OUT_FOR_DELIVERY", "Out for Delivery", dashboard?.summary.orderStatusCounts.OUT_FOR_DELIVERY ?? 0],
                  ["COMPLETED", "Completed", orderStats.completedCount],
                  ["CANCELLED", "Cancelled", orderStats.cancelledCount],
                ].map(([status, label, count]) => (
                  <button
                    key={status}
                    type="button"
                    className={`mf-chip${orderStatus === status ? " is-active" : ""}`}
                    onClick={() => {
                      triggerHaptic("light");
                      setOrderStatus(status as string);
                    }}
                  >
                    <span>{label}</span>
                    <span className="mf-chip-badge">{count}</span>
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div style={{ position: "relative", marginBottom: "14px" }}>
                <input
                  className="mf-input"
                  style={{ paddingLeft: "38px" }}
                  placeholder="Search order #, customer name, phone, or city..."
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                />
                <Search
                  size={17}
                  color="#8b998f"
                  style={{ position: "absolute", left: "12px", top: "12px", pointerEvents: "none" }}
                />
              </div>

              {/* Orders List */}
              <div className="mf-orders-stack" aria-busy={loading && !dashboard}>
                {loading && !dashboard ? Array.from({ length: 3 }, (_, index) => (
                  <div className="mf-order-card mf-order-skeleton" key={`orders-skeleton-${index}`} aria-hidden="true">
                    <div className="mf-order-skeleton-heading">
                      <MiniAppSkeleton className="mf-skeleton-avatar" />
                      <span><MiniAppSkeleton className="mf-skeleton-order-name" /><MiniAppSkeleton className="mf-skeleton-order-meta" /></span>
                      <MiniAppSkeleton className="mf-skeleton-status" />
                    </div>
                    <MiniAppSkeleton className="mf-skeleton-order-line" />
                    <MiniAppSkeleton className="mf-skeleton-order-button" />
                  </div>
                )) : filteredOrders.map((order) => (
                  <div className="mf-order-card" key={order.orderNumber}>
                    <div className="mf-order-card-top">
                      <div className="mf-order-customer-row">
                        <div className="mf-customer-avatar">
                          {getInitials(order.customerName)}
                        </div>
                        <div className="mf-customer-meta">
                          <span className="mf-customer-name">{order.customerName}</span>
                          <div className="mf-order-num-time">
                            <span>#{order.orderNumber.slice(-8)}</span>
                            <span>·</span>
                            <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>
                      </div>

                      <span className={`mf-status-pill is-${order.status.toLowerCase()}`}>
                        <span className="mf-status-dot" />
                        {order.status.replaceAll("_", " ")}
                      </span>
                    </div>

                    <div className="mf-order-card-body">
                      <div className="mf-order-meta-info">
                        <span className="mf-order-items-snippet">
                          {order.itemCount} unit(s) · {order.fulfillment === "DELIVERY" ? (order.city || "Delivery") : "Pickup"}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--mf-text-muted)" }}>
                          Payment: {order.paymentPreference}
                        </span>
                      </div>

                      <div className="mf-order-total-block">
                        <strong>ETB {order.total.toLocaleString("en-ET")}</strong>
                      </div>
                    </div>

                    <div className="mf-order-actions-row">
                      <button
                        type="button"
                        className="mf-btn-secondary"
                        onClick={() => {
                          triggerHaptic("light");
                          setSelectedOrder(order);
                        }}
                      >
                        Details
                      </button>

                      {order.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            className="mf-btn-primary"
                            onClick={() => {
                              triggerHaptic("medium");
                              if (window.confirm(`Confirm order ${order.orderNumber}? Stock will be deducted.`)) {
                                void manageAction(
                                  { action: "order-confirm", orderNumber: order.orderNumber },
                                  "Order confirmed.",
                                );
                              }
                            }}
                            disabled={busyAction === order.orderNumber}
                          >
                            <Check size={14} /> Confirm
                          </button>

                          <button
                            type="button"
                            className="mf-btn-danger"
                            onClick={() => {
                              triggerHaptic("warning");
                              if (window.confirm(`Reject order ${order.orderNumber}? Reserved stock will be returned.`)) {
                                void manageAction(
                                  { action: "order-reject", orderNumber: order.orderNumber },
                                  "Order rejected.",
                                );
                              }
                            }}
                            disabled={busyAction === order.orderNumber}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {order.status === "CONFIRMED" && (
                        <button
                          type="button"
                          className="mf-btn-primary"
                          style={{ height: "30px", fontSize: "11px", padding: "0 10px" }}
                          onClick={() => {
                            triggerHaptic("medium");
                            void manageAction(
                              { action: "order-status-update", orderNumber: order.orderNumber, newStatus: "PREPARING" },
                              "Order is now being prepared.",
                            );
                          }}
                          disabled={busyAction === order.orderNumber}
                        >
                          <ChefHat size={13} /> Prepare
                        </button>
                      )}

                      {order.status === "PREPARING" && (
                        <button
                          type="button"
                          className="mf-btn-primary"
                          style={{ height: "30px", fontSize: "11px", padding: "0 10px" }}
                          onClick={() => {
                            triggerHaptic("medium");
                            const next = order.fulfillment === "DELIVERY" ? "OUT_FOR_DELIVERY" : "READY_FOR_PICKUP";
                            void manageAction(
                              { action: "order-status-update", orderNumber: order.orderNumber, newStatus: next },
                              next === "OUT_FOR_DELIVERY" ? "Order dispatched." : "Order ready for pickup.",
                            );
                          }}
                          disabled={busyAction === order.orderNumber}
                        >
                          {order.fulfillment === "DELIVERY" ? (
                            <><Truck size={13} /> Dispatch</>
                          ) : (
                            <><Package size={13} /> Ready</>
                          )}
                        </button>
                      )}

                      {(order.status === "OUT_FOR_DELIVERY" || order.status === "READY_FOR_PICKUP") && (
                        <button
                          type="button"
                          className="mf-btn-primary"
                          style={{ height: "30px", fontSize: "11px", padding: "0 10px" }}
                          onClick={() => {
                            triggerHaptic("medium");
                            if (window.confirm(`Mark order ${order.orderNumber} as completed?`)) {
                              void manageAction(
                                { action: "order-status-update", orderNumber: order.orderNumber, newStatus: "COMPLETED" },
                                "Order completed successfully.",
                              );
                            }
                          }}
                          disabled={busyAction === order.orderNumber}
                        >
                          <CheckCheck size={13} /> Complete
                        </button>
                      )}

                      <a
                        href={`tel:${order.customerPhone}`}
                        className="mf-btn-secondary"
                        style={{ marginLeft: "auto", textDecoration: "none" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone size={13} /> {order.customerPhone}
                      </a>
                    </div>
                  </div>
                ))}

                {!loading && filteredOrders.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px", color: "var(--mf-text-muted)" }}>
                    No orders found matching this filter.
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SECTION: INVENTORY (Modern Family Matrix & Warehouse Table)
             ══════════════════════════════════════════════════════════════════ */}
          {activeSection === "inventory" && (
            <>
              {/* Professional Inventory Header Bar */}
              <div className="mf-inv-header">
                <div className="mf-inv-title-col">
                  <h2>Inventory &amp; Stock</h2>
                  <p>
                    {dashboard?.summary.productCount ?? 0} SKUs · {(dashboard?.summary.totalUnits ?? 0).toLocaleString()} Total Units ·{" "}
                    {inventoryCounts.low > 0 ? (
                      <span className="mf-text-amber">{inventoryCounts.low} need restock</span>
                    ) : (
                      <span className="mf-text-green">All optimal</span>
                    )}
                  </p>
                </div>

                <div className="mf-inv-actions">
                  <div className="mf-view-toggle">
                    <button
                      type="button"
                      className={`mf-view-btn${viewMode === "cards" ? " is-active" : ""}`}
                      onClick={() => {
                        triggerHaptic("light");
                        setViewMode("cards");
                      }}
                    >
                      Cards
                    </button>
                    <button
                      type="button"
                      className={`mf-view-btn${viewMode === "table" ? " is-active" : ""}`}
                      onClick={() => {
                        triggerHaptic("light");
                        setViewMode("table");
                      }}
                    >
                      Table
                    </button>
                  </div>

                  <button
                    type="button"
                    className={`mf-btn-secondary${showCategoryManager ? " is-active" : ""}`}
                    style={{ height: "34px", padding: "0 12px", fontSize: "11.5px" }}
                    onClick={() => {
                      triggerHaptic("medium");
                      setShowCategoryManager(!showCategoryManager);
                      setShowProductForm(false);
                    }}
                  >
                    <Boxes size={14} /> Categories ({dashboard?.categories.length ?? 0})
                  </button>

                  <button
                    type="button"
                    className="mf-btn-primary"
                    style={{ height: "34px", padding: "0 14px", fontSize: "11.5px" }}
                    onClick={() => {
                      triggerHaptic("medium");
                      setShowProductForm(!showProductForm);
                      setShowCategoryManager(false);
                      setShowCategoryForm(false);
                    }}
                  >
                    <Plus size={14} /> Add Product
                  </button>
                </div>
              </div>

              {/* ── Categories Management Drawer ── */}
              {showCategoryManager && (
                <div
                  className="mf-category-manager"
                  style={{
                    background: "#ffffff",
                    border: "1px solid var(--mf-border)",
                    borderRadius: "var(--mf-radius-lg)",
                    padding: "16px",
                    marginBottom: "16px",
                    boxShadow: "var(--mf-shadow-sm)",
                  }}
                >
                  <div className="mf-category-manager-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                    <div>
                      <div className="mf-category-manager-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "15px", color: "var(--mf-forest)" }}>Product Categories</strong>
                        <span className="mf-status-tab-badge is-default mf-category-count">
                          {(dashboard?.categories || []).filter((c) => c.isActive).length} active · {(dashboard?.categories || []).length} total
                        </span>
                      </div>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--mf-text-secondary)" }}>
                        Manage category names, storefront visibility, and promotional banners.
                      </p>
                    </div>

                    <div className="mf-category-manager-controls" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        type="button"
                        className="mf-btn-primary"
                        style={{ height: "30px", fontSize: "11px", padding: "0 10px" }}
                        onClick={() => setShowCategoryForm(!showCategoryForm)}
                      >
                        <Plus size={13} /> {showCategoryForm ? "Close Form" : "Add Category"}
                      </button>
                      <button
                        onClick={() => setShowCategoryManager(false)}
                        style={{ background: "transparent", border: "0", color: "var(--mf-text-muted)", cursor: "pointer", padding: "4px" }}
                        title="Close manager"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Inline Add Category Form */}
                  {showCategoryForm && (
                    <form
                      onSubmit={(e) => void submitCategory(e)}
                      style={{
                        background: "var(--mf-bg)",
                        border: "1px solid var(--mf-border)",
                        borderRadius: "var(--mf-radius-md)",
                        padding: "14px",
                        marginBottom: "14px",
                      }}
                    >
                      <strong style={{ fontSize: "13px", color: "var(--mf-forest)", display: "block", marginBottom: "10px" }}>
                        New Category Details
                      </strong>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                        <div className="mf-input-group" style={{ margin: 0 }}>
                          <label>Category Name *</label>
                          <input className="mf-input" name="name" required placeholder="e.g. Mojito Syrups" />
                        </div>
                        <div className="mf-input-group" style={{ margin: 0 }}>
                          <label>Cover Photo (PNG/JPG)</label>
                          <input className="mf-input" name="image" type="file" accept="image/*" />
                        </div>
                      </div>
                      <div className="mf-input-group" style={{ marginBottom: "10px" }}>
                        <label>Description (optional)</label>
                        <input className="mf-input" name="description" placeholder="Short description of this product line..." />
                      </div>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button type="button" className="mf-btn-secondary" style={{ height: "32px", fontSize: "11.5px" }} onClick={() => setShowCategoryForm(false)}>
                          Cancel
                        </button>
                        <button type="submit" className="mf-btn-primary" style={{ height: "32px", fontSize: "11.5px", padding: "0 14px" }} disabled={savingCatalog}>
                          {savingCatalog ? "Saving…" : "Save Category"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Categories Grid */}
                  <div
                    ref={categoryCarouselRef}
                    className="mf-category-list"
                    aria-label="Product categories"
                    tabIndex={0}
                    onScroll={(event) => {
                      const carousel = event.currentTarget;
                      const card = carousel.querySelector<HTMLElement>(".mf-category-card");
                      const gap = Number.parseFloat(getComputedStyle(carousel).columnGap) || 0;
                      const step = (card?.offsetWidth || carousel.clientWidth) + gap;
                      setCategorySlide(step ? Math.round(carousel.scrollLeft / step) : 0);
                    }}
                  >
                    {(dashboard?.categories || []).map((cat) => (
                      <div
                        key={cat.id}
                        className="mf-category-card"
                        style={{
                          background: "#ffffff",
                          border: "1px solid var(--mf-border)",
                          borderRadius: "var(--mf-radius-md)",
                          padding: "12px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: "8px",
                          opacity: cat.isActive ? 1 : 0.75,
                        }}
                      >
                        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                          <div
                            style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "6px",
                              background: "var(--mf-bg)",
                              overflow: "hidden",
                              flexShrink: 0,
                              display: "grid",
                              placeItems: "center",
                              border: "1px solid var(--mf-border)",
                            }}
                          >
                            {cat.imageUrl ? (
                              <img src={cat.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <Boxes size={20} color="#8b998f" />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ fontSize: "13px", color: "var(--mf-text)", display: "block" }}>{cat.name}</strong>
                            <div style={{ fontSize: "11px", color: "var(--mf-text-muted)", marginTop: "2px" }}>
                              {categoryCounts[cat.name] ?? cat.productCount} products
                            </div>
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: "10px",
                                fontWeight: 600,
                                color: cat.isActive ? "var(--mf-success)" : "var(--mf-text-muted)",
                                marginTop: "3px",
                              }}
                            >
                              {cat.isActive ? "● Live on storefront" : "○ Hidden from storefront"}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "6px", alignItems: "center", borderTop: "1px solid var(--mf-border)", paddingTop: "8px" }}>
                          <button
                            type="button"
                            className="mf-btn-secondary"
                            style={{ height: "26px", fontSize: "10.5px", padding: "0 8px" }}
                            onClick={() => setEditingCategory(cat)}
                          >
                            <Pencil size={11} /> Edit
                          </button>

                          <button
                            type="button"
                            className={cat.isActive ? "mf-btn-danger" : "mf-btn-primary"}
                            style={{ height: "26px", fontSize: "10.5px", padding: "0 8px" }}
                            onClick={() =>
                              void manageAction(
                                { action: "category-status-update", categoryId: cat.id, isActive: !cat.isActive },
                                cat.isActive ? "Category hidden from storefront." : "Category activated.",
                              )
                            }
                          >
                            {cat.isActive ? <><EyeOff size={11} /> Hide</> : <><Eye size={11} /> Show</>}
                          </button>

                          <label
                            className="mf-btn-secondary"
                            style={{ height: "26px", fontSize: "10.5px", padding: "0 8px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px" }}
                            title="Upload cover photo"
                          >
                            Photo
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={(e) => void updateCatalogImage(e, "category-image-update", cat.id)}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mf-category-carousel-controls">
                    <button
                      type="button"
                      className="mf-category-carousel-arrow"
                      aria-label="Previous category"
                      disabled={categorySlide === 0}
                      onClick={() => scrollCategoryCarousel(-1)}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span aria-live="polite">
                      {dashboard?.categories.length ? Math.min(categorySlide + 1, dashboard.categories.length) : 0} / {dashboard?.categories.length || 0}
                    </span>
                    <button
                      type="button"
                      className="mf-category-carousel-arrow"
                      aria-label="Next category"
                      disabled={categorySlide >= (dashboard?.categories.length || 1) - 1}
                      onClick={() => scrollCategoryCarousel(1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Add Product Form Drawer */}
              {showProductForm && (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid var(--mf-border)",
                    borderRadius: "var(--mf-radius-md)",
                    padding: "16px",
                    marginBottom: "16px",
                    boxShadow: "var(--mf-shadow-sm)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <strong style={{ fontSize: "15px", color: "var(--mf-forest)" }}>Add New Product / Flavor</strong>
                    <button
                      onClick={() => setShowProductForm(false)}
                      style={{ background: "transparent", border: "0", color: "var(--mf-text-muted)", cursor: "pointer" }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <form onSubmit={(e) => void submitProduct(e)}>
                    <div className="mf-input-group">
                      <label>Product Name *</label>
                      <input className="mf-input" name="name" required placeholder="e.g. Raspberry Ice Cream Powder" />
                    </div>
                    <div className="mf-input-group">
                      <label>Category *</label>
                      <select className="mf-select" name="categoryId" required defaultValue="">
                        <option value="" disabled>
                          Select category
                        </option>
                        {dashboard?.categories
                          .filter((c) => c.isActive)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div className="mf-input-group">
                        <label>Flavor</label>
                        <input className="mf-input" name="flavor" placeholder="e.g. Raspberry" />
                      </div>
                      <div className="mf-input-group">
                        <label>Size</label>
                        <input className="mf-input" name="size" placeholder="e.g. 1 L or 5 kg" />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div className="mf-input-group">
                        <label>Promotion Discount (%)</label>
                        <input
                          className="mf-input"
                          name="promotionDiscountPercent"
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="99.99"
                          placeholder="e.g. 15 for 15% OFF"
                        />
                      </div>
                      <div className="mf-input-group" style={{ display: "flex", alignItems: "center", paddingTop: "20px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
                          <input type="checkbox" name="promotionEnabled" />
                          Enable Storefront Promotion
                        </label>
                      </div>
                    </div>
                    <div className="mf-input-group">
                      <label>Product Photos (PNG/JPG up to 2MB)</label>
                      <input className="mf-input" name="images" type="file" accept="image/*" multiple />
                    </div>
                    <button
                      type="submit"
                      className="mf-btn-primary"
                      style={{ width: "100%", height: "42px", marginTop: "10px" }}
                      disabled={savingCatalog}
                    >
                      {savingCatalog ? "Saving…" : "Save Product"}
                    </button>
                  </form>
                </div>
              )}

              {/* Unified Inventory Search & Filter Control Hub */}
              <div className="mf-inv-controls-card">
                {/* Search & Category Filter Row */}
                <div className="mf-inv-search-row">
                  <div className="mf-search-box">
                    <Search size={16} className="mf-search-icon" />
                    <input
                      className="mf-search-input"
                      placeholder="Search product name, flavor, size, SKU..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                      <button
                        type="button"
                        className="mf-search-clear-btn"
                        onClick={() => setQuery("")}
                        title="Clear search"
                        aria-label="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="mf-cat-filter-wrap">
                    <select
                      className="mf-cat-dropdown"
                      value={inventoryCategory}
                      onChange={(e) => {
                        triggerHaptic("light");
                        setInventoryCategory(e.target.value);
                      }}
                      aria-label="Filter by product category"
                    >
                      <option value="ALL">All Categories ({dashboard?.summary.productCount ?? 0})</option>
                      {dashboard?.categories
                        .filter((c) => c.isActive)
                        .map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name} ({categoryCounts[cat.name] ?? cat.productCount})
                          </option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="mf-dropdown-icon" />
                  </div>
                </div>

                {/* Stock Health Segmented Tabs */}
                <div className="mf-inv-status-tabs" role="tablist" aria-label="Filter products by stock status">
                  {[
                    { id: "ALL", label: "All Items", count: inventoryCounts.all, tone: "default" },
                    { id: "LOW", label: "Low Stock", count: inventoryCounts.low, tone: "amber" },
                    { id: "OUT", label: "Out of Stock", count: inventoryCounts.out, tone: "red" },
                    { id: "ARCHIVED", label: "Archived", count: inventoryCounts.archived, tone: "muted" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={inventoryFilter === tab.id}
                      className={`mf-status-tab-btn${inventoryFilter === tab.id ? " is-active" : ""}`}
                      onClick={() => {
                        triggerHaptic("light");
                        setInventoryFilter(tab.id);
                      }}
                    >
                      <span className="mf-status-tab-title">{tab.label}</span>
                      <span className={`mf-status-tab-badge is-${tab.tone}`}>{tab.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── MODE 1: Interactive Family Cards ── */}
              {viewMode === "cards" && (
                <div className="mf-products-grid" aria-busy={loading && !dashboard}>
                  {loading && !dashboard && Array.from({ length: 4 }, (_, index) => (
                    <div className="mf-product-card mf-product-skeleton" key={`product-skeleton-${index}`} aria-hidden="true">
                      <MiniAppSkeleton className="mf-skeleton-product-thumb" />
                      <span className="mf-product-skeleton-copy">
                        <MiniAppSkeleton className="mf-skeleton-product-title" />
                        <MiniAppSkeleton className="mf-skeleton-product-meta" />
                        <MiniAppSkeleton className="mf-skeleton-product-meta short" />
                        <MiniAppSkeleton className="mf-skeleton-product-price" />
                      </span>
                    </div>
                  ))}
                  {inventoryGroups.map((group) => {
                    const products = group.products;

                    // Single Variant Product
                    if (products.length === 1) {
                      const product = products[0];
                      return (
                        <div className="mf-product-card" key={product.id}>
                          <div className="mf-product-thumb">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt="" />
                            ) : (
                              <Package size={26} color="#8b998f" />
                            )}
                            <span
                              className={`mf-stock-pill-tag${!product.isActive
                                ? " is-archived"
                                : product.stock === 0
                                  ? " is-out"
                                  : product.lowStock
                                    ? " is-low"
                                    : " is-in"
                                }`}
                            >
                              {!product.isActive
                                ? "Archived"
                                : product.stock === 0
                                  ? "Out"
                                  : product.lowStock
                                    ? "Low"
                                    : "In Stock"}
                            </span>
                          </div>

                          <div className="mf-product-info">
                            <span className="mf-product-cat-tag">
                              {product.category}
                              {product.size ? ` · ${product.size}` : ""}
                            </span>
                            <button className="mf-product-title-btn" onClick={() => openProductDetails(product)}>
                              {product.name}
                            </button>

                            <div className="mf-product-stock-row">
                              <div>
                                <strong>{product.availableStock}</strong>
                                <small>Available</small>
                              </div>
                              <div>
                                <strong>{product.stock}</strong>
                                <small>Total</small>
                              </div>
                              <span className="mf-product-price-tag">
                                ETB {product.price.toLocaleString("en-ET")}
                                {product.promotionEnabled && product.promotionDiscountPercent && (
                                  <span style={{ marginLeft: "5px", fontSize: "10px", background: "#fef3c7", color: "#b45309", padding: "1px 5px", borderRadius: "4px", fontWeight: 700 }}>
                                    🏷️ {product.promotionDiscountPercent}% OFF
                                  </span>
                                )}
                              </span>
                            </div>

                            <div className="mf-product-card-actions">
                              {product.isActive && (
                                <button
                                  type="button"
                                  className="mf-btn-primary"
                                  style={{ height: "30px", fontSize: "11px", padding: "0 10px" }}
                                  onClick={() => {
                                    triggerHaptic("medium");
                                    setSelected(product);
                                    setQuantity("24");
                                  }}
                                >
                                  <ArrowDownToLine size={13} /> Restock
                                </button>
                              )}
                              <button
                                type="button"
                                className="mf-btn-secondary"
                                style={{ height: "30px", fontSize: "11px", padding: "0 10px" }}
                                onClick={() => openProductDetails(product, true)}
                              >
                                <Pencil size={12} /> Edit
                              </button>
                              <button
                                type="button"
                                className="mf-btn-secondary"
                                style={{ height: "30px", fontSize: "11px", padding: "0 8px" }}
                                title={product.isPublished ? "Hide from storefront" : "Publish to storefront"}
                                onClick={() =>
                                  void manageAction(
                                    { action: "product-publish-update", productId: product.id, isPublished: !product.isPublished },
                                    product.isPublished ? "Product hidden from storefront." : "Product published to storefront.",
                                  )
                                }
                              >
                                {product.isPublished ? <><EyeOff size={12} color="#dc2626" /> Hide</> : <><Eye size={12} color="#059669" /> Show</>}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Multi-Variant Family Group (Interactive Matrix Design)
                    const firstProduct = products[0];
                    const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
                    const availableStock = products.reduce((acc, p) => acc + p.availableStock, 0);
                    const lowCount = products.filter((p) => p.lowStock && p.stock > 0).length;
                    const outCount = products.filter((p) => p.stock === 0).length;
                    const isExpanded = Boolean(expandedGroupMap[group.key]);

                    // Determine variant types (e.g. Hard, Soft)
                    const variantTypes = Array.from(
                      new Set(products.map((p) => p.variantType).filter(Boolean)),
                    ) as string[];

                    const activeType = activeTypeMap[group.key] || (variantTypes.length > 0 ? variantTypes[0] : "");

                    // Filter products by active variant type if types exist
                    const typeProducts = variantTypes.length > 0
                      ? products.filter((p) => p.variantType === activeType)
                      : products;

                    // Active selected variant in this group
                    const selectedVariant = (() => {
                      const savedId = activeVariantMap[group.key];
                      if (savedId) {
                        const found = products.find((p) => p.id === savedId);
                        if (found) return found;
                      }
                      return typeProducts[0] || products[0];
                    })();

                    const minPrice = Math.min(...products.map((p) => p.price));
                    const maxPrice = Math.max(...products.map((p) => p.price));

                    return (
                      <div className="mf-family-card" key={group.key}>
                        {/* Family Head */}
                        <div className="mf-family-head">
                          <div className="mf-product-thumb" style={{ width: "64px", height: "64px" }}>
                            {firstProduct.imageUrl ? (
                              <img src={firstProduct.imageUrl} alt="" />
                            ) : (
                              <Package size={24} color="#8b998f" />
                            )}
                          </div>

                          <div className="mf-family-title-meta">
                            <span className="mf-product-cat-tag">{firstProduct.category} · Family</span>
                            <h3 className="mf-family-title">{group.label}</h3>
                            <div className="mf-family-badges">
                              <span className="mf-family-stock-pill">
                                <b>{availableStock}</b> available ({totalStock} total)
                              </span>
                              {outCount > 0 && (
                                <span className="mf-family-stock-pill is-danger">
                                  {outCount} out of stock
                                </span>
                              )}
                              {lowCount > 0 && outCount === 0 && (
                                <span className="mf-family-stock-pill is-warning">
                                  {lowCount} low stock
                                </span>
                              )}
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--mf-forest)", marginLeft: "auto" }}>
                                {minPrice === maxPrice ? `ETB ${minPrice}` : `ETB ${minPrice} - ${maxPrice}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Variant Type Tabs (e.g. Hard vs Soft) */}
                        {variantTypes.length > 1 && (
                          <div className="mf-variant-types-bar" role="tablist">
                            {variantTypes.map((type) => {
                              const count = products.filter((p) => p.variantType === type).length;
                              const isTypeActive = activeType === type;
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  className={`mf-type-pill${isTypeActive ? " is-active" : ""}`}
                                  onClick={() => {
                                    triggerHaptic("light");
                                    setActiveTypeMap((prev) => ({ ...prev, [group.key]: type }));
                                    const firstOfType = products.find((p) => p.variantType === type);
                                    if (firstOfType) {
                                      setActiveVariantMap((prev) => ({ ...prev, [group.key]: firstOfType.id }));
                                    }
                                  }}
                                >
                                  {type} ({count})
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Variant Size / Type Chips (Interactive Selector) */}
                        <div className="mf-variant-chips-grid">
                          {typeProducts.map((variant) => {
                            const isSelected = variant.id === selectedVariant.id;
                            const label = variant.size || variant.variantType || "Standard";
                            return (
                              <div
                                key={variant.id}
                                className={`mf-variant-chip${isSelected ? " is-active" : ""}${variant.stock === 0 ? " is-out" : variant.lowStock ? " is-low" : ""
                                  }`}
                                onClick={() => {
                                  triggerHaptic("light");
                                  setActiveVariantMap((prev) => ({ ...prev, [group.key]: variant.id }));
                                }}
                              >
                                <span className="mf-chip-size">{label}</span>
                                <span className="mf-chip-stock">
                                  {variant.stock === 0 ? "0 left" : `${variant.availableStock} in stock`}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Selected Variant Active Panel */}
                        <div className="mf-selected-variant-panel">
                          <div className="mf-sel-variant-info">
                            <div>
                              <span className="mf-sel-variant-name">
                                {[selectedVariant.variantType, selectedVariant.size].filter(Boolean).join(" · ") || selectedVariant.name}
                              </span>
                              <div className="mf-sel-variant-stock">
                                <span>SKU: {selectedVariant.sku}</span>
                                <span> · </span>
                                <b style={{ color: selectedVariant.stock === 0 ? "var(--mf-status-cancelled-text)" : "var(--mf-forest)" }}>
                                  {selectedVariant.availableStock} Available
                                </b>
                                <span> ({selectedVariant.stock} total)</span>
                              </div>
                            </div>

                            <div className="mf-sel-variant-price">
                              ETB {selectedVariant.price.toLocaleString("en-ET")}
                              {selectedVariant.promotionEnabled && selectedVariant.promotionDiscountPercent && (
                                <span style={{ display: "block", fontSize: "10.5px", background: "#fef3c7", color: "#b45309", padding: "1px 6px", borderRadius: "4px", fontWeight: 700, marginTop: "2px" }}>
                                  🏷️ {selectedVariant.promotionDiscountPercent}% OFF
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mf-sel-actions-row">
                            {selectedVariant.isActive && (
                              <button
                                type="button"
                                className="mf-btn-primary"
                                style={{ height: "30px", fontSize: "11px", padding: "0 10px" }}
                                onClick={() => {
                                  triggerHaptic("medium");
                                  setSelected(selectedVariant);
                                  setQuantity("24");
                                }}
                              >
                                <ArrowDownToLine size={13} /> Restock
                              </button>
                            )}
                            <button
                              type="button"
                              className="mf-btn-secondary"
                              style={{ height: "30px", fontSize: "11px", padding: "0 10px" }}
                              onClick={() => openProductDetails(selectedVariant, true)}
                            >
                              <Pencil size={12} /> Edit Details
                            </button>

                            <button
                              type="button"
                              className="mf-btn-secondary"
                              style={{ height: "30px", fontSize: "11px", padding: "0 8px" }}
                              title={selectedVariant.isPublished ? "Hide from storefront" : "Publish to storefront"}
                              onClick={() =>
                                void manageAction(
                                  { action: "product-publish-update", productId: selectedVariant.id, isPublished: !selectedVariant.isPublished },
                                  selectedVariant.isPublished ? "Product hidden from storefront." : "Product published to storefront.",
                                )
                              }
                            >
                              {selectedVariant.isPublished ? <><EyeOff size={12} color="#dc2626" /> Hide</> : <><Eye size={12} color="#059669" /> Show</>}
                            </button>

                            <button
                              type="button"
                              className="mf-expand-table-btn"
                              style={{ marginLeft: "auto" }}
                              onClick={() => {
                                triggerHaptic("light");
                                setExpandedGroupMap((prev) => ({ ...prev, [group.key]: !prev[group.key] }));
                              }}
                            >
                              {isExpanded ? "Hide Table ▴" : `All ${products.length} Table ▾`}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Compact Variant Table (When Toggled) */}
                        {isExpanded && (
                          <div className="mf-compact-variants-table">
                            {products.map((variant) => (
                              <div
                                key={variant.id}
                                className={`mf-cvariant-row${variant.id === selectedVariant.id ? " is-active" : ""}`}
                              >
                                <span className="mf-cvariant-title">
                                  {[variant.variantType, variant.size].filter(Boolean).join(" · ")}
                                </span>
                                <div className="mf-cvariant-nums">
                                  <span>{variant.availableStock} avail</span>
                                  <b>ETB {variant.price.toLocaleString()}</b>
                                </div>
                                <div style={{ display: "flex", gap: "4px" }}>
                                  {variant.isActive && (
                                    <button
                                      type="button"
                                      className="mf-btn-primary"
                                      style={{ height: "24px", padding: "0 6px", fontSize: "10px" }}
                                      onClick={() => {
                                        triggerHaptic("medium");
                                        setSelected(variant);
                                        setQuantity("24");
                                      }}
                                    >
                                      + Restock
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="mf-btn-secondary"
                                    style={{ height: "24px", padding: "0 6px", fontSize: "10px" }}
                                    onClick={() => openProductDetails(variant, true)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="mf-btn-secondary"
                                    style={{ height: "24px", padding: "0 6px", fontSize: "10px" }}
                                    title={variant.isPublished ? "Hide" : "Show"}
                                    onClick={() =>
                                      void manageAction(
                                        { action: "product-publish-update", productId: variant.id, isPublished: !variant.isPublished },
                                        variant.isPublished ? "Product hidden." : "Product published.",
                                      )
                                    }
                                  >
                                    {variant.isPublished ? <EyeOff size={11} color="#dc2626" /> : <Eye size={11} color="#059669" />}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {!loading && filteredProducts.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--mf-text-muted)" }}>
                      No products found matching this search.
                    </div>
                  )}
                </div>
              )}

              {/* ── MODE 2: Warehouse Full High-Density Table View ── */}
              {viewMode === "table" && (
                <div className="mf-warehouse-table-card">
                  <table className="mf-wtable">
                    <thead>
                      <tr>
                        <th>Product &amp; SKU</th>
                        <th>Category</th>
                        <th>Variant / Size</th>
                        <th>Stock Status</th>
                        <th>Unit Price</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody aria-busy={loading && !dashboard}>
                      {loading && !dashboard && Array.from({ length: 4 }, (_, index) => (
                        <tr key={`inventory-skeleton-${index}`} aria-hidden="true">
                          {[0, 1, 2, 3, 4, 5].map((cell) => (
                            <td key={cell}><MiniAppSkeleton className="mf-skeleton-table-cell" /></td>
                          ))}
                        </tr>
                      ))}
                      {filteredProducts.map((prod) => (
                        <tr key={prod.id}>
                          <td>
                            <strong style={{ color: "var(--mf-text)" }}>{prod.name}</strong>
                            <div style={{ fontSize: "10.5px", color: "var(--mf-text-muted)" }}>{prod.sku}</div>
                          </td>
                          <td>
                            <span className="mf-product-cat-tag">{prod.category}</span>
                          </td>
                          <td>
                            {[prod.variantType, prod.size].filter(Boolean).join(" · ") || "—"}
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span
                                className={`mf-stock-pill-tag ${prod.stock === 0 ? "is-out" : prod.lowStock ? "is-low" : "is-in"
                                  }`}
                                style={{ position: "static" }}
                              >
                                {prod.stock === 0 ? "Out" : prod.lowStock ? "Low" : "In Stock"}
                              </span>
                              <b>{prod.availableStock}</b> / {prod.stock}
                            </div>
                          </td>
                          <td>
                            <strong style={{ color: "var(--mf-forest)" }}>ETB {prod.price.toLocaleString("en-ET")}</strong>
                            {prod.promotionEnabled && prod.promotionDiscountPercent && (
                              <div style={{ fontSize: "10px", color: "#b45309", fontWeight: 700 }}>
                                🏷️ {prod.promotionDiscountPercent}% OFF
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              {prod.isActive && (
                                <button
                                  type="button"
                                  className="mf-btn-primary"
                                  style={{ height: "28px", padding: "0 8px", fontSize: "11px" }}
                                  onClick={() => {
                                    triggerHaptic("medium");
                                    setSelected(prod);
                                    setQuantity("24");
                                  }}
                                >
                                  + Restock
                                </button>
                              )}
                              <button
                                type="button"
                                className="mf-btn-secondary"
                                style={{ height: "28px", padding: "0 8px", fontSize: "11px" }}
                                onClick={() => openProductDetails(prod, true)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="mf-btn-secondary"
                                style={{ height: "28px", padding: "0 6px", fontSize: "11px" }}
                                title={prod.isPublished ? "Hide from storefront" : "Publish to storefront"}
                                onClick={() =>
                                  void manageAction(
                                    { action: "product-publish-update", productId: prod.id, isPublished: !prod.isPublished },
                                    prod.isPublished ? "Product hidden from storefront." : "Product published to storefront.",
                                  )
                                }
                              >
                                {prod.isPublished ? <EyeOff size={12} color="#dc2626" /> : <Eye size={12} color="#059669" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!loading && filteredProducts.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--mf-text-muted)" }}>
                      No products found matching this filter.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SECTION: SALES ANALYTICS
             ══════════════════════════════════════════════════════════════════ */}
          {activeSection === "sales" && (
            <>
              {/* Professional Analytics Header */}
              <div className="mf-analytics-header">
                <div className="mf-analytics-title-col">
                  <h2>Sales Analytics &amp; Revenue</h2>
                </div>

                {/* Integrated Segmented Period Switcher */}
                <div className="mf-period-segmented-control" role="group" aria-label="Sales reporting period">
                  {[
                    ["daily", "Today"],
                    ["weekly", "This Week"],
                    ["monthly", "This Month"],
                    ["yearly", "This Year"],
                  ].map(([p, label]) => (
                    <button
                      key={p}
                      type="button"
                      className={`mf-period-seg-btn${salesPeriod === p ? " is-active" : ""}`}
                      onClick={() => {
                        triggerHaptic("light");
                        setSalesPeriod(p as SalesPeriod);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {salesError && (
                <div className="mf-error" role="alert">
                  <span>{salesError}</span>
                  <button onClick={() => setSalesReload((a) => a + 1)}>Retry</button>
                </div>
              )}

              {/* 4 Clean Analytical KPI Cards */}
              <div className="mf-analytics-kpi-grid" aria-busy={salesLoading && !salesReport}>
                {/* 1. Revenue */}
                <div className="mf-kpi-card">
                  <div className="mf-kpi-head">
                    <span className="mf-kpi-title">{salesPeriod.toUpperCase()} Revenue</span>
                    <div className="mf-kpi-icon is-green">
                      <Banknote size={15} />
                    </div>
                  </div>
                  <div className="mf-kpi-value">
                    {salesLoading && !salesReport
                      ? <MiniAppSkeleton className="mf-skeleton-kpi-value" />
                      : `ETB ${(salesReport?.totalRevenue ?? 0).toLocaleString("en-ET", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}`}
                  </div>
                  <div className="mf-kpi-sub">
                    {salesReport?.revenueChangePercent !== null && salesReport?.revenueChangePercent !== undefined ? (
                      <span className={`mf-trend-badge ${salesReport.revenueChangePercent >= 0 ? "is-up" : "is-down"}`}>
                        {salesReport.revenueChangePercent >= 0 ? "↑ +" : "↓ "}
                        {Math.abs(salesReport.revenueChangePercent).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="mf-trend-badge is-up">● Live</span>
                    )}
                    <span>vs previous period</span>
                  </div>
                </div>

                {/* 2. Total Orders */}
                <div className="mf-kpi-card">
                  <div className="mf-kpi-head">
                    <span className="mf-kpi-title">Total Orders</span>
                    <div className="mf-kpi-icon is-blue">
                      <ShoppingBag size={15} />
                    </div>
                  </div>
                  <div className="mf-kpi-value">
                    {salesLoading && !salesReport ? <MiniAppSkeleton className="mf-skeleton-kpi-value short" /> : salesReport?.totalOrders ?? 0}
                  </div>
                  <div className="mf-kpi-sub">
                    <span className="mf-trend-badge is-up">✓ Recorded</span>
                    <span>in selected period</span>
                  </div>
                </div>

                {/* 3. Units Dispatched */}
                <div className="mf-kpi-card">
                  <div className="mf-kpi-head">
                    <span className="mf-kpi-title">Volume Sold</span>
                    <div className="mf-kpi-icon is-purple">
                      <Boxes size={15} />
                    </div>
                  </div>
                  <div className="mf-kpi-value">
                    {salesLoading && !salesReport
                      ? <MiniAppSkeleton className="mf-skeleton-kpi-value" />
                      : `${(salesReport?.totalUnits ?? 0).toLocaleString()} units`}
                  </div>
                  <div className="mf-kpi-sub">
                    <span className="mf-trend-badge is-up">📦 Factory stock</span>
                    <span>dispatched</span>
                  </div>
                </div>

                {/* 4. Average Order Value */}
                <div className="mf-kpi-card">
                  <div className="mf-kpi-head">
                    <span className="mf-kpi-title">Avg Order Value</span>
                    <div className="mf-kpi-icon is-amber">
                      <Activity size={15} />
                    </div>
                  </div>
                  <div className="mf-kpi-value">
                    {salesLoading && !salesReport
                      ? <MiniAppSkeleton className="mf-skeleton-kpi-value" />
                      : `ETB ${(salesReport?.averageOrderValue ?? 0).toLocaleString("en-ET", {
                        maximumFractionDigits: 0,
                      })}`}
                  </div>
                  <div className="mf-kpi-sub">
                    <span className="mf-trend-badge is-up">Per ticket</span>
                    <span>basket average</span>
                  </div>
                </div>
              </div>

              {/* 2-Column Split: Revenue Trend Chart & Top Products Leaderboard */}
              <div className="mf-analytics-split-grid">
                {/* Left: Revenue Trend Chart */}
                <div className="mf-chart-card" style={{ marginBottom: 0 }}>
                  <div className="mf-chart-header">
                    <div className="mf-chart-title">
                      <h2>Revenue Trajectory</h2>
                      <span>
                        {salesPeriod === "daily"
                          ? "Today's Timeline"
                          : salesPeriod === "weekly"
                            ? "Daily Distribution"
                            : "Historical Breakdown"}
                      </span>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--mf-forest)" }}>ETB</span>
                  </div>

                  {salesLoading && !salesReport ? (
                    <div className="mf-chart-skeleton" role="status" aria-label="Loading sales chart">
                      {Array.from({ length: 7 }, (_, index) => (
                        <MiniAppSkeleton className={`mf-skeleton-chart-bar bar-${index + 1}`} key={index} />
                      ))}
                    </div>
                  ) : salesReport && salesReport.timeline.length > 0 ? (
                    <div className="mf-timeline-bar-chart">
                      {salesReport.timeline.map((point) => (
                        <div className="mf-chart-col" key={point.label}>
                          <div
                            className="mf-chart-bar-bg"
                            title={`${point.label}: ETB ${point.revenue.toLocaleString()} (${point.orders} orders)`}
                          >
                            <div
                              className="mf-chart-bar-fill"
                              style={{
                                height: `${Math.max(10, (point.revenue / maxTimelineRevenue) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="mf-chart-label">{point.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--mf-text-muted)" }}>
                      No sales recorded in this period yet.
                    </div>
                  )}

                  <div className="mf-chart-insights">
                    <div className="mf-insight-item">
                      <strong>{salesReport?.totalOrders ?? 0} Orders</strong>
                      <small>Recorded Activity</small>
                    </div>
                    <div className="mf-insight-item">
                      <strong>{salesReport?.totalUnits ?? 0} Units</strong>
                      <small>Dispatched</small>
                    </div>
                    <div className="mf-insight-item">
                      <strong>ETB {(salesReport?.averageOrderValue ?? 0).toLocaleString("en-ET", { maximumFractionDigits: 0 })}</strong>
                      <small>Avg Ticket</small>
                    </div>
                  </div>
                </div>

                {/* Right: Top Selling Products Leaderboard */}
                <div className="mf-card-box" style={{ marginBottom: 0 }}>
                  <div className="mf-card-box-header">
                    <h2>Top Products</h2>
                    <span className="mf-tag-pill">{salesPeriod.toUpperCase()}</span>
                  </div>

                  {salesLoading && !salesReport ? (
                    <div className="mf-top-prod-list" role="status" aria-label="Loading top products">
                      {[0, 1, 2, 3].map((index) => (
                        <div className="mf-top-product-skeleton" key={index} aria-hidden="true">
                          <MiniAppSkeleton className="mf-skeleton-rank" />
                          <span><MiniAppSkeleton className="mf-skeleton-product-title" /><MiniAppSkeleton className="mf-skeleton-product-meta" /></span>
                        </div>
                      ))}
                    </div>
                  ) : salesReport && salesReport.products.length > 0 ? (
                    <div className="mf-top-prod-list">
                      {salesReport.products.slice(0, 6).map((prod, idx) => {
                        const pct = maxProductUnits > 0 ? Math.round((prod.units / maxProductUnits) * 100) : 0;
                        return (
                          <div className="mf-top-prod-row" key={idx}>
                            <div className={`mf-rank-pill ${idx === 0 ? "is-first" : ""}`}>
                              #{idx + 1}
                            </div>
                            <div className="mf-top-prod-info">
                              <div className="mf-top-prod-head">
                                <span className="mf-top-prod-name">{prod.name}</span>
                                <span className="mf-top-prod-units">{prod.units} units</span>
                              </div>
                              <div className="mf-prod-bar-track">
                                <div className="mf-prod-bar-fill" style={{ width: `${Math.max(8, pct)}%` }} />
                              </div>
                              <div className="mf-top-prod-meta">
                                <small>ETB {prod.revenue.toLocaleString("en-ET")}</small>
                                <small>{pct}% of peak volume</small>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--mf-text-muted)" }}>
                      No products sold in this period.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SECTION: REVIEWS MODERATION
             ══════════════════════════════════════════════════════════════════ */}
          {activeSection === "reviews" && (
            <>
              {/* Header with Segmented Filter Switcher */}
              <div className="mf-analytics-header">
                <div className="mf-analytics-title-col">
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--mf-gold)", marginBottom: "3px" }}>
                    Quality &amp; Moderation
                  </div>
                  <h2>Customer Feedback</h2>
                  <p>
                    Verify buyer reviews and manage testimonials showcased on your storefront.
                  </p>
                </div>

                <div className="mf-period-segmented-control" role="group" aria-label="Review moderation filter">
                  <button
                    type="button"
                    className={`mf-period-seg-btn${reviewStatus === "PENDING" ? " is-active" : ""}`}
                    onClick={() => {
                      triggerHaptic("light");
                      setReviewStatus("PENDING");
                    }}
                  >
                    Needs Review ({dashboard?.summary.pendingReviews ?? 0})
                  </button>
                  <button
                    type="button"
                    className={`mf-period-seg-btn${reviewStatus === "APPROVED" ? " is-active" : ""}`}
                    onClick={() => {
                      triggerHaptic("light");
                      setReviewStatus("APPROVED");
                    }}
                  >
                    Published ({dashboard?.summary.approvedReviews ?? 0})
                  </button>
                </div>
              </div>

              {/* 4 Professional KPI Cards */}
              <div className="mf-analytics-kpi-grid">
                {/* 1. Pending */}
                <div className="mf-kpi-card">
                  <div className="mf-kpi-head">
                    <span className="mf-kpi-title">Pending Moderation</span>
                    <div className={`mf-kpi-icon ${(dashboard?.summary.pendingReviews ?? 0) > 0 ? "is-amber" : "is-green"}`}>
                      <Clock3 size={15} />
                    </div>
                  </div>
                  <div className="mf-kpi-value">{dashboard?.summary.pendingReviews ?? 0}</div>
                  <div className="mf-kpi-sub">
                    {(dashboard?.summary.pendingReviews ?? 0) > 0 ? (
                      <span className="mf-trend-badge is-down">Action required</span>
                    ) : (
                      <span className="mf-trend-badge is-up">✓ Queue clear</span>
                    )}
                    <span>Needs approval</span>
                  </div>
                </div>

                {/* 2. Published */}
                <div className="mf-kpi-card">
                  <div className="mf-kpi-head">
                    <span className="mf-kpi-title">Published Live</span>
                    <div className="mf-kpi-icon is-green">
                      <CheckCircle2 size={15} />
                    </div>
                  </div>
                  <div className="mf-kpi-value">{dashboard?.summary.approvedReviews ?? 0}</div>
                  <div className="mf-kpi-sub">
                    <span className="mf-trend-badge is-up">● Active</span>
                    <span>Live on storefront</span>
                  </div>
                </div>

                {/* 3. Positive Share */}
                <div className="mf-kpi-card">
                  <div className="mf-kpi-head">
                    <span className="mf-kpi-title">Positive Rating</span>
                    <div className="mf-kpi-icon is-blue">
                      <ThumbsUp size={15} />
                    </div>
                  </div>
                  <div className="mf-kpi-value">{positiveRatio}</div>
                  <div className="mf-kpi-sub">
                    <span className="mf-trend-badge is-up">★ 4 &amp; 5 stars</span>
                    <span>Customer sentiment</span>
                  </div>
                </div>

                {/* 4. Average Rating */}
                <div className="mf-kpi-card">
                  <div className="mf-kpi-head">
                    <span className="mf-kpi-title">Average Rating</span>
                    <div className="mf-kpi-icon is-amber">
                      <Star size={15} />
                    </div>
                  </div>
                  <div className="mf-kpi-value" style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
                    {avgRating} <span style={{ fontSize: "13px", color: "var(--mf-gold)", fontWeight: 700 }}>/ 5.0</span>
                  </div>
                  <div className="mf-kpi-sub">
                    <span className="mf-trend-badge is-up">★★★★★</span>
                    <span>Overall score</span>
                  </div>
                </div>
              </div>

              {/* Reviews List */}
              <div className="mf-reviews-list">
                {visibleReviews.map((review) => {
                  const initials = review.displayName
                    ? review.displayName
                      .split(" ")
                      .filter(Boolean)
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                    : "CU";

                  return (
                    <div key={review.id} className="mf-review-card">
                      <div className="mf-review-card-head">
                        <div className="mf-review-author-meta">
                          <div className="mf-avatar-badge">{initials}</div>
                          <div>
                            <div className="mf-review-name-row">
                              <span className="mf-review-author-name">{review.displayName}</span>
                              <span className="mf-verified-pill">
                                <ShieldCheck size={11} /> Verified Buyer
                              </span>
                            </div>
                            <div className="mf-review-order-ref">
                              Order <b style={{ color: "var(--mf-forest)" }}>#{review.orderNumber}</b>
                              {review.productName ? ` · ${review.productName}` : ""}
                            </div>
                          </div>
                        </div>

                        <div className="mf-review-rating-block">
                          <div className="mf-review-star-row" aria-label={`${review.rating} out of 5 stars`}>
                            {[1, 2, 3, 4, 5].map((starIndex) => (
                              <Star
                                key={starIndex}
                                size={14}
                                className={starIndex <= review.rating ? "mf-star-filled" : "mf-star-empty"}
                                fill={starIndex <= review.rating ? "#c99a4a" : "none"}
                                color={starIndex <= review.rating ? "#c99a4a" : "#d1d5db"}
                              />
                            ))}
                          </div>
                          <span className="mf-review-date">
                            {new Date(review.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="mf-review-card-body">
                        <blockquote className="mf-review-quote">
                          &ldquo;{review.comment}&rdquo;
                        </blockquote>
                      </div>

                      <div className="mf-review-card-actions">
                        {reviewStatus === "PENDING" ? (
                          <div className="mf-review-action-btns">
                            <button
                              type="button"
                              className="mf-btn-approve"
                              onClick={() =>
                                void manageAction(
                                  { action: "review-approve", reviewId: review.id },
                                  "Review approved & published.",
                                )
                              }
                              disabled={busyAction === review.id}
                            >
                              <Check size={14} /> Approve &amp; Publish
                            </button>
                            <button
                              type="button"
                              className="mf-btn-reject"
                              onClick={() => {
                                if (window.confirm("Reject and delete this review?")) {
                                  void manageAction({ action: "review-reject", reviewId: review.id }, "Review rejected.");
                                }
                              }}
                              disabled={busyAction === review.id}
                            >
                              <Trash2 size={13} /> Reject
                            </button>
                          </div>
                        ) : (
                          <div className="mf-review-approved-row">
                            <span className="mf-published-live-tag">
                              <CheckCircle2 size={13} /> Published on storefront
                            </span>
                            <button
                              type="button"
                              className="mf-btn-unpublish"
                              onClick={() => {
                                if (window.confirm("Unpublish this review from storefront?")) {
                                  void manageAction({ action: "review-reject", reviewId: review.id }, "Review removed from storefront.");
                                }
                              }}
                              disabled={busyAction === review.id}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {!loading && visibleReviews.length === 0 && (
                  <div className="mf-reviews-empty-box">
                    <div className="mf-reviews-empty-icon">
                      <MessageSquare size={22} />
                    </div>
                    <h3 className="mf-reviews-empty-title">
                      {reviewStatus === "PENDING" ? "Queue Is Clear" : "No Published Reviews Yet"}
                    </h3>
                    <p className="mf-reviews-empty-desc">
                      {reviewStatus === "PENDING"
                        ? "All customer feedback has been moderated. New reviews submitted after orders will appear here for verification."
                        : "Approved reviews will appear here and display publicly on your customer storefront."}
                    </p>
                    {reviewStatus === "PENDING" && (dashboard?.summary.approvedReviews ?? 0) > 0 && (
                      <button
                        type="button"
                        className="mf-btn-secondary"
                        style={{ marginTop: "14px", height: "30px", fontSize: "11.5px", padding: "0 12px" }}
                        onClick={() => {
                          triggerHaptic("light");
                          setReviewStatus("APPROVED");
                        }}
                      >
                        View Published Reviews ({dashboard?.summary.approvedReviews ?? 0}) →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SECTION: PAYMENT ACCOUNTS
             ══════════════════════════════════════════════════════════════════ */}
          {activeSection === "payments" && (
            <>
              <div className="mf-analytics-header">
                <div className="mf-analytics-title-col">
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--mf-gold)", marginBottom: "3px" }}>
                    Checkout &amp; Settlement
                  </div>
                  <h2>Payment Accounts</h2>
                  <p>
                    Configure the bank accounts and mobile wallet details presented to customers during storefront checkout.
                  </p>
                </div>
                <div className="mf-payment-badge-total">
                  {(dashboard?.paymentMethods || []).filter(
                    (m) => (paymentDrafts[m.code]?.isEnabled ?? m.isEnabled),
                  ).length} Active Methods
                </div>
              </div>

              <div className="mf-payment-grid">
                {(dashboard?.paymentMethods || []).map((method) => {
                  const draft = paymentDrafts[method.code] || method;
                  const isTelebirr = method.code === "telebirr";
                  const isCbe = method.code === "cbe";
                  const isBoa = method.code === "boa";
                  const isAwash = method.code === "awash";

                  const badgeClass = isTelebirr
                    ? "is-telebirr"
                    : isCbe
                      ? "is-cbe"
                      : isBoa
                        ? "is-boa"
                        : isAwash
                          ? "is-awash"
                          : "is-default";

                  return (
                    <form
                      key={method.code}
                      className={`mf-payment-card${draft.isEnabled ? " is-enabled" : " is-disabled"}`}
                      onSubmit={(e) => {
                        e.preventDefault();
                        triggerHaptic("medium");
                        void manageAction(
                          { action: "payment-method-update", ...draft },
                          `${draft.displayName} payment settings saved.`,
                        );
                      }}
                    >
                      <div className="mf-payment-card-head">
                        <div className="mf-payment-brand-group">
                          <div className="mf-payment-logo-container">
                            {PAYMENT_LOGOS[method.code] ? (
                              <img
                                src={PAYMENT_LOGOS[method.code]}
                                alt={method.displayName}
                                className="mf-payment-logo-img"
                              />
                            ) : (
                              <div className={`mf-payment-logo-badge ${badgeClass}`}>
                                {method.code.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="mf-payment-brand-name">{method.displayName}</div>
                            <span className={`mf-pay-status-pill ${draft.isEnabled ? "is-active" : "is-off"}`}>
                              {draft.isEnabled ? "● Active at Checkout" : "○ Hidden from Checkout"}
                            </span>
                          </div>
                        </div>

                        {/* Modern Toggle Switch */}
                        <label className="mf-switch" title={draft.isEnabled ? "Disable payment method" : "Enable payment method"}>
                          <input
                            type="checkbox"
                            checked={draft.isEnabled}
                            onChange={(e) =>
                              setPaymentDrafts((curr) => ({
                                ...curr,
                                [method.code]: { ...draft, isEnabled: e.target.checked },
                              }))
                            }
                          />
                          <span className="mf-slider" />
                        </label>
                      </div>

                      <div className="mf-payment-form-fields">
                        <div className="mf-field-item">
                          <label className="mf-field-label">Account Holder / Merchant Name</label>
                          <input
                            className="mf-field-input"
                            value={draft.accountName}
                            onChange={(e) =>
                              setPaymentDrafts((curr) => ({
                                ...curr,
                                [method.code]: { ...draft, accountName: e.target.value },
                              }))
                            }
                            placeholder="Official registered name"
                          />
                        </div>

                        <div className="mf-field-item">
                          <label className="mf-field-label">Account Number / Mobile Wallet</label>
                          <input
                            className="mf-field-input mf-font-numeric"
                            value={draft.accountNumber}
                            onChange={(e) =>
                              setPaymentDrafts((curr) => ({
                                ...curr,
                                [method.code]: { ...draft, accountNumber: e.target.value },
                              }))
                            }
                            placeholder="e.g. 1000... or 09..."
                          />
                        </div>
                      </div>

                      <div className="mf-payment-card-footer">
                        <button
                          type="submit"
                          className="mf-btn-save-payment"
                          disabled={busyAction === method.code}
                        >
                          {busyAction === method.code ? "Saving Changes…" : "Save Payment Details"}
                        </button>
                      </div>
                    </form>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav className="mf-bottom-nav">
        <button
          type="button"
          className={`mf-bottom-nav-item${activeSection === "overview" ? " is-active" : ""}`}
          onClick={() => {
            triggerHaptic("light");
            setActiveSection("overview");
          }}
        >
          <LayoutDashboard />
          <span>Overview</span>
        </button>

        <button
          type="button"
          className={`mf-bottom-nav-item${activeSection === "orders" ? " is-active" : ""}`}
          onClick={() => {
            triggerHaptic("light");
            setActiveSection("orders");
          }}
        >
          <ShoppingBag />
          <span>Orders</span>
          {Boolean(dashboard?.summary.pendingOrders) && (
            <span className="mf-bottom-nav-badge">{dashboard?.summary.pendingOrders}</span>
          )}
        </button>

        <button
          type="button"
          className={`mf-bottom-nav-item${activeSection === "inventory" ? " is-active" : ""}`}
          onClick={() => {
            triggerHaptic("light");
            setActiveSection("inventory");
          }}
        >
          <Package />
          <span>Inventory</span>
          {Boolean(dashboard?.summary.lowStockCount) && (
            <span className="mf-bottom-nav-badge is-danger">{dashboard?.summary.lowStockCount}</span>
          )}
        </button>

        <button
          type="button"
          className={`mf-bottom-nav-item${activeSection === "sales" ? " is-active" : ""}`}
          onClick={() => {
            triggerHaptic("light");
            setActiveSection("sales");
          }}
        >
          <BarChart3 />
          <span>Sales</span>
        </button>

        <button
          type="button"
          className={`mf-bottom-nav-item${activeSection === "reviews" || activeSection === "payments" ? " is-active" : ""
            }`}
          onClick={() => {
            triggerHaptic("light");
            setMoreMenuOpen(true);
          }}
        >
          <SlidersHorizontal />
          <span>More</span>
          {Boolean(dashboard?.summary.pendingReviews) && (
            <span className="mf-bottom-nav-badge">{dashboard?.summary.pendingReviews}</span>
          )}
        </button>
      </nav>

      {/* ── More Options Bottom Sheet ── */}
      {moreMenuOpen && (
        <div className="mf-modal-overlay" onClick={() => setMoreMenuOpen(false)}>
          <div className="mf-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mf-sheet-grab-bar" />
            <div className="mf-sheet-header">
              <h2>More Options</h2>
              <button className="mf-sheet-close-btn" onClick={() => setMoreMenuOpen(false)}>
                ×
              </button>
            </div>
            <div className="mf-sheet-body" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                className="mf-btn-secondary"
                style={{ justifyContent: "flex-start", height: "48px" }}
                onClick={() => {
                  setActiveSection("reviews");
                  setMoreMenuOpen(false);
                }}
              >
                <MessageSquare size={18} /> Customer Reviews Moderation
                {Boolean(dashboard?.summary.pendingReviews) && (
                  <span className="mf-chip-badge" style={{ marginLeft: "auto" }}>
                    {dashboard?.summary.pendingReviews}
                  </span>
                )}
              </button>

              <button
                className="mf-btn-secondary"
                style={{ justifyContent: "flex-start", height: "48px" }}
                onClick={() => {
                  setActiveSection("payments");
                  setMoreMenuOpen(false);
                }}
              >
                <Banknote size={18} /> Payment Accounts Setup
              </button>

              <a
                href="/admin"
                target="_blank"
                rel="noreferrer"
                className="mf-btn-secondary"
                style={{ justifyContent: "flex-start", height: "48px", textDecoration: "none" }}
              >
                <ExternalLink size={18} /> Open Full Admin Desktop Panel
              </a>

              {passwordAuthenticated && (
                <button
                  className="mf-btn-danger"
                  style={{ justifyContent: "flex-start", height: "48px", marginTop: "12px" }}
                  onClick={() => void signOut()}
                >
                  <LogOut size={18} /> Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Restock Bottom Sheet Modal ── */}
      {selected && (
        <div className="mf-modal-overlay" onClick={() => !saving && setSelected(null)}>
          <div className="mf-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mf-sheet-grab-bar" />
            <div className="mf-sheet-header">
              <h2>Restock Product</h2>
              <button className="mf-sheet-close-btn" onClick={() => setSelected(null)} disabled={saving}>
                ×
              </button>
            </div>

            <div className="mf-sheet-body">
              <span className="mf-kicker">INVENTORY UPDATE</span>
              <h3 style={{ margin: "4px 0 2px", fontSize: "16px", color: "var(--mf-forest-deep)" }}>
                {selected.name}
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: "12px", color: "var(--mf-muted)" }}>
                {[selected.variantType, selected.size].filter(Boolean).join(" · ")}
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "8px",
                  background: "var(--mf-bg)",
                  padding: "12px",
                  borderRadius: "var(--mf-radius-md)",
                  marginBottom: "16px",
                  textAlign: "center",
                }}
              >
                <div>
                  <strong style={{ fontSize: "18px", color: "var(--mf-forest)" }}>{selected.availableStock}</strong>
                  <div style={{ fontSize: "10px", color: "var(--mf-muted)" }}>Available</div>
                </div>
                <div>
                  <strong style={{ fontSize: "18px", color: "var(--mf-ink)" }}>{selected.stock}</strong>
                  <div style={{ fontSize: "10px", color: "var(--mf-muted)" }}>Total Stock</div>
                </div>
                <div>
                  <strong style={{ fontSize: "18px", color: "var(--mf-muted)" }}>{selected.reservedStock}</strong>
                  <div style={{ fontSize: "10px", color: "var(--mf-muted)" }}>Reserved</div>
                </div>
              </div>

              <div className="mf-input-group">
                <label>Quantity to Add (individual units)</label>
                <input
                  className="mf-input"
                  type="number"
                  min="1"
                  max="100000"
                  step="1"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  style={{ fontSize: "20px", fontWeight: 700 }}
                />
              </div>

              <div style={{ marginTop: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--mf-muted)" }}>Quick Multipliers:</span>
                <div className="mf-preset-row">
                  {[12, 24, 48, 96, 240].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={`mf-preset-btn${quantity === String(amt) ? " is-active" : ""}`}
                      onClick={() => {
                        triggerHaptic("light");
                        setQuantity(String(amt));
                      }}
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mf-sheet-footer">
              <button className="mf-btn-secondary" onClick={() => setSelected(null)} disabled={saving}>
                Cancel
              </button>
              <button className="mf-btn-primary" onClick={() => void restock()} disabled={saving}>
                {saving ? "Updating…" : "Confirm Restock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order Details Bottom Sheet ── */}
      {selectedOrder && (
        <div className="mf-modal-overlay" onClick={() => !orderDraft && !busyAction && setSelectedOrder(null)}>
          <div className="mf-bottom-sheet mf-order-details-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mf-sheet-grab-bar" />
            <div className="mf-sheet-header">
              <div>
                <span className="mf-kicker">ORDER DETAILS</span>
                <h2 className="mf-order-reference" aria-label={`Order ${selectedOrder.orderNumber}`} title={selectedOrder.orderNumber}>
                  #{selectedOrder.orderNumber.slice(-8)}
                </h2>
              </div>
              <button
                className="mf-sheet-close-btn"
                onClick={() => {
                  setOrderDraft(null);
                  setSelectedOrder(null);
                }}
                disabled={Boolean(busyAction)}
              >
                ×
              </button>
            </div>

            <div className="mf-sheet-body">
              {orderActionError && <div className="mf-error">{orderActionError}</div>}

              {/* Order Editor Mode */}
              {orderDraft ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    triggerHaptic("medium");
                    void manageAction(
                      {
                        action: "order-update",
                        orderNumber: selectedOrder.orderNumber,
                        ...orderDraft,
                        items: orderDraft.items.map((item) => ({
                          ...item,
                          quantity: Number(item.quantity),
                          unitPrice: Number(item.unitPrice),
                        })),
                      },
                      "Order updated.",
                    );
                  }}
                >
                  <div className="mf-input-group">
                    <label>Customer Name</label>
                    <input
                      className="mf-input"
                      value={orderDraft.customerName}
                      onChange={(e) => setOrderDraft({ ...orderDraft, customerName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mf-input-group">
                    <label>Phone Number</label>
                    <input
                      className="mf-input"
                      value={orderDraft.customerPhone}
                      onChange={(e) => setOrderDraft({ ...orderDraft, customerPhone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mf-input-group">
                    <label>Fulfillment</label>
                    <select
                      className="mf-select"
                      value={orderDraft.fulfillment}
                      onChange={(e) =>
                        setOrderDraft({ ...orderDraft, fulfillment: e.target.value as OrderDraft["fulfillment"] })
                      }
                    >
                      <option value="DELIVERY">Delivery</option>
                      <option value="PICKUP">Pickup</option>
                    </select>
                  </div>
                  {orderDraft.fulfillment === "DELIVERY" && (
                    <>
                      <div className="mf-input-group">
                        <label>City</label>
                        <input
                          className="mf-input"
                          value={orderDraft.city}
                          onChange={(e) => setOrderDraft({ ...orderDraft, city: e.target.value })}
                          required
                        />
                      </div>
                      <div className="mf-input-group">
                        <label>Delivery Address</label>
                        <input
                          className="mf-input"
                          value={orderDraft.deliveryAddress}
                          onChange={(e) => setOrderDraft({ ...orderDraft, deliveryAddress: e.target.value })}
                          required
                        />
                      </div>
                    </>
                  )}
                  <div className="mf-input-group">
                    <label>Delivery Fee (ETB)</label>
                    <input
                      className="mf-input"
                      type="number"
                      step="0.01"
                      value={orderDraft.deliveryFee}
                      onChange={(e) => setOrderDraft({ ...orderDraft, deliveryFee: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ marginTop: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <strong>Order Items</strong>
                      <button
                        type="button"
                        className="mf-text-btn"
                        onClick={() =>
                          setOrderDraft({
                            ...orderDraft,
                            items: [
                              ...orderDraft.items,
                              {
                                productId: "",
                                quantity: "1",
                                unitPrice: "0",
                                packagingLabel: "Single unit",
                                unitsPerPackage: 1,
                                packageQuantity: 1,
                              },
                            ],
                          })
                        }
                      >
                        + Add Item
                      </button>
                    </div>

                    {orderDraft.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "var(--mf-bg)",
                          padding: "10px",
                          borderRadius: "8px",
                          marginBottom: "8px",
                        }}
                      >
                        <select
                          className="mf-select"
                          value={item.productId}
                          onChange={(e) => {
                            const found = dashboard?.products.find((p) => p.id === e.target.value);
                            const copy = [...orderDraft.items];
                            copy[idx] = {
                              ...copy[idx],
                              productId: e.target.value,
                              unitPrice: found ? String(found.price) : copy[idx].unitPrice,
                            };
                            setOrderDraft({ ...orderDraft, items: copy });
                          }}
                          required
                        >
                          <option value="">Select product</option>
                          {dashboard?.products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.availableStock} available)
                            </option>
                          ))}
                        </select>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px", marginTop: "6px" }}>
                          <input
                            className="mf-input"
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const copy = [...orderDraft.items];
                              copy[idx] = { ...copy[idx], quantity: e.target.value };
                              setOrderDraft({ ...orderDraft, items: copy });
                            }}
                            placeholder="Qty"
                            required
                          />
                          <input
                            className="mf-input"
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => {
                              const copy = [...orderDraft.items];
                              copy[idx] = { ...copy[idx], unitPrice: e.target.value };
                              setOrderDraft({ ...orderDraft, items: copy });
                            }}
                            placeholder="Price"
                            required
                          />
                          <button
                            type="button"
                            className="mf-btn-danger"
                            onClick={() =>
                              setOrderDraft({
                                ...orderDraft,
                                items: orderDraft.items.filter((_, i) => i !== idx),
                              })
                            }
                            disabled={orderDraft.items.length === 1}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px",
                      background: "var(--mf-forest-subtle)",
                      borderRadius: "8px",
                      marginTop: "12px",
                    }}
                  >
                    <span>Estimated Total:</span>
                    <strong style={{ color: "var(--mf-forest)" }}>ETB {draftOrderTotal.toLocaleString("en-ET")}</strong>
                  </div>

                  <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                    <button type="button" className="mf-btn-secondary" onClick={() => setOrderDraft(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="mf-btn-primary" disabled={Boolean(busyAction)}>
                      {busyAction ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </form>
              ) : (
                /* Standard Order View */
                <>
                  <div className="mf-order-detail-meta" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                    <span className={`mf-status-pill is-${selectedOrder.status.toLowerCase()}`}>
                      {selectedOrder.status.replaceAll("_", " ")}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--mf-muted)" }}>
                      {new Date(selectedOrder.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Customer Card */}
                  <div
                    className="mf-order-detail-card"
                    style={{
                      background: "var(--mf-bg)",
                      border: "1px solid var(--mf-line)",
                      borderRadius: "var(--mf-radius-md)",
                      padding: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--mf-muted)", marginBottom: "4px" }}>
                      CUSTOMER CONTACT
                    </div>
                    <strong style={{ fontSize: "14px", display: "block" }}>{selectedOrder.customerName}</strong>
                    {selectedOrder.company && (
                      <span style={{ fontSize: "12px", color: "var(--mf-muted)" }}>{selectedOrder.company}</span>
                    )}
                    <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                      <a
                        href={`tel:${selectedOrder.customerPhone}`}
                        className="mf-btn-primary"
                        style={{ height: "36px", fontSize: "12px", textDecoration: "none" }}
                      >
                        <Phone size={14} /> Call {selectedOrder.customerPhone}
                      </a>
                    </div>
                  </div>

                  {/* Fulfillment Details */}
                  <div
                    className="mf-order-detail-card"
                    style={{
                      background: "var(--mf-bg)",
                      border: "1px solid var(--mf-line)",
                      borderRadius: "var(--mf-radius-md)",
                      padding: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--mf-muted)", marginBottom: "4px" }}>
                      FULFILLMENT &amp; PAYMENT
                    </div>
                    <div>
                      <b>Type:</b> {selectedOrder.fulfillment === "DELIVERY" ? "Delivery" : "Pickup"}
                    </div>
                    {selectedOrder.fulfillment === "DELIVERY" && (
                      <div>
                        <b>Address:</b> {[selectedOrder.city, selectedOrder.deliveryAddress].filter(Boolean).join(" · ")}
                      </div>
                    )}
                    <div>
                      <b>Payment:</b> {selectedOrder.paymentPreference}
                    </div>
                    {selectedOrder.notes && (
                      <div style={{ marginTop: "4px", color: "var(--mf-muted)" }}>
                        <b>Notes:</b> {selectedOrder.notes}
                      </div>
                    )}
                  </div>

                  {/* Payment Proof Screenshot */}
                  {selectedOrder.hasPaymentProof && (
                    <div
                      style={{
                        background: "var(--mf-bg)",
                        border: "1px solid var(--mf-line)",
                        borderRadius: "var(--mf-radius-md)",
                        padding: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--mf-muted)", marginBottom: "8px" }}>
                        PAYMENT SCREENSHOT PROOF
                      </div>
                      <a
                        href={`/api/telegram/miniapp/orders/${encodeURIComponent(selectedOrder.orderNumber)}/payment-proof`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "block", textAlign: "center" }}
                      >
                        <img
                          src={`/api/telegram/miniapp/orders/${encodeURIComponent(selectedOrder.orderNumber)}/payment-proof`}
                          alt="Payment screenshot"
                          style={{
                            maxWidth: "100%",
                            maxHeight: "180px",
                            borderRadius: "8px",
                            margin: "0 auto",
                            border: "1px solid var(--mf-line)",
                          }}
                        />
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--mf-forest)", marginTop: "6px" }}>
                          <ExternalLink size={12} /> View Full-Size Screenshot
                        </span>
                      </a>
                    </div>
                  )}

                  {/* Itemized Products */}
                  <div className="mf-order-items-section" style={{ margin: "14px 0" }}>
                    <div className="mf-order-items-heading" style={{ fontSize: "12px", fontWeight: 800, color: "var(--mf-forest-deep)", marginBottom: "8px" }}>
                      ORDER ITEMS ({selectedOrder.items.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {selectedOrder.items.map((item) => (
                        <div
                          key={item.id}
                          className="mf-order-item"
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            padding: "8px 0",
                            borderBottom: "1px solid var(--mf-line-subtle)",
                          }}
                        >
                          <div className="mf-order-item-info">
                            <strong style={{ fontSize: "13px" }}>{item.name}</strong>
                            <div style={{ fontSize: "11px", color: "var(--mf-muted)" }}>
                              {item.packageQuantity} × {item.packagingLabel} ({item.quantity} individual units)
                              {item.size ? ` · ${item.size}` : ""}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--mf-forest)" }}>
                              ETB {item.unitPrice.toLocaleString("en-ET")} / unit
                            </div>
                          </div>
                          <strong className="mf-order-item-total" style={{ fontSize: "13px" }}>ETB {item.lineTotal.toLocaleString("en-ET")}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="mf-order-totals" style={{ borderTop: "1px solid var(--mf-line)", paddingTop: "10px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--mf-muted)" }}>
                      <span>Delivery Fee:</span>
                      <span>ETB {selectedOrder.deliveryFee.toLocaleString("en-ET")}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 800, marginTop: "6px" }}>
                      <span>Order Total:</span>
                      <span style={{ color: "var(--mf-forest)" }}>ETB {selectedOrder.total.toLocaleString("en-ET")}</span>
                    </div>
                  </div>

                  {/* Status Progression & Actions Bar */}
                  <div className="mf-order-detail-actions" style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "14px" }}>
                    {/* Status Progression Actions */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {/* PENDING -> Confirm / Reject */}
                      {selectedOrder.status === "PENDING" && (
                        <>
                          <SwipeAction
                            label="confirm order"
                            disabled={busyAction === selectedOrder.orderNumber}
                            onComplete={() => {
                              triggerHaptic("medium");
                              if (window.confirm(`Confirm order ${selectedOrder.orderNumber}? Stock will be deducted.`)) {
                                void manageAction(
                                  { action: "order-confirm", orderNumber: selectedOrder.orderNumber },
                                  "Order confirmed.",
                                  false,
                                  true,
                                );
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="mf-btn-danger"
                            style={{ minHeight: "38px", padding: "0 14px" }}
                            onClick={() => {
                              triggerHaptic("warning");
                              if (window.confirm(`Reject order ${selectedOrder.orderNumber}? Reserved stock will be released.`)) {
                                void manageAction(
                                  { action: "order-reject", orderNumber: selectedOrder.orderNumber },
                                  "Order rejected.",
                                  false,
                                  true,
                                );
                              }
                            }}
                            disabled={busyAction === selectedOrder.orderNumber}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {/* CONFIRMED -> Preparing */}
                      {selectedOrder.status === "CONFIRMED" && (
                        <SwipeAction
                          label="start preparing"
                          disabled={busyAction === selectedOrder.orderNumber}
                          onComplete={() => {
                            triggerHaptic("medium");
                            void manageAction(
                              { action: "order-status-update", orderNumber: selectedOrder.orderNumber, newStatus: "PREPARING" },
                              "Order is now being prepared.",
                              false,
                              true,
                            );
                          }}
                        />
                      )}

                      {/* PREPARING -> Out for delivery or Ready for pickup */}
                      {selectedOrder.status === "PREPARING" && (
                        <SwipeAction
                          label={selectedOrder.fulfillment === "DELIVERY" ? "send for delivery" : "ready for pickup"}
                          disabled={busyAction === selectedOrder.orderNumber}
                          onComplete={() => {
                            triggerHaptic("medium");
                            const next = selectedOrder.fulfillment === "DELIVERY" ? "OUT_FOR_DELIVERY" : "READY_FOR_PICKUP";
                            void manageAction(
                              { action: "order-status-update", orderNumber: selectedOrder.orderNumber, newStatus: next },
                              next === "OUT_FOR_DELIVERY" ? "Order dispatched for delivery." : "Order is ready for customer pickup.",
                              false,
                              true,
                            );
                          }}
                        />
                      )}

                      {/* OUT_FOR_DELIVERY or READY_FOR_PICKUP -> Completed */}
                      {(selectedOrder.status === "OUT_FOR_DELIVERY" || selectedOrder.status === "READY_FOR_PICKUP") && (
                        <SwipeAction
                          label="mark completed"
                          disabled={busyAction === selectedOrder.orderNumber}
                          onComplete={() => {
                            triggerHaptic("medium");
                            if (window.confirm(`Mark order ${selectedOrder.orderNumber} as completed?`)) {
                              void manageAction(
                                { action: "order-status-update", orderNumber: selectedOrder.orderNumber, newStatus: "COMPLETED" },
                                "Order completed successfully.",
                                false,
                                true,
                              );
                            }
                          }}
                        />
                      )}

                      {/* Edit Order at ANY active stage */}
                      {selectedOrder.status !== "CANCELLED" && (
                        <button
                          type="button"
                          className="mf-btn-secondary"
                          style={{ minHeight: "38px", padding: "0 14px" }}
                          onClick={() => beginOrderEdit(selectedOrder)}
                          disabled={busyAction === selectedOrder.orderNumber}
                        >
                          <SquarePen size={14} /> Edit Order
                        </button>
                      )}
                    </div>

                    {/* Status Override / Cancel option */}
                    {selectedOrder.status !== "COMPLETED" && selectedOrder.status !== "CANCELLED" && (
                      <div className="mf-order-status-override" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", paddingTop: "8px", borderTop: "1px dashed var(--mf-line)" }}>
                        <div className="mf-order-status-control" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--mf-muted)" }}>
                          <span>Status Override:</span>
                          <select
                            className="mf-select"
                            style={{ height: "30px", fontSize: "11px", padding: "0 8px" }}
                            value={selectedOrder.status}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val !== selectedOrder.status) {
                                void manageAction(
                                  { action: "order-status-update", orderNumber: selectedOrder.orderNumber, newStatus: val },
                                  `Order status changed to ${val}.`,
                                  false,
                                  true,
                                );
                              }
                            }}
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="PREPARING">PREPARING</option>
                            <option value="READY_FOR_PICKUP">READY FOR PICKUP</option>
                            <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          className="mf-btn-danger"
                          style={{ height: "30px", fontSize: "11px", padding: "0 10px" }}
                          onClick={() => {
                            if (window.confirm(`Cancel order ${selectedOrder.orderNumber}?`)) {
                              void manageAction(
                                { action: "order-status-update", orderNumber: selectedOrder.orderNumber, newStatus: "CANCELLED" },
                                "Order cancelled.",
                                false,
                                true,
                              );
                            }
                          }}
                          disabled={busyAction === selectedOrder.orderNumber}
                        >
                          Cancel Order
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Product Details Bottom Sheet Modal ── */}
      {productDetails && (
        <div className="mf-modal-overlay" onClick={() => setProductDetails(null)}>
          <div className="mf-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mf-sheet-grab-bar" />
            <div className="mf-sheet-header">
              <div>
                <span className="mf-kicker">PRODUCT MANAGEMENT</span>
                <h2 style={{ fontSize: "16px" }}>{productDetails.name}</h2>
              </div>
              <button className="mf-sheet-close-btn" onClick={() => setProductDetails(null)}>
                ×
              </button>
            </div>

            <div className="mf-sheet-body">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <span className="mf-product-cat-tag">{productDetails.category}</span>
                {productDetails.size && <span style={{ fontSize: "12px", color: "var(--mf-muted)" }}>· {productDetails.size}</span>}
                <span
                  className={`mf-stock-pill-tag${!productDetails.isActive
                    ? " is-archived"
                    : productDetails.stock === 0
                      ? " is-out"
                      : productDetails.lowStock
                        ? " is-low"
                        : " is-in"
                    }`}
                  style={{ position: "static" }}
                >
                  {!productDetails.isActive ? "Archived" : productDetails.stock === 0 ? "Out" : productDetails.lowStock ? "Low" : "In Stock"}
                </span>
              </div>

              {/* Storefront Visibility Banner */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px",
                  background: productDetails.isPublished ? "#ecfdf5" : "#f9fafb",
                  border: `1px solid ${productDetails.isPublished ? "#a7f3d0" : "var(--mf-border)"}`,
                  borderRadius: "var(--mf-radius-md)",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <strong style={{ fontSize: "13px", color: productDetails.isPublished ? "#065f46" : "var(--mf-text)", display: "block" }}>
                    {productDetails.isPublished ? "✓ Visible on Storefront" : "○ Hidden from Storefront"}
                  </strong>
                  <span style={{ fontSize: "11px", color: productDetails.isPublished ? "#047857" : "var(--mf-text-muted)" }}>
                    {productDetails.isPublished ? "Customers can view, customize, and order." : "Hidden from customer storefront catalogue."}
                  </span>
                </div>
                {productDetails.isActive && (
                  <button
                    type="button"
                    className={productDetails.isPublished ? "mf-btn-danger" : "mf-btn-primary"}
                    style={{ height: "30px", fontSize: "11px", padding: "0 10px" }}
                    onClick={() =>
                      void manageAction(
                        {
                          action: "product-publish-update",
                          productId: productDetails.id,
                          isPublished: !productDetails.isPublished,
                        },
                        productDetails.isPublished ? "Product hidden from storefront." : "Product published to storefront.",
                      )
                    }
                    disabled={busyAction === productDetails.id}
                  >
                    {productDetails.isPublished ? <><EyeOff size={13} /> Hide Product</> : <><Eye size={13} /> Publish Product</>}
                  </button>
                )}
              </div>

              {/* Price Panel */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--mf-forest-subtle)",
                  padding: "12px",
                  borderRadius: "var(--mf-radius-md)",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", color: "var(--mf-muted)" }}>Retail Price</span>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--mf-forest)" }}>
                    ETB {productDetails.price.toLocaleString("en-ET")}
                  </div>
                </div>
                {productDetails.isActive && (
                  <button
                    className="mf-btn-secondary"
                    style={{ minHeight: "34px", padding: "0 10px", fontSize: "11px" }}
                    onClick={() => {
                      setPriceDraft(String(productDetails.price));
                      setEditingPrice(!editingPrice);
                    }}
                  >
                    {editingPrice ? "Cancel" : "Change Price"}
                  </button>
                )}
              </div>

              {/* Promotion Configuration */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--mf-border)",
                  borderRadius: "var(--mf-radius-md)",
                  padding: "12px",
                  marginBottom: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "13px", color: "var(--mf-forest-deep)", display: "block" }}>
                      🏷️ Storefront Promotion
                    </strong>
                    <span style={{ fontSize: "11px", color: "var(--mf-text-muted)" }}>
                      {productDetails.promotionEnabled && productDetails.promotionDiscountPercent
                        ? `Active: ${productDetails.promotionDiscountPercent}% OFF (Promo Price: ETB ${((productDetails.price * (100 - Number(productDetails.promotionDiscountPercent))) / 100).toLocaleString("en-ET")})`
                        : "No promotional discount configured."}
                    </span>
                  </div>
                  {productDetails.isActive && (
                    <button
                      type="button"
                      className="mf-btn-secondary"
                      style={{ height: "28px", fontSize: "11px", padding: "0 8px" }}
                      onClick={() => setEditingPromo(!editingPromo)}
                    >
                      {editingPromo ? "Cancel" : "Configure Promo"}
                    </button>
                  )}
                </div>

                {editingPromo && (
                  <form
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      marginTop: "10px",
                      paddingTop: "10px",
                      borderTop: "1px dashed var(--mf-border)",
                    }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      triggerHaptic("medium");
                      void manageAction(
                        {
                          action: "product-update",
                          productId: productDetails.id,
                          name: productDetails.name,
                          categoryId: productDetails.categoryId,
                          flavor: productDetails.flavor || "",
                          variantType: productDetails.variantType || "",
                          size: productDetails.size || "",
                          description: productDetails.description || "",
                          minimumOrderQuantity: productDetails.minimumOrderQuantity,
                          promotionEnabled: promoDraft.enabled,
                          promotionDiscountPercent: promoDraft.discount || null,
                        },
                        "Promotion settings updated.",
                      );
                      setEditingPromo(false);
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={promoDraft.enabled}
                        onChange={(e) => setPromoDraft((p) => ({ ...p, enabled: e.target.checked }))}
                      />
                      Enable Promotional Discount on Storefront
                    </label>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input
                        className="mf-input"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="99.99"
                        value={promoDraft.discount}
                        onChange={(e) => setPromoDraft((p) => ({ ...p, discount: e.target.value }))}
                        placeholder="Discount % (e.g. 15)"
                        style={{ flex: 1 }}
                      />
                      <button type="submit" className="mf-btn-primary" style={{ height: "38px", padding: "0 14px", fontSize: "12px" }}>
                        Save Promo
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {editingPrice && (
                <form
                  style={{ display: "flex", gap: "8px", marginBottom: "14px" }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    triggerHaptic("medium");
                    void manageAction(
                      { action: "update-price", productId: productDetails.id, price: priceDraft },
                      "Price updated.",
                    );
                    setEditingPrice(false);
                  }}
                >
                  <input
                    className="mf-input"
                    type="number"
                    step="0.01"
                    value={priceDraft}
                    onChange={(e) => setPriceDraft(e.target.value)}
                    placeholder="New price in ETB"
                    required
                  />
                  <button type="submit" className="mf-btn-primary" style={{ whiteSpace: "nowrap" }}>
                    Save Price
                  </button>
                </form>
              )}

              {/* Stock Numbers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "8px",
                  background: "var(--mf-bg)",
                  padding: "12px",
                  borderRadius: "var(--mf-radius-md)",
                  textAlign: "center",
                  marginBottom: "14px",
                }}
              >
                <div>
                  <strong style={{ fontSize: "18px", color: "var(--mf-forest)" }}>{productDetails.availableStock}</strong>
                  <div style={{ fontSize: "10px", color: "var(--mf-muted)" }}>Available</div>
                </div>
                <div>
                  <strong style={{ fontSize: "18px", color: "var(--mf-ink)" }}>{productDetails.stock}</strong>
                  <div style={{ fontSize: "10px", color: "var(--mf-muted)" }}>Total Stock</div>
                </div>
                <div>
                  <strong style={{ fontSize: "18px", color: "var(--mf-muted)" }}>{productDetails.reservedStock}</strong>
                  <div style={{ fontSize: "10px", color: "var(--mf-muted)" }}>Reserved</div>
                </div>
              </div>

              {/* Actions Row */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                {productDetails.isActive && (
                  <button
                    className="mf-btn-primary"
                    onClick={() => {
                      triggerHaptic("medium");
                      setSelected(productDetails);
                      setQuantity("24");
                      setProductDetails(null);
                    }}
                  >
                    <ArrowDownToLine size={15} /> Restock Product
                  </button>
                )}
                <button
                  className={productDetails.isActive ? "mf-btn-danger" : "mf-btn-primary"}
                  onClick={() => toggleProductArchive(productDetails)}
                  disabled={busyAction === productDetails.id}
                >
                  {productDetails.isActive ? (
                    <>
                      <Archive size={14} /> Archive
                    </>
                  ) : (
                    <>
                      <RotateCcw size={14} /> Restore
                    </>
                  )}
                </button>
              </div>

              {/* Photo Upload */}
              <div className="mf-input-group">
                <label>Update Product Images (up to 5 PNG/JPG)</label>
                <input
                  className="mf-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => void updateCatalogImage(e, "product-gallery-update", productDetails.id)}
                />
              </div>

              {/* Stock Movement History */}
              <div style={{ marginTop: "14px" }}>
                <strong style={{ display: "block", fontSize: "13px", marginBottom: "8px", color: "var(--mf-forest-deep)" }}>
                  Recent Stock Changes ({productDetails.stockMovements.length})
                </strong>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {productDetails.stockMovements.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px",
                        background: "var(--mf-bg)",
                        borderRadius: "6px",
                        fontSize: "11px",
                      }}
                    >
                      <div>
                        <b>{m.reason.replaceAll("_", " ")}</b>
                        <div style={{ color: "var(--mf-muted)" }}>
                          {m.previousStock} → {m.newStock} units
                        </div>
                      </div>
                      <span
                        style={{
                          fontWeight: 800,
                          color: m.change > 0 ? "var(--mf-success)" : "var(--mf-danger)",
                        }}
                      >
                        {m.change > 0 ? `+${m.change}` : m.change}
                      </span>
                    </div>
                  ))}
                  {!productDetails.stockMovements.length && (
                    <div style={{ color: "var(--mf-muted)", fontSize: "12px" }}>No stock movements recorded yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Category Edit Modal ── */}
      {editingCategory && (
        <div className="mf-modal-overlay" onClick={() => !savingCatalog && setEditingCategory(null)}>
          <div className="mf-bottom-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="mf-sheet-grab-bar" />
            <div className="mf-sheet-header">
              <div>
                <span className="mf-kicker">CATALOG SETTINGS</span>
                <h2 style={{ fontSize: "16px" }}>Edit Category</h2>
              </div>
              <button className="mf-sheet-close-btn" onClick={() => setEditingCategory(null)} disabled={savingCatalog}>
                ×
              </button>
            </div>
            <div className="mf-sheet-body">
              <form onSubmit={(e) => void submitCategoryUpdate(e)}>
                <div className="mf-input-group">
                  <label>Category Name *</label>
                  <input className="mf-input" name="name" defaultValue={editingCategory.name} required maxLength={100} />
                </div>
                <div className="mf-input-group">
                  <label>Description</label>
                  <textarea
                    className="mf-input"
                    name="description"
                    defaultValue={editingCategory.description || ""}
                    rows={3}
                    maxLength={500}
                    style={{ height: "auto", padding: "8px 12px" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "14px" }}>
                  <button type="button" className="mf-btn-secondary" onClick={() => setEditingCategory(null)} disabled={savingCatalog}>
                    Cancel
                  </button>
                  <button type="submit" className="mf-btn-primary" disabled={savingCatalog}>
                    {savingCatalog ? "Saving…" : "Save Category"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
