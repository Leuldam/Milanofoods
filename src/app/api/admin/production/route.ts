import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission, logAdminAudit } from "@/lib/admin-auth";
import { notifyProductionBatchCompleted } from "@/lib/telegram-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin, "production_view")) {
      return NextResponse.json({ error: "Unauthorized access to production." }, { status: 403 });
    }

    const [batches, recipes, products, rawMaterials] = await Promise.all([
      prisma.productionBatch.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { id: true, name: true, sku: true, stock: true } },
          recipe: { select: { id: true, name: true } },
          materialUsages: {
            include: {
              inventoryItem: { select: { id: true, name: true, unit: true, currentStock: true } },
            },
          },
        },
      }),
      prisma.recipe.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: {
          product: { select: { id: true, name: true } },
          items: {
            include: {
              inventoryItem: { select: { id: true, name: true, unit: true, currentStock: true } },
            },
          },
        },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, sku: true, stock: true },
        orderBy: { name: "asc" },
      }),
      prisma.inventoryItem.findMany({
        where: { isActive: true },
        select: { id: true, name: true, type: true, unit: true, currentStock: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      batches,
      recipes,
      products,
      materials: rawMaterials,
    });
  } catch (error) {
    console.error("Admin production GET error:", error);
    return NextResponse.json({ error: "Failed to load production data." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    const body = await req.json();
    const { action } = body;

    // --- Action 1: Create Recipe ---
    if (action === "CREATE_RECIPE") {
      if (!admin || !hasPermission(admin, "production_create")) {
        return NextResponse.json({ error: "Unauthorized to create recipes." }, { status: 403 });
      }

      const { name, productId, expectedOutputQty, outputUnit, notes, items } = body;
      if (!name || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: "Recipe name and at least one ingredient are required." }, { status: 400 });
      }

      const recipe = await prisma.recipe.create({
        data: {
          name: name.trim(),
          productId: productId || null,
          expectedOutputQty: expectedOutputQty ? Number(expectedOutputQty) : 1,
          outputUnit: outputUnit || "units",
          notes: notes || null,
          items: {
            create: items.map((it: any) => ({
              inventoryItemId: it.inventoryItemId,
              quantity: Number(it.quantity),
              unit: it.unit || "kg",
              notes: it.notes || null,
            })),
          },
        },
        include: { items: true },
      });

      await logAdminAudit(admin.id, `RECIPE_CREATE: ${recipe.name}`);
      return NextResponse.json(recipe);
    }

    // --- Action 2: Create Production Batch ---
    if (action === "CREATE_BATCH") {
      if (!admin || !hasPermission(admin, "production_create")) {
        return NextResponse.json({ error: "Unauthorized to create production batches." }, { status: 403 });
      }

      const {
        batchNumber,
        productId,
        recipeId,
        plannedQuantity,
        consumptionMethod,
        productionDate,
        expiryDate,
        notes,
        materialUsages,
      } = body;

      if (!productId || !plannedQuantity) {
        return NextResponse.json({ error: "Product and planned output quantity are required." }, { status: 400 });
      }

      const generatedBatchNo = batchNumber?.trim() || `BAT-${Date.now().toString().slice(-6)}`;

      const batch = await prisma.productionBatch.create({
        data: {
          batchNumber: generatedBatchNo,
          productId,
          recipeId: recipeId || null,
          plannedQuantity: Number(plannedQuantity),
          consumptionMethod: consumptionMethod || (recipeId ? "RECIPE" : "MANUAL"),
          productionDate: productionDate ? new Date(productionDate) : new Date(),
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          notes: notes || null,
          responsibleStaff: admin.name || admin.phone,
          status: "IN_PROGRESS",
          materialUsages: {
            create: (materialUsages || []).map((mu: any) => ({
              inventoryItemId: mu.inventoryItemId,
              plannedQuantity: Number(mu.plannedQuantity || mu.quantity || 0),
              actualQuantity: Number(mu.actualQuantity || mu.quantity || 0),
              wastageQuantity: Number(mu.wastageQuantity || 0),
              unit: mu.unit || "kg",
            })),
          },
        },
        include: { materialUsages: true },
      });

      await logAdminAudit(admin.id, `BATCH_CREATE: ${batch.batchNumber}`);
      return NextResponse.json(batch);
    }

    // --- Action 3: Complete Production Batch (ATOMIC EXECUTION) ---
    if (action === "COMPLETE_BATCH") {
      if (!admin || !hasPermission(admin, "production_complete")) {
        return NextResponse.json({ error: "Unauthorized to complete production batches." }, { status: 403 });
      }

      const {
        batchId,
        acceptedQuantity,
        rejectedQuantity,
        actualUsages, // array of { inventoryItemId, actualQuantity, wastageQuantity }
        notes,
      } = body;

      if (!batchId || acceptedQuantity === undefined) {
        return NextResponse.json({ error: "Batch ID and accepted output quantity are required." }, { status: 400 });
      }

      const accepted = Number(acceptedQuantity);
      const rejected = Number(rejectedQuantity || 0);

      // Execute transaction
      const completedBatch = await prisma.$transaction(async (tx) => {
        const batch = await tx.productionBatch.findUnique({
          where: { id: batchId },
          include: { product: true, materialUsages: true },
        });

        if (!batch) throw new Error("Batch not found.");
        if (batch.status === "COMPLETED") throw new Error("Batch is already completed.");

        const usagesToApply = Array.isArray(actualUsages) && actualUsages.length > 0
          ? actualUsages
          : batch.materialUsages;

        // 1. Verify stock availability & Deduct materials
        for (const usage of usagesToApply) {
          const item = await tx.inventoryItem.findUnique({ where: { id: usage.inventoryItemId } });
          if (!item) throw new Error(`Material with ID ${usage.inventoryItemId} not found.`);

          const totalDeduction = Number(usage.actualQuantity) + Number(usage.wastageQuantity || 0);
          const currentStock = Number(item.currentStock);

          if (currentStock < totalDeduction) {
            throw new Error(
              `Insufficient stock for "${item.name}". Available: ${currentStock} ${item.unit}, required: ${totalDeduction} ${item.unit}.`
            );
          }

          const newStock = currentStock - totalDeduction;

          await tx.inventoryItem.update({
            where: { id: item.id },
            data: { currentStock: newStock },
          });

          await tx.inventoryStockMovement.create({
            data: {
              inventoryItemId: item.id,
              change: -totalDeduction,
              previousStock: currentStock,
              newStock,
              type: "PRODUCTION_CONSUMPTION",
              reason: `Consumed in Production Batch ${batch.batchNumber}`,
              reference: batch.batchNumber,
              performedBy: admin.name || admin.phone,
            },
          });
        }

        // 2. Increase Finished Product stock
        const prevProductStock = batch.product.stock;
        const newProductStock = prevProductStock + accepted;

        await tx.product.update({
          where: { id: batch.productId },
          data: { stock: newProductStock },
        });

        await tx.productStockMovement.create({
          data: {
            productId: batch.productId,
            change: accepted,
            previousStock: prevProductStock,
            newStock: newProductStock,
            reason: `Finished Goods from Batch ${batch.batchNumber}`,
            orderNumber: batch.batchNumber,
            createdBy: admin.name || admin.phone,
          },
        });

        // 3. Mark batch COMPLETED
        const updatedBatch = await tx.productionBatch.update({
          where: { id: batchId },
          data: {
            status: "COMPLETED",
            acceptedQuantity: accepted,
            rejectedQuantity: rejected,
            notes: notes !== undefined ? notes : batch.notes,
            completedAt: new Date(),
            responsibleStaff: admin.name || admin.phone,
          },
          include: { product: true },
        });

        return updatedBatch;
      });

      await logAdminAudit(
        admin.id,
        `BATCH_COMPLETED: ${completedBatch.batchNumber} (${completedBatch.acceptedQuantity} units of ${completedBatch.product.name})`
      );

      // Telegram notification (non-blocking)
      try {
        await notifyProductionBatchCompleted({
          batchNumber: completedBatch.batchNumber,
          productName: completedBatch.product.name,
          acceptedQuantity: completedBatch.acceptedQuantity,
          rejectedQuantity: completedBatch.rejectedQuantity,
          responsibleStaff: completedBatch.responsibleStaff || "Staff",
        });
      } catch (e) {
        console.error("Telegram notification error for batch:", e);
      }

      return NextResponse.json({ success: true, batch: completedBatch });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Admin production POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to process production action." }, { status: 400 });
  }
}
