import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;

async function run() {
  const client = new MongoClient(uri!);
  try {
    await client.connect();
    const dbName = process.env.MONGODB_DB || "HyperTrackb";
    const db = client.db(dbName);

    console.log("Deshabilitando validación estricta para workout_sessions...");
    await db.command({ collMod: "workout_sessions", validationLevel: "off" });
    console.log("✅ workout_sessions liberada");

    console.log("Deshabilitando validación estricta para audit_logs...");
    await db.command({ collMod: "audit_logs", validationLevel: "off" });
    console.log("✅ audit_logs liberada");

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
