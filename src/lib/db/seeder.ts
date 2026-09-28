import { getDb } from "./mongodb";
import crypto from "crypto";
import { ObjectId } from "mongodb";

function generateId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(13).toString("hex").toUpperCase()}`;
}

export async function runAutoSeeder() {
  const db = await getDb();
  
  // 1. Verificar si ya hay usuarios de prueba
  const existingTestUsers = await db.collection("users").countDocuments({ "email.value": { $regex: /testathlete/ } });
  if (existingTestUsers > 0) {
    console.log("Database already seeded with test athletes.");
    return { success: true, message: "Already seeded" };
  }

  console.log("Starting Auto-Seeder...");

  const usersCol = db.collection("users");
  const profilesCol = db.collection("profiles");
  const workoutsCol = db.collection("workout_sessions");
  const mealsCol = db.collection("meal_logs");

  const now = new Date();
  
  // Ejercicios base para la simulación
  const exercisesData = {
    Push: [
      { id: "exe_PRESSBANCA", name: "Press de Banca" },
      { id: "exe_MILITAR", name: "Press Militar" }
    ],
    Pull: [
      { id: "exe_DOMINADAS", name: "Dominadas" },
      { id: "exe_REMO", name: "Remo con Barra" }
    ],
    Legs: [
      { id: "exe_SENTADILLA", name: "Sentadilla" },
      { id: "exe_PESOMUERTO", name: "Peso Muerto" }
    ]
  };

  const athletes = [];

  // Crear 5 atletas de prueba
  for (let i = 1; i <= 5; i++) {
    const userId = new ObjectId();
    const publicId = generateId("usr");
    
    // Insert User
    await usersCol.insertOne({
      _id: userId,
      publicId,
      role: "USER",
      email: {
        value: `testathlete${i}@hypertrack.com`,
        normalized: `testathlete${i}@hypertrack.com`,
        verified: true,
        verifiedAt: now
      },
      authentication: {
        passwordHash: "argon2id_mock_hash",
        algorithm: "argon2id",
        failedAttempts: 0,
        lockedUntil: null
      },
      account: {
        status: "ACTIVE",
        language: "es-PE",
        timezone: "America/Lima"
      },
      metadata: { schemaVersion: 1, source: "api" },
      audit: { createdAt: now, updatedAt: now }
    } as any);

    // Insert Profile (Biometría)
    const baseWeight = 70 + (i * 5); // 75kg, 80kg, 85kg...
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - (20 + i)); // 21, 22, 23 years old

    await profilesCol.insertOne({
      userId: userId,
      publicId: generateId("prf"),
      identity: {
        firstName: `Atleta`,
        lastName: `Prueba ${i}`,
        displayName: `Atleta Prueba ${i}`
      },
      contact: { phone: `+5190000000${i}`, country: "PE" },
      demographics: { birthDate, sex: i % 2 === 0 ? "FEMALE" : "MALE" },
      physical: {
        heightCm: 170 + i,
        weightKg: baseWeight
      },
      goals: { primaryGoal: "HYPERTROPHY" },
      preferences: { measurementSystem: "METRIC" },
      medical: { injuries: [], allergies: [] },
      metadata: { schemaVersion: 1 },
      audit: { createdAt: now, updatedAt: now }
    } as any);

    athletes.push({ userId, publicId, baseWeight });
  }

  // Generar Workout Sessions y Meal Logs por atleta
  for (const athlete of athletes) {
    // Generar 20 Workout Sessions pasadas (4 semanas)
    for (let w = 0; w < 20; w++) {
      // Días hacia atrás
      const daysAgo = 28 - w; // Empieza hace 28 días, termina casi hoy
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() - daysAgo);

      // Rotar rutinas
      const typeKeys = Object.keys(exercisesData) as ("Push" | "Pull" | "Legs")[];
      const type = typeKeys[w % 3];
      const routineExs = exercisesData[type];

      // Progresión de peso simulada: w * 2.5 kg
      const progression = w * 2.5;

      const exercises = routineExs.map(ex => ({
        exerciseId: ex.id,
        name: ex.name,
        sets: [
          { weight: 40 + progression, reps: 10, rpe: 8, completed: true },
          { weight: 40 + progression, reps: 10, rpe: 8, completed: true },
          { weight: 40 + progression, reps: 8, rpe: 9, completed: true } // Fatiga en el último set
        ]
      }));

      await workoutsCol.insertOne({
        publicId: generateId("wks"),
        userId: athlete.publicId,
        type: "FREE",
        name: `Simulación ${type}`,
        startedAt: sessionDate,
        endedAt: new Date(sessionDate.getTime() + 60 * 60 * 1000), // 1 hora después
        exercises: exercises,
        metadata: { source: "web", schemaVersion: 1 },
        audit: { createdAt: sessionDate, updatedAt: sessionDate }
      } as any);
    }

    // Generar 7 Meal Logs pasados
    for (let d = 0; d < 7; d++) {
      const daysAgo = 6 - d;
      const logDate = new Date();
      logDate.setDate(logDate.getDate() - daysAgo);
      
      const targetCals = 2500;
      const variation = Math.floor(Math.random() * 200) - 100; // -100 a +100
      
      await mealsCol.insertOne({
        publicId: generateId("mlg"),
        userId: athlete.publicId,
        date: logDate,
        mealType: "DINNER",
        name: "Cena de Simulación",
        macros: {
          calories: targetCals + variation,
          protein: 150 + Math.floor(variation / 10),
          carbs: 250 + Math.floor(variation / 5),
          fats: 70 + Math.floor(variation / 15)
        },
        audit: { createdAt: logDate, updatedAt: logDate }
      });
    }
  }

  console.log("Auto-Seeder completed successfully.");
  return { success: true };
}
