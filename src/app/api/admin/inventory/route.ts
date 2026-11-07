import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission, logAdminAudit } from "@/lib/admin-auth";
import { Prisma } from "@/generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "inventory_view")) {
      return NextResponse.json({ error: "Unauthorized access to inventory." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // RAW_MATERIAL, PACKAGING, FINISHED_GOOD, ALL

    if (type === "FINISHED_GOOD") {
      const products = await prisma.product.findMany({
        orderBy: { name: "asc" },
        include: {
          category: { select: { name: true } },
          stockMovements: {
            take: 5,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      return NextResponse.json({
        type: "FINISHED_GOOD",
        items: products.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          categoryName: p.category.name,
          type: "FINISHED_GOOD",
          unit: "units",
          currentStock: p.stock,
          reservedStock: p.reservedStock,
          availableStock: Math.max(0, p.stock - p.reservedStock),
          reorderLevel: p.minimumOrderQuantity * 2,
          unitCost: Number(p.price),
          movements: p.stockMovements,
          isActive: p.isActive,
        })),
      });
    }

    const where: Prisma.InventoryItemWhereInput = {};
    if (type && type !== "ALL") {
      where.type = type as any;
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        movements: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({
      type: type || "MATERIALS",
      items: items.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        type: item.type,
        unit: item.unit,
        currentStock: Number(item.currentStock),
        reorderLevel: Number(item.reorderLevel),
        unitCost: item.unitCost ? Number(item.unitCost) : null,
        supplier: item.supplier,
        location: item.location,
        isActive: item.isActive,
        movements: item.movements.map((m) => ({
          id: m.id,
          change: Number(m.change),
          previousStock: Number(m.previousStock),
          newStock: Number(m.newStock),
          type: m.type,
          reason: m.reason,
          reference: m.reference,
          performedBy: m.performedBy,
          createdAt: m.createdAt,
        })),
      })),
    });
  } catch (error) {
    console.error("Admin inventory GET error:", error);
    return NextResponse.json({ error: "Failed to load inventory." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "inventory_receive")) {
      return NextResponse.json({ error: "Unauthorized to add inventory items." }, { status: 403 });
    }

    const data = await req.json();
    const { sku, name, type, unit, initialStock, reorderLevel, unitCost, supplier, location } = data;

    if (!sku || !name || !type) {
      return NextResponse.json({ error: "SKU, Name, and Material Type are required." }, { status: 400 });
    }

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryItem.create({
        data: {
          sku: sku.trim().toUpperCase(),
          name: name.trim(),
          type,
          unit: unit || "kg",
          currentStock: initialStock ? Number(initialStock) : 0,
          reorderLevel: reorderLevel ? Number(reorderLevel) : 0,
          unitCost: unitCost ? Number(unitCost) : null,
          supplier: supplier || null,
          location: location || "Main Warehouse",
        },
      });

      if (initialStock && Number(initialStock) > 0) {
        await tx.inventoryStockMovement.create({
          data: {
            inventoryItemId: created.id,
            change: Number(initialStock),
            previousStock: 0,
            newStock: Number(initialStock),
            type: "RECEIVE",
            reason: "Initial material stock entry",
            performedBy: admin.name || admin.phone,
          },
        });
      }

      return created;
    });

    await logAdminAudit(admin.id, `INVENTORY_ITEM_CREATE: ${item.name} (${item.sku})`);

    return NextResponse.json(item);
  } catch (error: any) {
    console.error("Admin inventory POST error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Material SKU already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create inventory item." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "inventory_adjust")) {
      return NextResponse.json({ error: "Unauthorized to adjust inventory." }, { status: 403 });
    }

    const data = await req.json();
    const {
      isFinishedProduct,
      itemId,
      change,
      reason,
      movementType, // RECEIVE, ADJUSTMENT, DAMAGE_WASTAGE, RETURN
      reference,
    } = data;

    if (!itemId || change === undefined || !reason || !reason.trim()) {
      return NextResponse.json(
        { error: "Item ID, change quantity, and mandatory reason are required." },
        { status: 400 }
      );
    }

    const numChange = Number(change);
    if (isNaN(numChange) || numChange === 0) {
      return NextResponse.json({ error: "Change amount must be a non-zero number." }, { status: 400 });
    }

    if (isFinishedProduct) {
      // Adjust Product finished stock
      const result = await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({ where: { id: itemId } });
        if (!product) throw new Error("Product not found.");

        const previousStock = product.stock;
        const newStock = previousStock + Math.round(numChange);

        if (newStock < 0) {
          throw new Error(`Insufficient stock. Current stock is ${previousStock}, cannot deduct ${Math.abs(numChange)}.`);
        }

        const updated = await tx.product.update({
          where: { id: itemId },
          data: { stock: newStock },
        });

        await tx.productStockMovement.create({
          data: {
            productId: itemId,
            change: Math.round(numChange),
            previousStock,
            newStock,
            reason: reason.trim(),
            orderNumber: reference || null,
            createdBy: admin.name || admin.phone,
          },
        });

        return updated;
      });

      await logAdminAudit(admin.id, `PRODUCT_STOCK_ADJUST: ${result.name} by ${numChange} (${reason})`);
      return NextResponse.json({ success: true, item: result });
    } else {
      // Adjust Raw or Packaging material
      const result = await prisma.$transaction(async (tx) => {
        const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
        if (!item) throw new Error("Inventory item not found.");

        const previousStock = Number(item.currentStock);
        const newStock = previousStock + numChange;

        if (newStock < 0) {
          throw new Error(`Insufficient stock. Available: ${previousStock} ${item.unit}, cannot deduct ${Math.abs(numChange)}.`);
        }

        const updated = await tx.inventoryItem.update({
          where: { id: itemId },
          data: { currentStock: newStock },
        });

        await tx.inventoryStockMovement.create({
          data: {
            inventoryItemId: itemId,
            change: numChange,
            previousStock,
            newStock,
            type: movementType || (numChange > 0 ? "RECEIVE" : "ADJUSTMENT"),
            reason: reason.trim(),
            reference: reference || null,
            performedBy: admin.name || admin.phone,
          },
        });

        return updated;
      });

      await logAdminAudit(admin.id, `MATERIAL_STOCK_ADJUST: ${result.name} by ${numChange} (${reason})`);
      return NextResponse.json({ success: true, item: result });
    }
  } catch (error: any) {
    console.error("Admin inventory PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to adjust stock." }, { status: 400 });
  }
}
