const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');

router.get('/', async (req, res, next) => {
  try {
    const term = req.query.term;
    if (!term) {
      return res.status(400).json({ error: 'Falta el parámetro ?term=' });
    }

    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('Define MONGO_URI en .env');
      return res.status(500).json({ error: 'No hay configuración de Mongo' });
    }

    const client = new MongoClient(uri);
    await client.connect();
    const coll = client.db('audiofind').collection('transcripciones');

    // Pipeline de búsqueda por palabra y unión con datos de audio via filename
    const pipeline = [
      {
        $search: {
          index: 'default',
          text: {
            query: term,
            path: 'segments.words.text'
          }
        }
      },
      { $unwind: '$segments' },
      { $unwind: '$segments.words' },
      {
        $match: {
          'segments.words.text': {
            $regex: `^${term}$`,
            $options: 'i'
          }
        }
      },
      {
        $group: {
          _id: '$_id',
          menciones: {
            $push: {
              palabra: '$segments.words.text',
              start: '$segments.words.start',
              end: '$segments.words.end'
            }
          },
          filename: { $first: '$filename' }
        }
      },
      {
        // 'lookup' para unir con la colección GridFS 'audios.files' por filename
        $lookup: {
          from: 'audios.files',
          localField: 'filename',
          foreignField: 'filename',
          as: 'audioData'
        }
      },
      { $unwind: { path: '$audioData', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          audioId: '$_id',            // id de la transcripción
          fileId: '$audioData._id',  // id del chunk en GridFS
          filename: 1,                // nombre de fichero
          menciones: 1
        }
      }
    ];

    const results = await coll.aggregate(pipeline).toArray();
    await client.close();

    res.json({ term, results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
