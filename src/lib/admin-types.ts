import type { Prisma } from "@/generated/prisma/client";

export type AdminCategory = Prisma.CategoryGetPayload<{
  include: { _count: { select: { products: true } } };
}>;

export type AdminProduct = Prisma.ProductGetPayload<{
  include: {
    category: { select: { id: true; name: true; slug: true } };
    packagingOptions: true;
  };
}>;

export type AdminCustomer = Prisma.CustomerGetPayload<{
  include: {
    orders: {
      select: {
        id: true;
        orderNumber: true;
        total: true;
        paidAmount: true;
        status: true;
        paymentStatus: true;
        createdAt: true;
        items: {
          select: {
            id: true;
            productName: true;
            quantity: true;
            lineTotal: true;
          };
        };
      };
    };
  };
}> & {
  totalOrders: number;
  totalPurchases: number;
  unpaidBalance: number;
  creditBalance: number;
  creditTransactions: Array<{
    id: string;
    type: "CREDIT" | "REPAYMENT";
    amount: number;
    notes: string | null;
    recordedBy: string | null;
    createdAt: Date | string;
    items: Array<{
      id: string;
      productName: string;
      productSku: string;
      quantity: number;
      lineTotal: number;
    }>;
  }>;
};

export type AdminOrder = Prisma.OrderGetPayload<{
  include: {
    items: true;
    customer: true;
    payments: true;
    statusHistory: true;
  };
}>;

export interface AdminInventoryItem {
  id: string;
  sku: string;
  name: string;
  type: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  unitCost: number;
  supplier?: string | null;
  categoryName?: string;
  reservedStock?: number;
  location?: string | null;
  isActive?: boolean;
  movements?: Array<{
    id: string;
    change: number;
    previousStock: number;
    newStock: number;
    type?: string;
    reason: string;
    reference?: string | null;
    performedBy?: string;
    createdBy?: string;
    createdAt: Date | string;
  }>;
}

export interface AdminPayment {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  orderTotal: number;
  amount: number;
  paymentMethod: string;
  reference: string | null;
  notes: string | null;
  recordedBy: string;
  status: string;
  createdAt: Date | string;
}

export interface AdminStaffMember {
  id: string;
  phone: string;
  name: string | null;
  isOwner: boolean;
  createdAt: string;
  activeSessions: number;
  permissions: string[];
}

export interface AdminDashboardData {
  canViewCrm: boolean;
  metrics: {
    todaySales: number;
    todayOrdersCount: number;
    pendingOrdersCount: number;
    completedOrdersCount: number;
    todayProductionQty: number;
    totalFinishedStock: number;
    totalRawStock: number;
    totalPackagingStock: number;
  };
  lowStockAlerts: Array<{
    id: string;
    name: string;
    type: string;
    currentStock: number;
    threshold: number;
    unit: string;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    total: number;
    status: string;
    paymentStatus: string;
    source: string;
    createdAt: string;
    itemsCount: number;
  }>;
  recentBatches: Array<{
    id: string;
    batchNumber: string;
    productName: string;
    plannedQuantity: number;
    acceptedQuantity: number;
    status: string;
    productionDate: string;
  }>;
  salesTrend: Array<{ label: string; amount: number }>;
}

export interface AdminReportData {
  summary: {
    totalOrderValue: number;
    completedOrdersValue: number;
    actualCashCollected: number;
    refundsTotal: number;
    outstandingReceivables: number;
    totalOrdersCount: number;
    completedCount: number;
    cancelledCount: number;
    pendingCount: number;
    websiteSales: number;
    manualSales: number;
  };
  productSales: Array<{ name: string; quantity: number; revenue: number }>;
  paymentMethodBreakdown: Array<{ method: string; amount: number }>;
}

export interface AdminSettings {
  factoryName: string;
  contactPhone1: string;
  contactPhone2: string;
  contactEmail: string;
  factoryAddress: string;
  telegramNotificationsEnabled: string;
  currency: string;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  staffName: string;
  staffPhone: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export type AdminRecipe = Prisma.RecipeGetPayload<{
  include: {
    product: { select: { id: true; name: true } };
    items: {
      include: {
        inventoryItem: {
          select: { id: true; name: true; unit: true; currentStock: true };
        };
      };
    };
  };
}>;

export type AdminProductionBatch = Prisma.ProductionBatchGetPayload<{
  include: {
    product: { select: { id: true; name: true; sku: true; stock: true } };
    recipe: { select: { id: true; name: true } };
    materialUsages: {
      include: {
        inventoryItem: {
          select: { id: true; name: true; unit: true; currentStock: true };
        };
      };
    };
  };
}>;

export interface AdminBatchMaterial {
  inventoryItemId: string;
  name: string;
  unit: string;
  quantity: number;
}

export interface AdminProductForm {
  id?: string;
  name: string;
  sku: string;
  slug: string;
  categoryId: string;
  price: string | number;
  size: string;
  flavor: string;
  variantType: string;
  badge: string;
  minimumOrderQuantity: number | string;
  stock?: number | string;
  isPublished: boolean;
  isActive: boolean;
  description: string;
  packagingOptions: Array<{
    id?: string;
    label: string;
    unitsPerPackage: number;
    isEnabled: boolean;
  }>;
}
