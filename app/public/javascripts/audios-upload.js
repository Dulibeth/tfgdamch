require('dotenv').config();
const { MongoClient, GridFSBucket } = require('mongodb');
const fs = require('fs');
const path = require('path');

const folder = path.resolve(
  "C:\\Users\\Dulibeth\\Desktop\\TFG_Dulibeth\\TFG_Dulibeth\\audio"
);

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("Define MONGO_URI en .env");
    process.exit(1);
  }

  const client = new MongoClient(uri, { useUnifiedTopology: true });
  await client.connect();
  console.log("Conectado a MongoDB");

  const db = client.db();
  const bucket = new GridFSBucket(db, { bucketName: "audios" });

  const files = fs
    .readdirSync(folder)
    .filter(f => f.toLowerCase().endsWith(".wav"));

  if (files.length === 0) {
    console.error("No hay archivos .wav en", folder);
    await client.close();
    return;
  }

  for (const filename of files) {
    const filepath = path.join(folder, filename);
    console.log(`Subiendo ${filename}…`);

    await new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(filename);
      fs.createReadStream(filepath)
        .pipe(uploadStream)
        .on("error", err => reject(err))
        .on("finish", () => {
          console.log(`  Subido, id = ${uploadStream.id}`);
          resolve();
        });
    });
  }

  console.log("Audios subidos al bucket GridFS “audios”");
  await client.close();
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
