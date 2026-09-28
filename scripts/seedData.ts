import { MongoClient, ObjectId } from "mongodb";
import * as dotenv from "dotenv";
import { ulid } from "ulid";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("No MONGODB_URI in .env.local");
  process.exit(1);
}

function randomString(prefix: string) {
  return prefix + "_" + Math.random().toString(36).substring(2, 10);
}

async function run() {
  const client = new MongoClient(uri!);
  try {
    await client.connect();
    // Obtener la DB del string de conexión o forzar "HyperTrackb" (usado en los logs)
    const dbName = process.env.MONGODB_DB || "HyperTrackb";
    const db = client.db(dbName);

    const user = await db.collection("users").findOne({});
    if (!user) {
      console.log("No hay usuarios en la base de datos. Regístrate primero en la web.");
      return;
    }

    const userId = user._id;
    console.log(`Poblando datos para el usuario: ${user.name} (${userId})`);

    // 1. Limpiar rutinas y sesiones anteriores para no duplicar (Opcional, pero recomendado para tests)
    // Comentado para no borrar tu progreso real.

    // 2. Crear Rutinas (WorkoutPrograms)
    console.log("Creando rutinas de prueba...");
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const todayName = days[new Date().getDay()];

    const pushRoutine = {
      _id: new ObjectId(),
      name: "Empuje (Pecho/Hombro/Tríceps) - PRO",
      authorId: user.publicId,
      clientId: user.publicId,
      status: "ACTIVE",
      assignedDays: [todayName, "MONDAY"],
      exercises: [
        {
          exerciseName: "Press de Banca Plano",
          sets: [
            { setNumber: 1, reps: 8, weight: 80, unit: "KG" },
            { setNumber: 2, reps: 8, weight: 80, unit: "KG" },
            { setNumber: 3, reps: 6, weight: 85, unit: "KG" }
          ]
        },
        {
          exerciseName: "Press Militar",
          sets: [
            { setNumber: 1, reps: 10, weight: 40, unit: "KG" },
            { setNumber: 2, reps: 10, weight: 40, unit: "KG" }
          ]
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const pullRoutine = {
      _id: new ObjectId(),
      name: "Jalón (Espalda/Bíceps) - HIPERTROFIA",
      authorId: user.publicId,
      clientId: user.publicId,
      status: "ACTIVE",
      assignedDays: ["TUESDAY", "FRIDAY"],
      exercises: [
        {
          exerciseName: "Dominadas",
          sets: [
            { setNumber: 1, reps: 10, weight: 0, unit: "KG" },
            { setNumber: 2, reps: 8, weight: 0, unit: "KG" }
          ]
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection("workout_programs").insertMany([pushRoutine, pullRoutine]);

    // 3. Crear Historial de Sesiones (WorkoutSessions) para desencadenar Auto-Progresión y PRs
    console.log("Creando historial de sesiones (PRs falsos)...");
    
    // Una sesión de hace 1 semana donde hizo Press de Banca (RPE 6 -> muy fácil, activará auto-progresión)
    const pastSession = {
      _id: new ObjectId(),
      publicId: `wks_${ulid()}`,
      clientId: userId,
      type: "PROGRAM",
      name: "Empuje (Pecho/Hombro/Tríceps) - PRO",
      notes: "Se sintió súper fácil hoy.",
      exercises: [
        {
          exerciseName: "Press de Banca Plano",
          sets: [
            { setNumber: 1, reps: 8, weight: 80, unit: "KG", rpe: 6, isPR: false },
            { setNumber: 2, reps: 8, weight: 80, unit: "KG", rpe: 6, isPR: false },
            { setNumber: 3, reps: 6, weight: 85, unit: "KG", rpe: 7, isPR: true } // Fue un PR histórico
          ]
        }
      ],
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Hace 7 días
      finishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 45 * 60000),
      durationMinutes: 45,
      prsBroken: 1,
      comments: [
        {
          _id: new ObjectId(),
          authorPublicId: "coach_x",
          role: "COACH",
          text: "¡Excelente levantamiento! La próxima semana le subimos.",
          createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
        },
        {
          _id: new ObjectId(),
          authorPublicId: user.publicId,
          role: "USER",
          text: "Sí, me sentí con mucha energía.",
          createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 3600000)
        }
      ],
      metadata: {
        schemaVersion: 1,
        source: "web"
      },
      audit: {
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    };

    await db.collection("workout_sessions").insertOne(pastSession);

    console.log("¡Datos reales inyectados con éxito!");
    console.log("- Rutina asignada al día de HOY creada.");
    console.log("- Sesión pasada con PRs y Comentarios creada.");
    console.log("- Esto activará la auto-progresión (IA) en tu dashboard.");

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
