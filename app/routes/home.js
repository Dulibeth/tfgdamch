var express = require('express');
var multer = require('multer');
var router = express.Router();
var axios = require('axios');
var FormData = require('form-data');

// Configuración de Multer para almacenar archivos en memoria
var storage = multer.memoryStorage();
var upload = multer({ storage: storage });

router.get('/', function(req, res, next) {
  res.render('home', { title: 'Home' });
});

router.post('/upload', upload.single('audio'), async function(req, res, next) {
  if (!req.file) {
      return res.status(400).json({ message: 'No file received' });
  }

  const formData = new FormData();
  // Use 'file' instead of 'audio' to match FastAPI's expected parameter name
  formData.append('file', req.file.buffer, {
      filename: req.file.originalname || 'audio.webm',
      contentType: req.file.mimetype
  });

  try {
      const response = await axios.post(
          'https://a537-34-125-143-9.ngrok-free.app/transcribe', // Use HTTP (ngrok handles HTTPS)
          formData,
          {
              headers: {
                  ...formData.getHeaders(),
              },
              maxContentLength: Infinity,
              maxBodyLength: Infinity
          }
      );

      res.json(response.data);
  } catch (error) {
      console.error('API Error:', error.response?.data || error.message);
      res.status(500).json({ 
          error: 'API error',
          details: error.response?.data || error.message 
      });
  }
});

module.exports = router;
