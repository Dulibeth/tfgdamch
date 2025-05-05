// routes/audio.js
const express = require('express');
const router  = express.Router();
const { MongoClient, GridFSBucket } = require('mongodb');

router.get('/:filename', async (req, res, next) => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    return res.status(500).end('No hay configuración de Mongo');
  }

  const client = new MongoClient(uri, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db('audiofind');
    const bucket = new GridFSBucket(db, { bucketName: 'audios' });

    // Abrimos un stream de descarga por nombre de fichero
    const downloadStream = bucket.openDownloadStreamByName(req.params.filename);
    // Informamos al navegador que lo que se va a recibir es un WAV
    res.set('Content-Type', 'audio/wav');
    // Pipe: enviamos directamente los datos de Mongo al cliente
    downloadStream.pipe(res).on('error', next);

    // Nota: no cerramos client aquí para no interrumpir el stream
  } catch (err) {
    next(err);
  }
});

module.exports = router;
