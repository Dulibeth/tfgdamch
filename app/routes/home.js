require('dotenv').config();
const express   = require('express');
const multer    = require('multer');
const axios     = require('axios');
const FormData  = require('form-data');
const router    = express.Router();

const storage = multer.memoryStorage();
const upload  = multer({ storage });

const WHISPER_API_URL = process.env.WHISPER_API_URL;
console.log('🔑 Whisper URL:', WHISPER_API_URL);

router.get('/', (req, res) => {
  res.render('home', { title: 'Home' });
});

router.post('/upload', upload.single('audio'), async (req, res) => {
  console.log('🛎  POST /home/upload recibido');

  if (!req.file) {
    console.log('No llegó ningún archivo');
    return res.status(400).json({ message: 'No file received' });
  }

  console.log(`Archivo recibido: ${req.file.originalname} (${req.file.size} bytes)`);

  try {
    console.log(`📡 Enviando audio a Whisper en ${WHISPER_API_URL}...`);

    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname || 'audio.wav',
      contentType: req.file.mimetype
    });

    const whispRes = await axios.post(WHISPER_API_URL, formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log(' Respuesta de Whisper recibida');
    console.log('   → Whisper raw transcription:', whispRes.data.transcription);

    const raw = (whispRes.data.transcription || '').trim();
    const transcription = raw
      .replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '')
      .replace(/[^\p{L}0-9ÁÉÍÓÚáéíóúÑñ ]+/gu, '');

    console.log(`🔍 Buscando término limpio "${transcription}" en /search…`);
    const searchRes = await axios.get(
      `http://localhost:${process.env.PORT || 3000}/search`,
      { params: { term: transcription } }
    );
    const results = searchRes.data.results;
    console.log('Resultados de búsqueda recibidos:', results.length, 'audios');

    const totalMentions = results.reduce(
      (sum, r) => sum + (r.mentionCount ?? r.menciones.length),
      0
    );

    return res.json({
      transcription,
      totalMentions,
      searchResults: results
    });

  } catch (err) {
    console.error('Error en /home/upload:', err.response?.data || err.message);
    return res.status(500).json({
      error: 'Error al procesar el audio',
      details: err.response?.data || err.message
    });
  }
});

module.exports = router;
