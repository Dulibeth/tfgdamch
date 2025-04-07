const audiosMock = [
    { nombre: "Entrevista CEO.mp3" },
    { nombre: "Conferencia IA.mp3" },
    { nombre: "Podcast Tecnología.mp3" }
];

let audio = new Audio('/audios/prueba.wav');
let mediaRecorder;
let audioChunks = [];
let silenceTimer;

function startRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        const micContainer = document.querySelector('.mic-container');
        micContainer.classList.add('listening', 'recording');

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            micContainer.classList.remove('listening', 'recording');
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const formData = new FormData();
            formData.append('audio', audioBlob);

            fetch('/home/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                console.log('Archivo enviado con éxito:', data);
            })
            .catch(error => {
                console.error('Error al enviar el archivo:', error);
            });

            console.log('Audio grabado:', audioBlob);
            document.querySelector('.mic-btn').disabled = false;
        };

        mediaRecorder.start();

        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
            mediaRecorder.stop();
        }, 3000);

        document.querySelector('.mic-btn').disabled = true;
    })
    .catch(error => {
        console.error('Error al acceder al micrófono:', error);
    });
}

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

function startRecordingMocking() {
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
