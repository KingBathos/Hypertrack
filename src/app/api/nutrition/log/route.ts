import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { generatePublicId } from "@/lib/utils/id";
import { mealLogSchema } from "@/lib/schemas/nutrition.schema";
import type { UserDocument } from "@/types/user";
import type { MealLogDocument } from "@/types/nutrition";

// ──────────────────────────────────────────────────
// POST /api/nutrition/log — Registra una nueva comida
// ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Validar Autenticación
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Parsear y validar el body
    const body = await request.json();
    const result = mealLogSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const data = result.data;

    // 3. Obtener conexión a BD y resolver el userId (ObjectId)
    const db = await getDb();
    const user = await db
      .collection<UserDocument>("users")
      .findOne({ publicId: session.sub }, { projection: { _id: 1 } });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // 4. Crear el documento siguiendo las directrices (UTC absoluto, prefijo mlg_)
    const newMealLog: MealLogDocument = {
      publicId: generatePublicId("mlg"),
      userId: user._id,
      date: new Date(), // UTC absoluto
      mealType: data.mealType,
      foodName: data.foodName,
      calories: data.calories,
      macros: {
        protein: data.macros.protein,
        carbs: data.macros.carbs,
        fats: data.macros.fats,
      },
      audit: {
        createdAt: new Date(),
      },
    };

    // 5. Insertar en MongoDB
    await db.collection<MealLogDocument>("meal_logs").insertOne(newMealLog);

    // 6. Retornar éxito
    return NextResponse.json({
      success: true,
      data: {
        publicId: newMealLog.publicId,
        date: newMealLog.date.toISOString(),
      },
    }, { status: 201 });

  } catch (error) {
    console.error("[Nutrition Log API] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
