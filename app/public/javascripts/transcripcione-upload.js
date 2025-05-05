// scripts/resetAndUploadTranscripts.js
// Este script vacía la colección `transcripciones` (sin eliminar índices)
// y vuelve a subir todos los JSON de la carpeta `reco`, añadiendo el campo `filename`
// que coincide con tus archivos .wav en GridFS.

require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs   = require('fs');
const path = require('path');

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('⚠️  Define MONGO_URI en .env');
    process.exit(1);
  }

  const client = new MongoClient(uri, { useUnifiedTopology: true });
  await client.connect();
  console.log('🔗 Conectado a MongoDB');

  const db   = client.db('audiofind');
  const coll = db.collection('transcripciones');

  // 1) Vaciar solo los documentos (mantener índices activos)
  console.log('🗑️  Borrando documentos de transcripciones...');
  await coll.deleteMany({});

  // 2) Leer todos los JSON de la carpeta reco/
  const folder = path.resolve(
    "C:\\Users\\Dulibeth\\Desktop\\TFG_Dulibeth\\TFG_Dulibeth\\reco"
  );
  const files = fs.readdirSync(folder).filter(f => f.toLowerCase().endsWith('.json'));

  console.log(`📄 Preparando ${files.length} transcripciones para subir...`);

  for (const file of files) {
    const fullpath = path.join(folder, file);
    let doc;
    try {
      doc = JSON.parse(fs.readFileSync(fullpath, 'utf8'));
    } catch (err) {
      console.error(`⚠️  Error parseando ${file}:`, err);
      continue;
    }

    // Añadir filename para hacer lookup con audios.files.filename
    const base = path.basename(file, '.json');
    doc.filename = base + '.wav';

    await coll.insertOne(doc);
    console.log(`✅ Insertado ${file} → filename: ${doc.filename}`);
  }

  await client.close();
  console.log('🎉 Todas las transcripciones han sido re-subidas');
}

main().catch(err => {
  console.error('❌ Error en resetAndUploadTranscripts.js:', err);
  process.exit(1);
});