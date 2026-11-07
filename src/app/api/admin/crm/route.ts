import { CustomerCrmStage } from "@/generated/prisma/client";
import { getCurrentAdmin, hasPermission, logAdminAudit } from "@/lib/admin-auth";
import { isUniqueConstraintError } from "@/lib/admin-error";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRM_STAGES = Object.values(CustomerCrmStage);
const ACTIVITY_TYPES = ["CALL", "EMAIL", "MEETING", "NOTE", "FOLLOW_UP"] as const;

function schemaMigrationPending(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error &&
    typeof error.code === "string" && ["P2021", "P2022"].includes(error.code);
}

function optionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "customers_view")) {
      return NextResponse.json({ error: "Unauthorized access to CRM." }, { status: 403 });
    }

    const search = request.nextUrl.searchParams.get("search")?.trim();
    const customers = await prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
              { company: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      take: 500,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        company: true,
        customerType: true,
        crmStage: true,
        crmLeadSource: true,
        assignedTo: true,
        nextFollowUpAt: true,
        createdAt: true,
        _count: { select: { orders: true } },
        crmActivities: { orderBy: { createdAt: "desc" }, take: 8 },
      },
    });

    return NextResponse.json({
      canManage: hasPermission(admin, "customers_manage"),
      customers,
    });
  } catch (error) {
    console.error("Admin CRM GET error:", error);
    if (schemaMigrationPending(error)) {
      return NextResponse.json(
        { error: "CRM needs its database migration. Run `npx prisma migrate deploy` before using the pipeline." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Failed to load CRM pipeline." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "customers_manage")) {
      return NextResponse.json({ error: "Unauthorized to manage CRM contacts." }, { status: 403 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid CRM request." }, { status: 400 });
    }

    if (body.action === "create_lead") {
      const name = optionalText(body.name, 120);
      const phone = optionalText(body.phone, 40);
      if (!name || !phone) {
        return NextResponse.json({ error: "Contact name and phone number are required." }, { status: 400 });
      }
      const nextFollowUpAt = body.nextFollowUpAt ? parseDate(body.nextFollowUpAt) : null;
      if (body.nextFollowUpAt && !nextFollowUpAt) {
        return NextResponse.json({ error: "Enter a valid follow-up date." }, { status: 400 });
      }

      const customer = await prisma.customer.create({
        data: {
          name,
          phone,
          email: optionalText(body.email, 254),
          company: optionalText(body.company, 160),
          customerType: optionalText(body.customerType, 40) || "RETAIL",
          notes: optionalText(body.notes, 2000),
          crmStage: CustomerCrmStage.LEAD,
          crmLeadSource: optionalText(body.crmLeadSource, 100),
          assignedTo: optionalText(body.assignedTo, 120),
          nextFollowUpAt,
        },
      });

      await logAdminAudit(admin.id, `CRM_LEAD_CREATE: ${customer.name} (${customer.phone})`);
      return NextResponse.json(customer, { status: 201 });
    }

    if (body.action === "add_activity") {
      const customerId = optionalText(body.customerId, 100);
      const type = body.type;
      const summary = optionalText(body.summary, 2000);
      const followUpAt = body.followUpAt ? parseDate(body.followUpAt) : null;
      if (!customerId || !summary || typeof type !== "string" || !ACTIVITY_TYPES.includes(type as typeof ACTIVITY_TYPES[number])) {
        return NextResponse.json({ error: "Choose an activity type and enter a summary." }, { status: 400 });
      }
      if (body.followUpAt && !followUpAt) {
        return NextResponse.json({ error: "Enter a valid follow-up date." }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true } });
        if (!customer) return null;
        const activity = await tx.customerCrmActivity.create({
          data: {
            customerId,
            type,
            summary,
            followUpAt,
            createdBy: admin.name || admin.phone,
          },
        });
        if (followUpAt) {
          await tx.customer.update({ where: { id: customerId }, data: { nextFollowUpAt: followUpAt } });
        }
        return { activity, customer };
      });
      if (!result) return NextResponse.json({ error: "CRM contact not found." }, { status: 404 });

      await logAdminAudit(admin.id, `CRM_ACTIVITY: ${result.customer.name} (${type})`);
      return NextResponse.json(result.activity, { status: 201 });
    }

    return NextResponse.json({ error: "Unsupported CRM action." }, { status: 400 });
  } catch (error) {
    console.error("Admin CRM POST error:", error);
    if (schemaMigrationPending(error)) {
      return NextResponse.json(
        { error: "CRM needs its database migration. Run `npx prisma migrate deploy` before using the pipeline." },
        { status: 503 },
      );
    }
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: "A customer with this phone number already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to save CRM update." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "customers_manage")) {
      return NextResponse.json({ error: "Unauthorized to update CRM contacts." }, { status: 403 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.customerId !== "string") {
      return NextResponse.json({ error: "Choose a CRM contact to update." }, { status: 400 });
    }

    if (body.action === "update_contact") {
      const name = optionalText(body.name, 120);
      const phone = optionalText(body.phone, 40);
      const nextFollowUpAt = body.nextFollowUpAt ? parseDate(body.nextFollowUpAt) : null;
      if (!name || !phone) {
        return NextResponse.json({ error: "Contact name and phone number are required." }, { status: 400 });
      }
      if (body.nextFollowUpAt && !nextFollowUpAt) {
        return NextResponse.json({ error: "Enter a valid follow-up date." }, { status: 400 });
      }

      const customer = await prisma.customer.update({
        where: { id: body.customerId },
        data: {
          name,
          phone,
          email: optionalText(body.email, 254),
          company: optionalText(body.company, 160),
          crmLeadSource: optionalText(body.crmLeadSource, 100),
          assignedTo: optionalText(body.assignedTo, 120),
          nextFollowUpAt,
        },
        select: { id: true, name: true, phone: true },
      });
      await logAdminAudit(admin.id, `CRM_CONTACT_UPDATE: ${customer.name} (${customer.phone})`);
      return NextResponse.json(customer);
    }

    if (typeof body.crmStage !== "string" || !CRM_STAGES.includes(body.crmStage as CustomerCrmStage)) {
      return NextResponse.json({ error: "Choose a valid CRM stage." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.customer.findUnique({
        where: { id: body.customerId },
        select: { id: true, name: true, crmStage: true },
      });
      if (!current) return null;

      const crmStage = body.crmStage as CustomerCrmStage;
      const customer = await tx.customer.update({
        where: { id: current.id },
        data: { crmStage },
        select: { id: true, name: true, crmStage: true },
      });
      if (current.crmStage !== crmStage) {
        await tx.customerCrmActivity.create({
          data: {
            customerId: customer.id,
            type: "STAGE_CHANGE",
            summary: `Stage changed from ${current.crmStage} to ${crmStage}.`,
            createdBy: admin.name || admin.phone,
          },
        });
      }
      return customer;
    });
    if (!result) return NextResponse.json({ error: "CRM contact not found." }, { status: 404 });
    const customer = result;
    await logAdminAudit(admin.id, `CRM_STAGE_UPDATE: ${customer.name} (${customer.crmStage})`);
    return NextResponse.json(customer);
  } catch (error) {
    console.error("Admin CRM PATCH error:", error);
    if (schemaMigrationPending(error)) {
      return NextResponse.json(
        { error: "CRM needs its database migration. Run `npx prisma migrate deploy` before using the pipeline." },
        { status: 503 },
      );
    }
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "CRM contact not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update CRM stage." }, { status: 500 });
  }
}