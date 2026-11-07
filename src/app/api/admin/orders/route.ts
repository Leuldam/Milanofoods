import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission, logAdminAudit } from "@/lib/admin-auth";
import { createOrderNumber } from "@/lib/order-number";
import { OrderStatus, PaymentStatus } from "@/generated/prisma/client";
import { notifyOrderStatusChanged } from "@/lib/telegram-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "orders_view")) {
      return NextResponse.json({ error: "Unauthorized access to orders." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const search = searchParams.get("search");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status as OrderStatus;
    }
    if (source && source !== "ALL") {
      where.source = source;
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search } },
        { company: { contains: search, mode: "insensitive" } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        items: true,
        customer: true,
        payments: true,
        statusHistory: { orderBy: { createdAt: "desc" } },
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Admin orders GET error:", error);
    return NextResponse.json({ error: "Failed to load orders." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "orders_create")) {
      return NextResponse.json({ error: "Unauthorized to create orders." }, { status: 403 });
    }

    const body = await req.json();
    const {
      customerName,
      customerPhone,
      customerEmail,
      company,
      customerType,
      fulfillment, // DELIVERY or PICKUP
      deliveryAddress,
      city,
      pickupLocation,
      paymentPreference,
      notes,
      source, // MANUAL_PHONE, MANUAL_WHATSAPP, MANUAL_WALKIN
      items, // array of { productId, packagingLabel, unitsPerPackage, packageQuantity, quantity, unitPrice }
      deliveryFee,
    } = body;

    if (!customerName || !customerPhone || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Customer name, phone number, and at least one item are required." },
        { status: 400 }
      );
    }

    const cleanPhone = customerPhone.trim();
    const cleanSource = source || "MANUAL_PHONE";
    const fee = deliveryFee ? Number(deliveryFee) : 0;

    const order = await prisma.$transaction(async (tx) => {
      // 1. Upsert Customer profile
      const customer = await tx.customer.upsert({
        where: { phone: cleanPhone },
        update: {
          name: customerName.trim(),
          email: customerEmail || undefined,
          company: company || undefined,
          address: deliveryAddress || undefined,
          city: city || undefined,
          customerType: customerType || undefined,
        },
        create: {
          phone: cleanPhone,
          name: customerName.trim(),
          email: customerEmail || null,
          company: company || null,
          address: deliveryAddress || null,
          city: city || null,
          customerType: customerType || "RETAIL",
        },
      });

      // 2. Validate items and calculate totals
      let calculatedSubtotal = 0;
      const orderItemsData: any[] = [];

      for (const item of items) {
        let product = null;
        if (item.productId) {
          product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) throw new Error(`Product not found.`);
        }

        const unitPrice = product ? Number(product.price) : Number(item.unitPrice || 0);
        const qty = Number(item.quantity);
        const lineTotal = unitPrice * qty;
        calculatedSubtotal += lineTotal;

        orderItemsData.push({
          productId: product?.id || null,
          productName: product?.name || item.productName || "Product",
          productSize: product?.size || item.productSize || null,
          productFlavor: product?.flavor || item.productFlavor || null,
          productSku: product?.sku || item.productSku || null,
          packagingLabel: item.packagingLabel || "Single unit",
          unitsPerPackage: item.unitsPerPackage ? Number(item.unitsPerPackage) : 1,
          packageQuantity: item.packageQuantity ? Number(item.packageQuantity) : qty,
          unitPrice,
          quantity: qty,
          lineTotal,
        });
      }

      const calculatedTotal = calculatedSubtotal + fee;
      const orderNumber = createOrderNumber();

      // 3. Create Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerName: customerName.trim(),
          customerPhone: cleanPhone,
          customerEmail: customerEmail || null,
          company: company || null,
          fulfillment: fulfillment === "PICKUP" ? "PICKUP" : "DELIVERY",
          city: city || "Addis Ababa",
          deliveryAddress: deliveryAddress || null,
          pickupLocation: pickupLocation || null,
          paymentPreference: paymentPreference || "Cash on Delivery",
          notes: notes || null,
          source: cleanSource,
          status: "CONFIRMED", // Manual orders created by staff start as CONFIRMED
          paymentStatus: "UNPAID",
          subtotal: calculatedSubtotal,
          deliveryFee: fee,
          total: calculatedTotal,
          customerId: customer.id,
          assignedStaff: admin.name || admin.phone,
          items: {
            create: orderItemsData,
          },
        },
        include: { items: true },
      });

      // 4. Reserve stock for confirmed items
      for (const it of orderItemsData) {
        if (it.productId) {
          await tx.product.update({
            where: { id: it.productId },
            data: { reservedStock: { increment: it.quantity } },
          });
        }
      }

      // 5. Create Status History
      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          status: "CONFIRMED",
          changedBy: admin.name || admin.phone,
          notes: `Order created manually via ${cleanSource}`,
        },
      });

      return newOrder;
    });

    await logAdminAudit(admin.id, `ORDER_CREATE_MANUAL: ${order.orderNumber} (ETB ${order.total})`);

    return NextResponse.json(order);
  } catch (error: any) {
    console.error("Admin order POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create order." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "orders_update")) {
      return NextResponse.json({ error: "Unauthorized to update orders." }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, newStatus, notes, assignedStaff, paymentStatus } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) throw new Error("Order not found.");

      const prevStatus = order.status;
      const targetStatus = newStatus as OrderStatus | undefined;

      // Check stock transitions if status is changing
      if (targetStatus && targetStatus !== prevStatus) {
        // Transition A: PENDING -> CONFIRMED (reserve stock)
        if (prevStatus === "PENDING" && targetStatus === "CONFIRMED") {
          for (const item of order.items) {
            if (item.productId) {
              await tx.product.update({
                where: { id: item.productId },
                data: { reservedStock: { increment: item.quantity } },
              });
            }
          }
        }

        // Transition B: Any active status -> CANCELLED (release reserved stock)
        if (targetStatus === "CANCELLED" && prevStatus !== "CANCELLED" && !order.stockDeductedAt) {
          for (const item of order.items) {
            if (item.productId) {
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  reservedStock: { decrement: item.quantity },
                },
              });
            }
          }
        }

        // Transition C: Move to COMPLETED (deduct physical stock if not already deducted)
        if (targetStatus === "COMPLETED" && !order.stockDeductedAt) {
          for (const item of order.items) {
            if (item.productId) {
              const product = await tx.product.findUnique({ where: { id: item.productId } });
              if (product) {
                const prevPhysical = product.stock;
                const newPhysical = Math.max(0, prevPhysical - item.quantity);
                const newReserved = Math.max(0, product.reservedStock - item.quantity);

                await tx.product.update({
                  where: { id: item.productId },
                  data: {
                    stock: newPhysical,
                    reservedStock: newReserved,
                  },
                });

                await tx.productStockMovement.create({
                  data: {
                    productId: item.productId,
                    change: -item.quantity,
                    previousStock: prevPhysical,
                    newStock: newPhysical,
                    reason: `Fulfillment for Order ${order.orderNumber}`,
                    orderNumber: order.orderNumber,
                    createdBy: admin.name || admin.phone,
                  },
                });
              }
            }
          }

          await tx.order.update({
            where: { id: orderId },
            data: { stockDeductedAt: new Date() },
          });
        }

        // Record Status History
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: targetStatus,
            changedBy: admin.name || admin.phone,
            notes: notes || null,
          },
        });
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: targetStatus || undefined,
          paymentStatus: paymentStatus ? (paymentStatus as PaymentStatus) : undefined,
          notes: notes !== undefined ? notes : undefined,
          assignedStaff: assignedStaff !== undefined ? assignedStaff : undefined,
        },
        include: { items: true, customer: true, statusHistory: true, payments: true },
      });

      return updatedOrder;
    });

    await logAdminAudit(admin.id, `ORDER_UPDATE: ${updated.orderNumber} status=${updated.status}`);

    if (newStatus && newStatus !== updated.status) {
      notifyOrderStatusChanged({
        orderNumber: updated.orderNumber,
        previousStatus: updated.status,
        newStatus,
        customerName: updated.customerName,
        total: Number(updated.total),
        changedBy: admin.name || admin.phone,
      }).catch(() => {});
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Admin order PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to update order." }, { status: 400 });
  }
}
