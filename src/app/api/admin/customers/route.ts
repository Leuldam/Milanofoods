import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission, logAdminAudit } from "@/lib/admin-auth";
import { Prisma } from "@/generated/prisma/client";
import { isUniqueConstraintError } from "@/lib/admin-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "customers_view")) {
      return NextResponse.json({ error: "Unauthorized access to customers." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const where: Prisma.CustomerWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { company: { contains: search, mode: "insensitive" } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        orders: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            paidAmount: true,
            status: true,
            paymentStatus: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                productName: true,
                quantity: true,
                lineTotal: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        creditTransactions: {
          orderBy: { createdAt: "desc" },
          take: 100,
          include: {
            items: {
              orderBy: { productName: "asc" },
            },
          },
        },
      },
    });

    const formatted = customers.map((c) => {
      const totalPurchases = c.orders
        .filter((o) => o.status !== "CANCELLED")
        .reduce((sum, o) => sum + Number(o.total), 0);

      const unpaidBalance = c.orders
        .filter((o) => o.status !== "CANCELLED")
        .reduce((sum, o) => sum + (o.paymentStatus === "PAID" ? 0 : Math.max(0, Number(o.total) - Number(o.paidAmount))), 0);

      const creditBalance = Math.max(0, c.creditTransactions.reduce(
        (sum, transaction) => sum + (transaction.type === "CREDIT" ? Number(transaction.amount) : -Number(transaction.amount)),
        0,
      ));

      return {
        id: c.id,
        phone: c.phone,
        name: c.name,
        email: c.email,
        company: c.company,
        address: c.address,
        city: c.city,
        customerType: c.customerType,
        notes: c.notes,
        createdAt: c.createdAt,
        totalOrders: c.orders.length,
        totalPurchases,
        unpaidBalance,
        creditBalance,
        orders: c.orders,
        creditTransactions: c.creditTransactions,
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Admin customers GET error:", error);
    return NextResponse.json({ error: "Failed to load customers." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "customers_manage")) {
      return NextResponse.json({ error: "Unauthorized to manage customers." }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, phone, email, company, address, city, customerType, notes } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Customer name and phone number are required." }, { status: 400 });
    }

    const cleanPhone = phone.trim();

    if (id) {
      const updated = await prisma.customer.update({
        where: { id },
        data: {
          name: name.trim(),
          phone: cleanPhone,
          email: email || null,
          company: company || null,
          address: address || null,
          city: city || null,
          customerType: customerType || "RETAIL",
          notes: notes || null,
        },
      });

      await logAdminAudit(admin.id, `CUSTOMER_UPDATE: ${updated.name} (${updated.phone})`);
      return NextResponse.json(updated);
    } else {
      const created = await prisma.customer.create({
        data: {
          name: name.trim(),
          phone: cleanPhone,
          email: email || null,
          company: company || null,
          address: address || null,
          city: city || null,
          customerType: customerType || "RETAIL",
          notes: notes || null,
        },
      });

      await logAdminAudit(admin.id, `CUSTOMER_CREATE: ${created.name} (${created.phone})`);
      return NextResponse.json(created);
    }
  } catch (error) {
    console.error("Admin customer POST error:", error);
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: "A customer with this phone number already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save customer." }, { status: 500 });
  }
}
