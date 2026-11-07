import { NextRequest, NextResponse } from "next/server";
import { CustomerCreditType, Prisma } from "@/generated/prisma/client";
import { getCurrentAdmin, hasPermission, logAdminAudit } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class CreditRequestError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "customers_view")) {
      return NextResponse.json({ error: "Unauthorized access to the credit book." }, { status: 403 });
    }

    const [customers, balances, transactions] = await Promise.all([
      prisma.customer.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, phone: true, company: true },
      }),
      prisma.customerCreditTransaction.groupBy({
        by: ["customerId", "type"],
        _sum: { amount: true },
      }),
      prisma.customerCreditTransaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          customer: { select: { id: true, name: true, phone: true, company: true } },
          items: { orderBy: { productName: "asc" } },
        },
      }),
    ]);

    const balanceByCustomer = new Map<string, number>();
    for (const balance of balances) {
      const current = balanceByCustomer.get(balance.customerId) || 0;
      const amount = Number(balance._sum.amount || 0);
      balanceByCustomer.set(
        balance.customerId,
        current + (balance.type === "CREDIT" ? amount : -amount),
      );
    }

    return NextResponse.json({
      canManage: hasPermission(admin, "customers_manage"),
      canRecordCreditSales:
        hasPermission(admin, "customers_manage") &&
        (hasPermission(admin, "products_manage") || hasPermission(admin, "inventory_adjust")),
      customers: customers.map((customer) => ({
        ...customer,
        balance: Math.max(0, balanceByCustomer.get(customer.id) || 0),
      })),
      products: await prisma.product.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, sku: true, price: true, stock: true, reservedStock: true },
      }).then((products) => products.map((product) => ({
        ...product,
        price: Number(product.price),
        availableStock: Math.max(0, product.stock - product.reservedStock),
      }))),
      transactions,
    });
  } catch (error) {
    console.error("Admin credit book GET error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return NextResponse.json(
        { error: "Credit Book is unavailable until the pending database migration is applied." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Failed to load the credit book." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "customers_manage")) {
      return NextResponse.json({ error: "Unauthorized to record customer credit." }, { status: 403 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new CreditRequestError("Invalid credit transaction request.");
    }
    const { type, customerId, notes } = body;
    if (typeof customerId !== "string" || !customerId || (type !== "CREDIT" && type !== "REPAYMENT")) {
      throw new CreditRequestError("A customer and valid transaction type are required.");
    }
    if (
      type === "CREDIT" &&
      !hasPermission(admin, "products_manage") &&
      !hasPermission(admin, "inventory_adjust")
    ) {
      return NextResponse.json({ error: "Unauthorized to record a credit sale." }, { status: 403 });
    }
    if (notes !== undefined && typeof notes !== "string") {
      throw new CreditRequestError("Notes must be text.");
    }
    if (typeof notes === "string" && notes.length > 1000) {
      throw new CreditRequestError("Notes must be 1000 characters or fewer.");
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new CreditRequestError("Customer not found.", 404);

      if (type === "REPAYMENT") {
        const amountCents = Math.round(Number(body.amount) * 100);
        if (!Number.isFinite(amountCents) || amountCents <= 0 || Math.abs(Number(body.amount) * 100 - amountCents) > 0.0001) {
          throw new CreditRequestError("Enter a repayment amount greater than zero with no more than two decimal places.");
        }

        const totals = await tx.customerCreditTransaction.groupBy({
          by: ["type"],
          where: { customerId },
          _sum: { amount: true },
        });
        const owedCents = totals.reduce((sum, entry) => {
          const value = Math.round(Number(entry._sum.amount || 0) * 100);
          return sum + (entry.type === "CREDIT" ? value : -value);
        }, 0);
        if (amountCents > owedCents) {
          throw new CreditRequestError(`Repayment cannot exceed the outstanding balance of ETB ${(Math.max(0, owedCents) / 100).toFixed(2)}.`);
        }

        return tx.customerCreditTransaction.create({
          data: {
            customerId,
            type: CustomerCreditType.REPAYMENT,
            amount: amountCents / 100,
            notes: notes?.trim() || null,
            recordedBy: admin.name || admin.phone,
          },
        });
      }

      if (!Array.isArray(body.items) || body.items.length === 0) {
        throw new CreditRequestError("Add at least one product to record a credit sale.");
      }

      const quantities = new Map<string, number>();
      for (const item of body.items) {
        if (!item || typeof item.productId !== "string") {
          throw new CreditRequestError("Every credit sale item must have a valid product.");
        }
        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new CreditRequestError("Product quantities must be positive whole numbers.");
        }
        quantities.set(item.productId, (quantities.get(item.productId) || 0) + quantity);
      }

      const creditItems: Array<{
        productId: string;
        productName: string;
        productSku: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
      }> = [];
      let totalCents = 0;

      for (const [productId, quantity] of quantities) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product || !product.isActive) throw new CreditRequestError("A selected product is no longer available.", 404);
        const available = product.stock - product.reservedStock;
        if (quantity > available) {
          throw new CreditRequestError(`Only ${Math.max(0, available)} units of ${product.name} are available.`);
        }

        const unitPriceCents = Math.round(Number(product.price) * 100);
        const lineTotalCents = unitPriceCents * quantity;
        totalCents += lineTotalCents;
        await tx.product.update({
          where: { id: productId },
          data: { stock: { decrement: quantity } },
        });
        await tx.productStockMovement.create({
          data: {
            productId,
            change: -quantity,
            previousStock: product.stock,
            newStock: product.stock - quantity,
            reason: `Credit sale to ${customer.name}`,
            createdBy: admin.name || admin.phone,
          },
        });
        creditItems.push({
          productId,
          productName: product.name,
          productSku: product.sku,
          quantity,
          unitPrice: unitPriceCents / 100,
          lineTotal: lineTotalCents / 100,
        });
      }

      return tx.customerCreditTransaction.create({
        data: {
          customerId,
          type: CustomerCreditType.CREDIT,
          amount: totalCents / 100,
          notes: notes?.trim() || null,
          recordedBy: admin.name || admin.phone,
          items: { create: creditItems },
        },
        include: { items: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await logAdminAudit(
      admin.id,
      `${type === "CREDIT" ? "CUSTOMER_CREDIT_RECORDED" : "CUSTOMER_CREDIT_REPAYMENT"}: ${transaction.id} (${transaction.amount})`,
    );
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Admin credit book POST error:", error);
    const message = error instanceof CreditRequestError
      ? error.message
      : error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021"
        ? "Credit Book is unavailable until the pending database migration is applied."
      : "Failed to record the credit transaction.";
    const status = error instanceof CreditRequestError
      ? error.status
      : error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034"
        ? 409
        : error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021"
          ? 503
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
