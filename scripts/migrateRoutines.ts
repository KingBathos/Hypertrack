import { MongoClient } from "mongodb";
import dotenv from "dotenv";

// Cargar variables de entorno locales
dotenv.config({ path: ".env.local" });

async function migrate() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;

  if (!uri || !dbName) {
    console.error("Faltan variables MONGODB_URI o MONGODB_DB en .env.local");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log(`Conectado a MongoDB (DB: ${dbName})...`);
    
    const db = client.db(dbName);
    const routines = db.collection("workout_programs");

    // Buscar documentos que no tengan el campo status
    const query = { status: { $exists: false } };
    
    // Asignar status ACTIVE y assignedDays vacío
    const update = { 
      $set: { 
        status: "ACTIVE",
        assignedDays: [] 
      } 
    };

    const result = await routines.updateMany(query, update);

    console.log(`Migración completada con éxito.`);
    console.log(`Documentos encontrados/analizados que requerían cambio: ${result.matchedCount}`);
    console.log(`Documentos modificados exitosamente: ${result.modifiedCount}`);

  } catch (error) {
    console.error("Error crítico durante la migración:", error);
  } finally {
    await client.close();
    console.log("Conexión cerrada.");
    process.exit(0);
  }
}

migrate();
