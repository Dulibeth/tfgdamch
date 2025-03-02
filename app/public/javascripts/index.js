let audio = document.getElementById('audioPlayer');

function adjustMinutes(change) {
    const input = document.getElementById('time-range');
    let value = parseInt(input.value) || 0;
    value = Math.max(0, value + change);
    input.value = value;
}

function startRecording() {
    const micIcon = document.querySelector('.mic-icon');
    const micCircle = document.querySelector('.mic-circle');
    micCircle.style.animation = "pulse 1.5s infinite ease-in-out";
    micIcon.style.color = "#3f33b3";

    setTimeout(() => {
        micCircle.style.animation = "none";
        micIcon.style.color = "#666";
        document.getElementById('detected-word').innerHTML = `Palabra detectada: <strong>Innovación</strong>`;
    }, 3000);
}

function openPlayer(title) {
    document.getElementById('player-title').innerText = title;
    document.getElementById('playerModal').style.display = 'flex';
    audio.play();
}

function closePlayer() {
    audio.pause();
    document.getElementById('playerModal').style.display = 'none';
}
