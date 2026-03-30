require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Aktif odalar: { roomId: { game, players: { white, black }, spectators } }
const rooms = {};

function createRoom(roomId) {
  rooms[roomId] = {
    game: new Chess(),
    players: { white: null, black: null },
    spectators: [],
  };
}

function getRoomInfo(roomId) {
  const room = rooms[roomId];
  if (!room) return null;
  return {
    fen: room.game.fen(),
    turn: room.game.turn(),
    players: {
      white: room.players.white ? room.players.white.id : null,
      black: room.players.black ? room.players.black.id : null,
    },
    spectatorCount: room.spectators.length,
    isGameOver: room.game.isGameOver(),
    isCheck: room.game.inCheck(),
    isCheckmate: room.game.isCheckmate(),
    isDraw: room.game.isDraw(),
    history: room.game.history({ verbose: true }),
  };
}

io.on('connection', (socket) => {
  console.log(`[+] Bağlantı: ${socket.id}`);

  // Oda oluştur
  socket.on('createRoom', () => {
    const roomId = uuidv4().slice(0, 8).toUpperCase();
    createRoom(roomId);
    rooms[roomId].players.white = socket;
    socket.join(roomId);
    socket.roomId = roomId;
    socket.color = 'white';
    socket.emit('roomCreated', { roomId, color: 'white' });
    console.log(`[Oda] Oluşturuldu: ${roomId} - Beyaz: ${socket.id}`);
  });

  // Odaya katıl
  socket.on('joinRoom', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit('error', { message: 'Oda bulunamadı.' });
      return;
    }

    let color = null;
    if (!room.players.white) {
      room.players.white = socket;
      color = 'white';
    } else if (!room.players.black) {
      room.players.black = socket;
      color = 'black';
    } else {
      // Gözlemci
      room.spectators.push(socket);
      color = 'spectator';
    }

    socket.join(roomId);
    socket.roomId = roomId;
    socket.color = color;

    socket.emit('joinedRoom', { roomId, color, roomInfo: getRoomInfo(roomId) });
    io.to(roomId).emit('roomUpdate', getRoomInfo(roomId));

    if (room.players.white && room.players.black) {
      io.to(roomId).emit('gameStart', getRoomInfo(roomId));
      console.log(`[Oyun] Başladı: ${roomId}`);
    }
  });

  // Hamle yap
  socket.on('move', ({ from, to, promotion }) => {
    const { roomId, color } = socket;
    const room = rooms[roomId];
    if (!room) return;

    const { game } = room;

    // Sıra kontrolü
    const expectedColor = game.turn() === 'w' ? 'white' : 'black';
    if (color !== expectedColor) {
      socket.emit('error', { message: 'Sıra sizde değil.' });
      return;
    }

    try {
      const move = game.move({ from, to, promotion: promotion || 'q' });
      if (!move) {
        socket.emit('error', { message: 'Geçersiz hamle.' });
        return;
      }

      const info = getRoomInfo(roomId);
      io.to(roomId).emit('moveMade', { move, roomInfo: info });

      if (info.isGameOver) {
        let result = 'Beraberlik';
        if (info.isCheckmate) {
          result = color === 'white' ? 'Beyaz kazandı!' : 'Siyah kazandı!';
        }
        io.to(roomId).emit('gameOver', { result, roomInfo: info });
        console.log(`[Oyun] Bitti: ${roomId} - ${result}`);
      }
    } catch {
      socket.emit('error', { message: 'Geçersiz hamle.' });
    }
  });

  // Oyunu sıfırla
  socket.on('resetGame', () => {
    const { roomId, color } = socket;
    const room = rooms[roomId];
    if (!room) return;

    // Sadece oyuncular sıfırlayabilir
    if (color !== 'white' && color !== 'black') return;

    room.game = new Chess();
    io.to(roomId).emit('gameReset', getRoomInfo(roomId));
    console.log(`[Oyun] Sıfırlandı: ${roomId}`);
  });

  // Bağlantı kesildi
  socket.on('disconnect', () => {
    const { roomId, color } = socket;
    if (!roomId || !rooms[roomId]) return;

    const room = rooms[roomId];

    if (color === 'white' || color === 'black') {
      room.players[color] = null;
      io.to(roomId).emit('playerLeft', { color });
      console.log(`[-] Ayrıldı: ${socket.id} (${color}) - Oda: ${roomId}`);

      // İki oyuncu da ayrıldıysa odayı sil
      if (!room.players.white && !room.players.black) {
        delete rooms[roomId];
        console.log(`[Oda] Silindi: ${roomId}`);
      }
    } else {
      room.spectators = room.spectators.filter((s) => s.id !== socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Satranç sunucusu çalışıyor: http://localhost:${PORT}`);
});
