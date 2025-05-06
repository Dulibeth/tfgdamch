// testWhisper.js
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Ajusta esta URL a la que te imprime tu servidor collab/ngrok
const WHISPER_API_URL = 'https://a207-35-230-26-4.ngrok-free.app/transcribe';

async function main() {
  try {
    const form = new FormData();
    // Asegúrate de tener test.wav en la raíz de tu proyecto
    form.append('file', fs.createReadStream('test.wav'));

    console.log('🚀 Enviando test.wav a Whisper en', WHISPER_API_URL);
    const res = await axios.post(WHISPER_API_URL, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('✅ Código HTTP:', res.status);
    console.log('🔊 Transcripción recibida:', res.data.transcription);
  } catch (err) {
    console.error('❌ Error al llamar a Whisper:', err.response?.data || err.message);
  }
}

main();
