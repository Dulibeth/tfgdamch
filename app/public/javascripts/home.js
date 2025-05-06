// public/javascripts/home.js

let wavesurfer;
const SKIP_SECONDS = 10;
let isPlaying = false;

let mediaRecorder;
let audioChunks = [];

function startRecording() {
  const micBtn = document.querySelector('.mic-btn');
  micBtn.disabled = true;

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      document.getElementById('micContainer').classList.add('recording', 'listening');

      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

      mediaRecorder.onstop = () => {
        document.getElementById('micContainer').classList.remove('recording', 'listening');
        micBtn.disabled = false;

        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        console.log(`🔊 AudioBlob creado: ${audioBlob.size} bytes`);

        // for debugging: trigger automatic download
        const a = document.createElement('a');
        a.href = URL.createObjectURL(audioBlob);
        a.download = 'debug-recording.wav';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        const formData = new FormData();
        formData.append('audio', audioBlob);

        fetch('/home/upload', {
          method: 'POST',
          body: formData
        })
        .then(response => {
          console.log('📡 Respuesta upload status:', response.status);
          return response.json();
        })
        .then(data => {
          console.log('Transcripción recibida:', data);
          const transcription = data.transcription || '(sin transcripción)';
          document.getElementById('detected-word').innerHTML =
            `Palabra detectada: <strong>${transcription}</strong>`;
        })
        .catch(error => {
          console.error('Error al enviar el archivo o recibir respuesta:', error);
        });
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 3000);
    })
    .catch(err => {
      console.error('Error al acceder al micrófono:', err);
      document.querySelector('.mic-btn').disabled = false;
    });
}

function changeTime(amount) {
  const inp = document.getElementById('time-range');
  inp.value = Math.min(10, Math.max(0, parseInt(inp.value, 10) + amount));
}

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60), s = String(Math.floor(sec % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

function initMockSearch() {
  fetch('/search?term=Sánchez')
    .then(res => res.json())
    .then(data => renderResults(data.results || []))
    .catch(err => console.error('Error fetch /search:', err));
}

function renderResults(results) {
  const list = document.querySelector('.audio-list');
  list.innerHTML = results.length
    ? results.map(r => {
        const times = (r.menciones||[]).map(m=>m.start);
        return `
          <div class="audio-item">
            <span><strong>${r.filename}</strong></span>
            <button class="play-btn"
              onclick='openPlayerModal(
                "${r.filename}",
                "${r.filename}",
                ${JSON.stringify(times)}
              )'>
              ▶️
            </button>
          </div>`;
      }).join('')
    : '<p>No se encontraron audios.</p>';
}

function openPlayerModal(src, title = '', mentions = []) {
  document.getElementById('player-title').innerText = title;
  document.getElementById('playerModal').style.display = 'flex';
  isPlaying = false;
  updateTimeInfo();

  const sel = document.getElementById('mentionSelect');
  sel.innerHTML = `<option value="">— Selecciona —</option>`;
  const OFFSET = 2;
  mentions.forEach(t => {
    const t0 = Math.max(0, t - OFFSET);
    sel.innerHTML += `<option value="${t0}">${formatTime(t0)}</option>`;
  });
  sel.onchange = () => {
    const v = parseFloat(sel.value);
    if (!isNaN(v) && wavesurfer) {
      wavesurfer.seekTo(v / wavesurfer.getDuration());
      wavesurfer.play();
      isPlaying = true;
    }
  };

  if (wavesurfer) wavesurfer.destroy();
  wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#4a90e2',
    progressColor: '#007aff',
    backend: 'MediaElement',
    height: 60,
    barWidth: 2,
    normalize: true,
    responsive: true
  });
  wavesurfer.skipBackward = () => {
    const t = Math.max(0, wavesurfer.getCurrentTime() - SKIP_SECONDS);
    wavesurfer.seekTo(t / wavesurfer.getDuration());
  };
  wavesurfer.skipForward = () => {
    const t = Math.min(wavesurfer.getDuration(), wavesurfer.getCurrentTime() + SKIP_SECONDS);
    wavesurfer.seekTo(t / wavesurfer.getDuration());
  };

  const url = src.startsWith('blob:') ? src : `/audio/${src}`;
  wavesurfer.load(url);
  wavesurfer.on('ready', updateTimeInfo);
  wavesurfer.on('audioprocess', updateTimeInfo);
  wavesurfer.on('seek', updateTimeInfo);
  wavesurfer.on('finish', () => { isPlaying = false; });
}

function togglePlay() {
  if (!wavesurfer) return;
  if (isPlaying) wavesurfer.pause();
  else wavesurfer.play();
  isPlaying = !isPlaying;
}

function updateTimeInfo() {
  if (!wavesurfer) return;
  document.getElementById('timeInfo').innerText =
    `${formatTime(wavesurfer.getCurrentTime())} / ${formatTime(wavesurfer.getDuration())}`;
}

function closePlayer() {
  if (wavesurfer) { wavesurfer.destroy(); wavesurfer = null; }
  document.getElementById('playerModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  initMockSearch();
  document.querySelector('.mic-btn').addEventListener('click', startRecording);
});
