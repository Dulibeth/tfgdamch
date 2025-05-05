// public/javascripts/home.js

let wavesurfer;
const SKIP_SECONDS = 10;
let isPlaying = false;

function initMockSearch() {
  fetch('/search?term=Sánchez')
    .then(res => res.json())
    .then(data => renderResults(data.results || []))
    .catch(err => console.error('Error fetch /search:', err));
}

function startRecording() {
  document.getElementById('micContainer').classList.add('recording', 'listening');
}

function changeTime(amount) {
  const inp = document.getElementById('time-range');
  const v = Math.min(10, Math.max(0, parseInt(inp.value, 10) + amount));
  inp.value = v;
}

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

function openPlayerModal(src, title = '') {
  document.getElementById('player-title').innerText = title || src;
  document.getElementById('playerModal').style.display = 'flex';
  isPlaying = false;
  updateTimeInfo();

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

  wavesurfer.on('ready', () => {
    updateTimeInfo();
  });
  wavesurfer.on('audioprocess', updateTimeInfo);
  wavesurfer.on('seek', updateTimeInfo);
  wavesurfer.on('finish', () => {
    isPlaying = false;
  });
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
  if (wavesurfer) {
    wavesurfer.destroy();
    wavesurfer = null;
  }
  document.getElementById('playerModal').style.display = 'none';
}

function renderResults(results) {
  const list = document.querySelector('.audio-list');
  list.innerHTML = '';
  if (!results.length) {
    list.innerHTML = '<p>No se encontraron audios.</p>';
    return;
  }
  results.forEach(r => {
    const div = document.createElement('div');
    div.className = 'audio-item';
    div.innerHTML = `
      <span><strong>${r.filename}</strong></span>
      <button class="play-btn" onclick="openPlayerModal('${r.filename}','${r.filename}')">▶️</button>
    `;
    list.appendChild(div);
  });
}

document.addEventListener('DOMContentLoaded', initMockSearch);
