// Script para extraer índices y validaciones de esquema de cada colección
const { MongoClient } = require("mongodb");

async function inspectPhysical() {
  const client = new MongoClient("mongodb://localhost:27017/HyperTrackb");
  try {
    await client.connect();
    const db = client.db("HyperTrackb");
    const collections = await db.listCollections().toArray();
    
    console.log("═══════════════════════════════════════");
    console.log("DISEÑO FÍSICO — ÍNDICES Y VALIDACIONES");
    console.log("═══════════════════════════════════════\n");
    
    for (const col of collections) {
      const collection = db.collection(col.name);
      const indexes = await collection.indexes();
      const count = await collection.countDocuments();
      
      console.log(`\n────────────────────────────────────`);
      console.log(`📦 ${col.name} (${count} docs)`);
      
      // Índices
      console.log(`  ÍNDICES (${indexes.length}):`);
      for (const idx of indexes) {
        const unique = idx.unique ? " <<UNIQUE>>" : "";
        const sparse = idx.sparse ? " <<SPARSE>>" : "";
        const ttl = idx.expireAfterSeconds !== undefined ? ` <<TTL: ${idx.expireAfterSeconds}s>>` : "";
        console.log(`    - ${idx.name}: ${JSON.stringify(idx.key)}${unique}${sparse}${ttl}`);
      }
      
      // Validación de esquema
      if (col.options && col.options.validator) {
        console.log(`  VALIDACIÓN:`);
        console.log(`    ${JSON.stringify(col.options.validator, null, 4).substring(0, 500)}`);
      } else {
        console.log(`  VALIDACIÓN: (ninguna definida a nivel de colección)`);
      }
      
      // Tamaño
      try {
        const stats = await db.command({ collStats: col.name });
        console.log(`  TAMAÑO: ${(stats.size / 1024).toFixed(2)} KB | storageSize: ${(stats.storageSize / 1024).toFixed(2)} KB`);
        console.log(`  AVG DOC SIZE: ${stats.avgObjSize || 0} bytes`);
      } catch(e) {
        console.log(`  TAMAÑO: (no disponible)`);
      }
    }
    
  } finally {
    await client.close();
  }
}

inspectPhysical();
