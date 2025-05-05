// routes/home.js
require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const axios   = require('axios');
const FormData = require('form-data');
const router  = express.Router();

const storage = multer.memoryStorage();
const upload  = multer({ storage });

// const WHISPER_API_URL = 'https://miunico123abc.loca.lt/transcribe';

router.get('/', (req, res) => {
  res.render('home', { title: 'Home' });
});

router.post('/upload', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file received' });
  }

  // -- Código original para enviar a Whisper (comentado) --
  /*
  const formData = new FormData();
  formData.append('file', req.file.buffer, {
    filename: req.file.originalname || 'audio.wav',
    contentType: req.file.mimetype
  });

  let transcription;
  try {
    const whispRes = await axios.post(WHISPER_API_URL, formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    transcription = whispRes.data.transcription;
  } catch (err) {
    return res.status(500).json({ error: 'Error al transcribir el audio' });
  }
  */

  // Fijamos la transcripción manualmente para pruebas
  const transcription = 'Sánchez';

  // Llamada al endpoint de búsqueda
  try {
    const searchRes = await axios.get(
      `http://localhost:${process.env.PORT || 3000}/search`,
      { params: { term: transcription } }
    );
    return res.json({
      transcription,
      searchResults: searchRes.data.results
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error al buscar en la base de datos' });
  }
});

module.exports = router;
