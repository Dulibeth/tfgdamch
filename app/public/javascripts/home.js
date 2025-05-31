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
        new Audio('/sounds/ding.mp3').play();
        document.getElementById('micContainer').classList.remove('recording', 'listening');
        micBtn.disabled = false;

        document.querySelector('.audio-list').innerHTML = `
          <div class="loading-spinner-container">
            <div class="loading-spinner"></div>
            <p style="text-align:center; color:#666;">Cargando resultados...</p>
          </div>
        `;

        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', audioBlob);

        fetch('/upload', { method: 'POST', body: formData })
          .then(r => r.json())
          .then(data => {
            const transcription = data.transcription ? data.transcription : 'Palabra no encontrada';
            document.getElementById('detected-word').innerHTML =
              `Palabra detectada: <strong>${transcription}</strong>`;

            const total = (typeof data.totalMentions === 'number') ? data.totalMentions : '-';
            document.getElementById('mention-count').innerHTML =
              `Total de menciones: <strong>${total}</strong>`;

            renderResults(data.searchResults || []);
          })
          .catch(err => console.error('Error en fetch /upload:', err));
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 3000);
    })
    .catch(err => {
      console.error('Error al acceder al micrófono:', err);
      micBtn.disabled = false;
    });
}

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

function renderResults(results) {
  const list = document.querySelector('.audio-list');
  list.innerHTML = `
    <div class="loading-spinner-container">
      <div class="loading-spinner"></div>
      <p style="text-align:center; color:#666;">Cargando resultados...</p>
    </div>
  `;
  setTimeout(() => {
    if (!results.length) {
      list.innerHTML = '<p style="text-align:center; color:#999;">No se encontraron audios.</p>';
      return;
    }
    list.innerHTML = results.map(r => {
      const times = (r.menciones || []).map(m => m.start);
      return `
        <div class="audio-item">
          <span class="audio-info">
            <strong>${r.filename}</strong>
            <small>(${r.mentionCount} menciones)</small>
          </span>
          <button class="play-btn"
            onclick='openPlayerModal(
              "${r.filename}",
              "${r.filename}",
              ${JSON.stringify(times)}
            )'>▶️</button>
        </div>`;
    }).join('');
  }, 300);
}

function openPlayerModal(src, title = '', mentions = []) {
  document.getElementById('player-title').innerHTML = `
    <span style="display:inline-flex; align-items:center; gap:10px;">
      <span>Cargando audio...</span>
      <span class="loading-spinner" style="width:16px; height:16px; border-width:3px;"></span>
    </span>
  `;
  document.getElementById('playerModal').style.display = 'flex';
  isPlaying = false;
  updateTimeInfo();

  document.getElementById('waveform').style.display = 'none';
  document.querySelector('.mention-container').style.display = 'none';
  document.querySelector('.player-controls').style.display = 'none';
  document.querySelector('.time-display').style.display = 'none';

  const sel = document.getElementById('mentionSelect');
  sel.innerHTML = '<option value="">— Selecciona —</option>';
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

  wavesurfer.once('ready', () => {
    document.getElementById('player-title').innerText = title;
    wavesurfer.seekTo(0);
    wavesurfer.play();
    isPlaying = true;
    updateTimeInfo();

    document.getElementById('waveform').style.display = 'block';
    document.querySelector('.mention-container').style.display = 'block';
    document.querySelector('.player-controls').style.display = 'flex';
    document.querySelector('.time-display').style.display = 'block';
  });

  wavesurfer.on('audioprocess', updateTimeInfo);
  wavesurfer.on('seek', updateTimeInfo);
  wavesurfer.on('finish', () => { isPlaying = false; });
}

function togglePlay() {
  if (!wavesurfer) return;
  isPlaying ? wavesurfer.pause() : wavesurfer.play();
  isPlaying = !isPlaying;
}

function updateTimeInfo() {
  if (!wavesurfer) return;
  document.getElementById('timeInfo').innerText =
    `${formatTime(wavesurfer.getCurrentTime())} / ${formatTime(wavesurfer.getDuration())}`;
}

function closePlayer() {
  if (wavesurfer) {
    wavesurfer.destroy();
    wavesurfer = null;
  }
  document.getElementById('playerModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.mic-btn').addEventListener('click', startRecording);
});
