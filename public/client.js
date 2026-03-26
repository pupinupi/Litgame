const socket = io();

document.getElementById('joinBtn').onclick = () => {
  const username = document.getElementById('username').value;
  const roomCode = document.getElementById('roomCode').value;
  const color = document.getElementById('colorSelect').value;

  socket.emit('joinRoom', { roomCode, username, color });
  localStorage.setItem('roomCode', roomCode);
  localStorage.setItem('username', username);
  localStorage.setItem('color', color);

  window.location.href = 'game.html';
};

socket.on('updatePlayers', (players) => {
  const list = document.getElementById('playersList');
  if (!list) return;
  list.innerHTML = '<h3>Игроки в комнате:</h3>' + players.map(p => `<div style="color:${p.color}">${p.username}</div>`).join('');
});

socket.on('roomFull', () => alert('Комната полная!'));
