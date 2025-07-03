require('dotenv').config();
const express   = require('express');
const multer    = require('multer');
const axios     = require('axios');
const FormData  = require('form-data');
const { MongoClient } = require('mongodb');

const router  = express.Router();
const storage  = multer.memoryStorage();
const upload   = multer({ storage });

const WHISPER_API_URL = process.env.WHISPER_API_URL;
const MONGODB_URI     = process.env.MONGODB_URI;

if (!MONGODB_URI) throw new Error('Falta MONGODB_URI');

const mongoClient = new MongoClient(MONGODB_URI);
mongoClient.connect();

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

router.post('/', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' });

    const fd = new FormData();
    fd.append('file', req.file.buffer, {
      filename: req.file.originalname || 'audio.wav',
      contentType: req.file.mimetype
    });
    const whispRes = await axios.post(WHISPER_API_URL, fd, {
      headers: fd.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    const raw   = (whispRes.data.transcription || '').trim();
    const clean = raw
      .replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '')
      .replace(/[^\p{L}0-9ÁÉÍÓÚáéíóúÑñ ]+/gu, '')
      .toLowerCase();

    const wordPattern = accentInsensitivePattern(clean);
    const regex       = new RegExp(`\\b${wordPattern}\\b[\\p{P}\\p{S}]*`, 'iu');
    const db   = mongoClient.db('audiofind');
    const coll = db.collection('transcripciones');
    const pipeline = [
      { $unwind: '$segments' },
      { $unwind: '$segments.words' },
      { $match: { 'segments.words.text': regex } },
      {
        $group: {
          _id: '$filename',
          menciones: {
            $push: {
              start: '$segments.words.start',
              end:   '$segments.words.end'
            }
          }
        }
      }
    ];

    const resultsRaw = await coll.aggregate(pipeline).toArray();
    const matches = resultsRaw.map(r => ({
      filename:  r._id,
      url:       `/audio/${r._id}`,
      menciones: r.menciones
    }));

    const totalMentions = matches.reduce(
      (sum, m) => sum + m.menciones.length,
      0
    );

    const responsePayload = { word: raw, totalMentions, matches };
    console.log('[/analyze] Response payload:', JSON.stringify(responsePayload, null, 2));

    return res.json(responsePayload);

  } catch (err) {
    console.error('Error en /analyze:', err);
    res.status(500).json({ error: 'Error interno', details: err.message });
  }
});

module.exports = router;
