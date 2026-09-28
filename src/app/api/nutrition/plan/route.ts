import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { generatePublicId } from "@/lib/utils/id";
import { nutritionPlanSchema } from "@/lib/schemas/nutrition.schema";
import type { UserDocument } from "@/types/user";
import type { NutritionPlanDocument } from "@/types/nutrition";

// ──────────────────────────────────────────────────
// GET /api/nutrition/plan — Obtiene el plan activo
// ──────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const db = await getDb();
    const user = await db
      .collection<UserDocument>("users")
      .findOne({ publicId: session.sub }, { projection: { _id: 1 } });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const plan = await db
      .collection<NutritionPlanDocument>("nutrition_plans")
      .findOne({ clientId: user._id, status: "ACTIVE" });

    if (!plan) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        publicId: plan.publicId,
        status: plan.status,
        dailyTargets: plan.dailyTargets,
        startDate: plan.startDate.toISOString(),
        audit: {
          createdAt: plan.audit.createdAt.toISOString(),
          updatedAt: plan.audit.updatedAt.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("[Nutrition Plan API GET] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// ──────────────────────────────────────────────────
// POST /api/nutrition/plan — Crea o actualiza el plan
// ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const result = nutritionPlanSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const data = result.data;

    const db = await getDb();
    const user = await db
      .collection<UserDocument>("users")
      .findOne({ publicId: session.sub }, { projection: { _id: 1 } });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Inactivar cualquier plan anterior
    await db.collection<NutritionPlanDocument>("nutrition_plans").updateMany(
      { clientId: user._id, status: "ACTIVE" },
      { $set: { status: "CANCELLED", "audit.updatedAt": new Date() } }
    );

    // Crear el nuevo plan
    const newPlan: NutritionPlanDocument = {
      publicId: generatePublicId("nut"),
      clientId: user._id,
      status: "ACTIVE",
      dailyTargets: {
        calories: Number(data.dailyCalories),
        proteinGrams: Number(data.macros.protein),
        carbsGrams: Number(data.macros.carbs),
        fatsGrams: Number(data.macros.fats),
      },
      startDate: new Date(),
      audit: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user._id,
      }
    };

    await db.collection<NutritionPlanDocument>("nutrition_plans").insertOne(newPlan);

    return NextResponse.json({
      success: true,
      data: {
        publicId: newPlan.publicId,
      },
    }, { status: 201 });

  } catch (error) {
    console.error("[Nutrition Plan API POST] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
