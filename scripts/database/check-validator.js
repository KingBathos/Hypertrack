const { MongoClient } = require("mongodb");

const MONGODB_URI = "mongodb://localhost:27017/HyperTrackb";
const MONGODB_DB = "HyperTrackb";

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    const collections = await db.listCollections({ name: "program_assignments" }).toArray();
    console.log(JSON.stringify(collections[0].options, null, 2));
  } finally {
    await client.close();
  }
}

run().catch(console.error);
