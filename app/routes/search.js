// routes/search.js
const express  = require('express');
const router   = express.Router();
const { MongoClient } = require('mongodb');

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function accentInsensitivePattern(str) {
  const map = {
    a: '[aáàäâãå]',
    e: '[eéèëê]',
    i: '[iíìïî]',
    o: '[oóòöôõ]',
    u: '[uúùüû]',
    n: '[nñ]'
  };
  return str
    .split('')
    .map(ch => map[ch.toLowerCase()] || escapeRegExp(ch))
    .join('');
}


router.get('/', async (req, res, next) => {
  try {
    
    const termRaw = (req.query.term || '').trim();
    if (!termRaw) {
      return res.status(400).json({ error: 'Falta el parámetro ?term=' });
    }

    const term = termRaw          
      .replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '')
      .replace(/[^\p{L}0-9ÁÉÍÓÚáéíóúÑñ ]+/gu, '');

    const pat   = accentInsensitivePattern(term);    
    const regex = new RegExp(`^${pat}[\\.,]?$`, 'i');  

    console.log('Regex buscado:', regex);

    const uri = process.env.MONGO_URI;
    if (!uri) return res.status(500).json({ error: 'No hay MONGO_URI en .env' });

    const client = new MongoClient(uri);
    await client.connect();
    const coll = client.db('audiofind').collection('transcripciones');

    const pipeline = [
      { $unwind: '$segments' },
      { $unwind: '$segments.words' },
      { $match: { 'segments.words.text': regex } },
      {
        $group: {
          _id: '$_id',
          menciones: {
            $push: {
              palabra: '$segments.words.text',
              start:   '$segments.words.start',
              end:     '$segments.words.end'
            }
          },
          filename: { $first: '$filename' }
        }
      },
      {
        $lookup: {
          from:         'audios.files',
          localField:   'filename',
          foreignField: 'filename',
          as:           'audioData'
        }
      },
      { $unwind: { path: '$audioData', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id:            0,
          audioId:        '$_id',
          fileId:         '$audioData._id',
          filename:       1,
          menciones:      1,
          mentionCount: { $size: '$menciones' }
        }
      }
    ];

    const results = await coll.aggregate(pipeline).toArray();
    await client.close();

    res.json({ term, results });
  } catch (err) { next(err); }
});

module.exports = router;
