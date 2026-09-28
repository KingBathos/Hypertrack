import { MongoClient, type Db } from "mongodb";

/**
 * Singleton de conexión a MongoDB.
 * Reutiliza la conexión durante hot reload en desarrollo
 * almacenándola en `globalThis`.
 *
 * ⚠️ IMPORTANTE: `mongoClient.db(MONGODB_DB)` SOBREESCRIBE el nombre de BD
 * especificado en la URI. Siempre usar MONGODB_DB como fuente de verdad.
 */

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB;

if (!MONGODB_URI) {
  throw new Error("Define MONGODB_URI en .env.local (ej: mongodb://localhost:27017/HyperTrackb)");
}

if (!MONGODB_DB) {
  throw new Error("Define MONGODB_DB en .env.local (ej: HyperTrackb)");
}

// Log en desarrollo para confirmar BD activa
if (process.env.NODE_ENV === "development") {
  console.log(`[MongoDB] Conectando a base de datos: "${MONGODB_DB}"`);
}

// Extender globalThis para persistir la conexión en dev (hot reload)
const globalForMongo = globalThis as unknown as {
  _mongoClient: MongoClient | undefined;
  _mongoClientPromise: Promise<MongoClient> | undefined;
  _mongoDbName: string | undefined;
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // Si el nombre de BD cambió (ej: se editó .env.local), forzar reconexión
  if (
    !globalForMongo._mongoClientPromise ||
    globalForMongo._mongoDbName !== MONGODB_DB
  ) {
    if (globalForMongo._mongoClient) {
      // Cerrar conexión anterior antes de crear una nueva
      void globalForMongo._mongoClient.close();
    }
    client = new MongoClient(MONGODB_URI);
    globalForMongo._mongoClientPromise = client.connect();
    globalForMongo._mongoClient = client;
    globalForMongo._mongoDbName = MONGODB_DB;
  }
  clientPromise = globalForMongo._mongoClientPromise;
} else {
  // En producción, nueva instancia por worker
  client = new MongoClient(MONGODB_URI);
  clientPromise = client.connect();
}

/**
 * Obtener la instancia de la base de datos.
 *
 * NOTA: `.db(MONGODB_DB)` sobreescribe el nombre de la URI, por lo que
 * `HyperTrackb` siempre se usará independientemente de lo que diga la URI.
 * Uso: `const db = await getDb();`
 */
export async function getDb(): Promise<Db> {
  const mongoClient = await clientPromise;
  return mongoClient.db(MONGODB_DB);
}

export default clientPromise;
