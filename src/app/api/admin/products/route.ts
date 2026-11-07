import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission, logAdminAudit } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "products_view")) {
      return NextResponse.json({ error: "Unauthorized access to products." }, { status: 403 });
    }

    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        packagingOptions: true,
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Admin products GET error:", error);
    return NextResponse.json({ error: "Failed to load products." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "products_manage")) {
      return NextResponse.json({ error: "Unauthorized to manage products." }, { status: 403 });
    }

    const data = await req.json();
    const {
      name,
      sku,
      slug,
      categoryId,
      price,
      description,
      imageUrl,
      size,
      flavor,
      variantType,
      badge,
      minimumOrderQuantity,
      stock,
      isPublished,
      isActive,
      packagingOptions,
    } = data;

    if (!name || !sku || !slug || !categoryId || price === undefined) {
      return NextResponse.json(
        { error: "Name, SKU, Slug, Category, and Price are required." },
        { status: 400 }
      );
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name,
          sku: sku.trim().toUpperCase(),
          slug: slug.trim().toLowerCase(),
          categoryId,
          price,
          description: description || null,
          imageUrl: imageUrl || null,
          size: size || null,
          flavor: flavor || null,
          variantType: variantType || null,
          badge: badge || null,
          minimumOrderQuantity: minimumOrderQuantity ? Number(minimumOrderQuantity) : 1,
          stock: stock ? Number(stock) : 0,
          isPublished: Boolean(isPublished),
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
      });

      if (Array.isArray(packagingOptions) && packagingOptions.length > 0) {
        for (const opt of packagingOptions) {
          if (opt.label && opt.unitsPerPackage) {
            await tx.productPackagingOption.create({
              data: {
                productId: created.id,
                label: opt.label,
                unitsPerPackage: Number(opt.unitsPerPackage),
                isEnabled: opt.isEnabled !== undefined ? Boolean(opt.isEnabled) : true,
              },
            });
          }
        }
      }

      if (stock && Number(stock) > 0) {
        await tx.productStockMovement.create({
          data: {
            productId: created.id,
            change: Number(stock),
            previousStock: 0,
            newStock: Number(stock),
            reason: "Initial stock setup on product creation",
            createdBy: admin.name || admin.phone,
          },
        });
      }

      return created;
    });

    await logAdminAudit(admin.id, `PRODUCT_CREATE: ${product.name} (${product.sku})`);

    return NextResponse.json(product);
  } catch (error: any) {
    console.error("Admin products POST error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "SKU or Slug already exists. Please use unique values." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "products_manage")) {
      return NextResponse.json({ error: "Unauthorized to manage products." }, { status: 403 });
    }

    const data = await req.json();
    const {
      id,
      name,
      sku,
      slug,
      categoryId,
      price,
      description,
      imageUrl,
      size,
      flavor,
      variantType,
      badge,
      minimumOrderQuantity,
      isPublished,
      isActive,
      packagingOptions,
    } = data;

    if (!id) {
      return NextResponse.json({ error: "Product ID is required." }, { status: 400 });
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Record price change if price changed
      if (price !== undefined && Number(price) !== Number(existing.price)) {
        await tx.productPriceChange.create({
          data: {
            productId: id,
            previousPrice: existing.price,
            newPrice: price,
            createdBy: admin.name || admin.phone,
          },
        });
      }

      const prod = await tx.product.update({
        where: { id },
        data: {
          name: name ?? existing.name,
          sku: sku ? sku.trim().toUpperCase() : existing.sku,
          slug: slug ? slug.trim().toLowerCase() : existing.slug,
          categoryId: categoryId ?? existing.categoryId,
          price: price !== undefined ? price : existing.price,
          description: description !== undefined ? description : existing.description,
          imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
          size: size !== undefined ? size : existing.size,
          flavor: flavor !== undefined ? flavor : existing.flavor,
          variantType: variantType !== undefined ? variantType : existing.variantType,
          badge: badge !== undefined ? badge : existing.badge,
          minimumOrderQuantity: minimumOrderQuantity !== undefined ? Number(minimumOrderQuantity) : existing.minimumOrderQuantity,
          isPublished: isPublished !== undefined ? Boolean(isPublished) : existing.isPublished,
          isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        },
      });

      // Update packaging options if provided
      if (Array.isArray(packagingOptions)) {
        await tx.productPackagingOption.deleteMany({ where: { productId: id } });
        for (const opt of packagingOptions) {
          if (opt.label && opt.unitsPerPackage) {
            await tx.productPackagingOption.create({
              data: {
                productId: id,
                label: opt.label,
                unitsPerPackage: Number(opt.unitsPerPackage),
                isEnabled: opt.isEnabled !== undefined ? Boolean(opt.isEnabled) : true,
              },
            });
          }
        }
      }

      return prod;
    });

    await logAdminAudit(admin.id, `PRODUCT_UPDATE: ${updated.name} (${updated.sku})`);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Admin products PUT error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "SKU or Slug already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update product." }, { status: 500 });
  }
}
