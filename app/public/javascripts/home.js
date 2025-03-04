const audiosMock = [
    { nombre: "Entrevista CEO.mp3" },
    { nombre: "Conferencia IA.mp3" },
    { nombre: "Podcast Tecnología.mp3" }
];


let audio = new Audio('/audios/prueba.wav');

document.addEventListener('DOMContentLoaded', () => {
    cargarAudiosMock();
});

function cargarAudiosMock() {
    const audioListContainer = document.querySelector('.audio-list');
    audioListContainer.innerHTML = '';  

    audiosMock.forEach(audioData => {
        const audioDiv = document.createElement('div');
        audioDiv.classList.add('audio-item');
        audioDiv.innerHTML = `
            <span>${audioData.nombre}</span>
            <button class="play-btn" onclick="openPlayer('${audioData.nombre}')">Reproducir</button>
        `;
        audioListContainer.appendChild(audioDiv);
    });
}

function startRecording() {
    const micContainer = document.querySelector('.mic-container');
    micContainer.classList.add('listening');

    setTimeout(() => {
        micContainer.classList.remove('listening');
        document.getElementById('detected-word').innerHTML = 'Palabra detectada: <strong>Innovación</strong>';
    }, 3000);
}

function changeTime(amount) {
    const timeInput = document.getElementById('time-range');
    let currentValue = parseInt(timeInput.value, 10);

    currentValue += amount;

    if (currentValue < 0) currentValue = 0;
    if (currentValue > 10) currentValue = 10;

    timeInput.value = currentValue;
}

function openPlayer(title) {
    document.getElementById('player-title').innerText = title;
    document.getElementById('playerModal').style.display = 'flex';
    audio.currentTime = 0;
    audio.play();
}

function closePlayer() {
    audio.pause();
    document.getElementById('playerModal').style.display = 'none';
}

audio.addEventListener('timeupdate', () => {
    const progressBar = document.querySelector('.progress-bar');
    const currentTime = document.getElementById('currentTime');
    const totalTime = document.getElementById('totalTime');

    progressBar.value = (audio.currentTime / audio.duration) * 100;
    currentTime.innerText = formatTime(audio.currentTime);
    totalTime.innerText = formatTime(audio.duration);
});

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
}

function seek(seconds) {
    audio.currentTime += seconds;
}

function togglePlay() {
    if (audio.paused) {
        audio.play();
    } else {
        audio.pause();
    }
}

document.querySelector('.progress-bar').addEventListener('input', (e) => {
    const percent = e.target.value / 100;
    audio.currentTime = percent * audio.duration;
});
