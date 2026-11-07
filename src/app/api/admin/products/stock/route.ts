import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentAdmin, hasPermission, logAdminAudit } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class StockReceiptError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "products_manage")) {
      return NextResponse.json({ error: "Unauthorized to receive finished product stock." }, { status: 403 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new StockReceiptError("Invalid stock receipt request.");
    }
    const { productId, quantity, reason } = body;
    const stockToAdd = Number(quantity);
    if (typeof productId !== "string" || !productId || !Number.isInteger(stockToAdd) || stockToAdd <= 0 || typeof reason !== "string" || !reason.trim()) {
      throw new StockReceiptError("Product, positive whole-number quantity, and reason are required.");
    }
    if (reason.length > 500) {
      throw new StockReceiptError("Reason must be 500 characters or fewer.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new StockReceiptError("Product not found.", 404);

      const newStock = product.stock + stockToAdd;
      if (!Number.isSafeInteger(newStock) || newStock > 2147483647) {
        throw new StockReceiptError("The resulting stock amount is too large.");
      }
      const result = await tx.product.update({
        where: { id: productId },
        data: { stock: newStock },
      });
      await tx.productStockMovement.create({
        data: {
          productId,
          change: stockToAdd,
          previousStock: product.stock,
          newStock,
          reason: reason.trim(),
          createdBy: admin.name || admin.phone,
        },
      });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await logAdminAudit(admin.id, `PRODUCT_STOCK_RECEIVE: ${updated.name} +${stockToAdd} (${reason.trim()})`);
    return NextResponse.json({ success: true, product: updated });
  } catch (error) {
    console.error("Admin product stock POST error:", error);
    const message = error instanceof StockReceiptError ? error.message : "Failed to receive product stock.";
    const status = error instanceof StockReceiptError
      ? error.status
      : error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034"
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
