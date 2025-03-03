function startRecording() {
    document.querySelector('.mic-container').classList.add('listening');
    setTimeout(() => {
        document.querySelector('.mic-container').classList.remove('listening');
        document.getElementById('detected-word').innerHTML = 'Palabra detectada: <strong>Innovación</strong>';
    }, 3000);
}

function openPlayer(title) {
    document.getElementById('player-title').innerText = title;
    document.getElementById('playerModal').style.display = 'flex';
}

function closePlayer() {
    document.getElementById('playerModal').style.display = 'none';
}
