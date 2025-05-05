var express = require('express');
var multer = require('multer');
var router = express.Router();
var axios = require('axios');
var FormData = require('form-data');


var storage = multer.memoryStorage();
var upload = multer({ storage: storage });


const WHISPER_API_URL = 'https://miunico123abc.loca.lt/transcribe';

router.get('/', function(req, res, next) {
  res.render('home', { title: 'Home' });
});

router.post('/upload', upload.single('audio'), async function(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ message: 'No file received' });
  }

  const formData = new FormData();
  formData.append('file', req.file.buffer, {
    filename: req.file.originalname || 'audio.wav',
    contentType: req.file.mimetype
  });

  try {
    const response = await axios.post(WHISPER_API_URL, formData, {
      headers: {
        ...formData.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    res.json({
      message: 'Archivo recibido y transcrito con éxito',
      transcription: response.data.transcription
    });
  } catch (error) {
    console.error('Error en microservicio Whisper:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Error al transcribir el audio',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;
