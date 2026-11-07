import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission, logAdminAudit } from "@/lib/admin-auth";
import { PaymentStatus } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { getAdminErrorMessage } from "@/lib/admin-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "payments_view")) {
      return NextResponse.json({ error: "Unauthorized access to payments." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const method = searchParams.get("method");

    const where: Prisma.PaymentWhereInput = {};
    if (method && method !== "ALL") {
      where.paymentMethod = method;
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerPhone: true,
            total: true,
            paidAmount: true,
            paymentStatus: true,
          },
        },
      },
    });

    return NextResponse.json(
      payments.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        orderNumber: p.order.orderNumber,
        customerName: p.order.customerName,
        customerPhone: p.order.customerPhone,
        orderTotal: Number(p.order.total),
        amount: Number(p.amount),
        paymentMethod: p.paymentMethod,
        reference: p.reference,
        notes: p.notes,
        recordedBy: p.recordedBy,
        status: p.status,
        createdAt: p.createdAt,
      }))
    );
  } catch (error) {
    console.error("Admin payments GET error:", error);
    return NextResponse.json({ error: "Failed to load payments." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "payments_record")) {
      return NextResponse.json({ error: "Unauthorized to record payments." }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, amount, paymentMethod, reference, notes, isRefund } = body;

    if (!orderId || amount === undefined) {
      return NextResponse.json({ error: "Order ID and amount are required." }, { status: 400 });
    }

    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json({ error: "Payment amount must be greater than zero." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { payments: true },
      });

      if (!order) throw new Error("Order not found.");

      const orderTotal = Number(order.total);
      const currentPaid = Number(order.paidAmount || 0);

      const signedAmount = isRefund ? -paymentAmount : paymentAmount;
      const newPaidAmount = Math.max(0, currentPaid + signedAmount);

      let newPaymentStatus: PaymentStatus = "UNPAID";
      if (isRefund && newPaidAmount <= 0) {
        newPaymentStatus = "REFUNDED";
      } else if (newPaidAmount >= orderTotal) {
        newPaymentStatus = "PAID";
      } else if (newPaidAmount > 0) {
        newPaymentStatus = "PARTIALLY_PAID";
      }

      // Record payment transaction
      const payment = await tx.payment.create({
        data: {
          orderId,
          amount: signedAmount,
          paymentMethod: paymentMethod || "CASH",
          reference: reference || null,
          notes: notes || null,
          recordedBy: admin.name || admin.phone,
          status: isRefund ? "REFUNDED" : "CONFIRMED",
        },
      });

      // Update Order
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus: newPaymentStatus,
        },
      });

      return { payment, updatedOrder };
    });

    await logAdminAudit(
      admin.id,
      `PAYMENT_RECORD: Order ${result.updatedOrder.orderNumber} ${isRefund ? "REFUND" : "PAYMENT"} of ETB ${paymentAmount} via ${paymentMethod}`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin payment POST error:", error);
    return NextResponse.json({ error: getAdminErrorMessage(error, "Failed to record payment.") }, { status: 400 });
  }
}
