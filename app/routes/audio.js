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

    const downloadStream = bucket.openDownloadStreamByName(req.params.filename);
    res.set('Content-Type', 'audio/wav');
    downloadStream.pipe(res).on('error', next);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
