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
  const map = { a:'[aáàäâãå]', e:'[eéèëê]', i:'[iíìïî]', o:'[oóòöôõ]', u:'[uúùüû]', n:'[nñ]' };
  return str.split('').map(ch => map[ch.toLowerCase()] || escapeRegExp(ch)).join('');
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

    const raw = (whispRes.data.transcription || '').trim();
    const clean = raw
      .replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '')
      .replace(/[^\p{L}0-9ÁÉÍÓÚáéíóúÑñ ]+/gu, '');

    const db   = mongoClient.db('audiofind');
    const coll = db.collection('transcripciones');
    const regex = new RegExp(`^${accentInsensitivePattern(clean)}[\\.,]?$`, 'i');

    const pipeline = [
      { $unwind: '$segments' },
      { $unwind: '$segments.words' },
      { $match: { 'segments.words.text': regex } },
      {
        $group: {
          _id: '$_id',
          menciones: {
            $push: {
              start: '$segments.words.start',
              end:   '$segments.words.end'
            }
          },
          filename: { $first: '$filename' }
        }
      }
    ];

    const resultsRaw = await coll.aggregate(pipeline).toArray();

    const matches = resultsRaw.map(r => ({
      filename: r.filename,
      start:    r.menciones[0].start,        
      end:      r.menciones[0].end,
      url:      `/audio/${r.filename}`,   
      menciones: r.menciones
    }));

    const totalMentions = resultsRaw.reduce((s, r) => s + r.menciones.length, 0);

    return res.json({
      word:        raw,
      confidence:  whispRes.data.confidence ?? null,
      totalMentions,
      matches
    });

  } catch (err) {
    console.error('Error en /analyze:', err);
    res.status(500).json({ error: 'Error interno', details: err.message });
  }
});

module.exports = router;
