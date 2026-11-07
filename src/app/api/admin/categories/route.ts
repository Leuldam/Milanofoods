import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission, logAdminAudit } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Admin categories GET error:", error);
    return NextResponse.json({ error: "Failed to load categories." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "categories_manage")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, slug, description, imageUrl, isActive } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and Slug are required." }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug: slug.trim().toLowerCase(),
        description: description || null,
        imageUrl: imageUrl || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    await logAdminAudit(admin.id, `CATEGORY_CREATE: ${category.name}`);

    return NextResponse.json(category);
  } catch (error: any) {
    console.error("Admin categories POST error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Category name or slug already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create category." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "categories_manage")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id, name, slug, description, imageUrl, isActive } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Category ID is required." }, { status: 400 });
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug: slug ? slug.trim().toLowerCase() : undefined,
        description: description !== undefined ? description : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    await logAdminAudit(admin.id, `CATEGORY_UPDATE: ${category.name}`);

    return NextResponse.json(category);
  } catch (error: any) {
    console.error("Admin categories PUT error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Category name or slug already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update category." }, { status: 500 });
  }
}
