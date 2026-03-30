/* global io */
'use strict';

// ─── Piece Unicode Map ─────────────────────────────────────────────────────
const PIECES = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

// ─── State ────────────────────────────────────────────────────────────────
let socket;
let myColor    = null;  // 'white' | 'black' | 'spectator'
let myRoomId   = null;
let roomInfo   = null;  // latest state from server
let selected   = null;  // { square, moves[] }
let lastMove   = null;  // { from, to }

// ─── DOM refs ─────────────────────────────────────────────────────────────
const lobbyEl        = document.getElementById('lobby');
const gameScreenEl   = document.getElementById('game-screen');
const boardEl        = document.getElementById('board');
const statusEl       = document.getElementById('status-bar');
const roomIdDisplay  = document.getElementById('room-id-display');
const moveListEl     = document.getElementById('move-list');
const modalOverlay   = document.getElementById('modal-overlay');
const modalTitle     = document.getElementById('modal-title');
const modalResult    = document.getElementById('modal-result');
const capturedWhite  = document.getElementById('captured-by-white');
const capturedBlack  = document.getElementById('captured-by-black');

// ─── Lobby buttons ────────────────────────────────────────────────────────
document.getElementById('btn-create').addEventListener('click', () => {
  initSocket();
  socket.emit('createRoom');
});

document.getElementById('btn-join').addEventListener('click', joinByInput);
document.getElementById('room-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') joinByInput();
});

document.getElementById('btn-copy').addEventListener('click', () => {
  navigator.clipboard.writeText(myRoomId).then(() => {
    document.getElementById('btn-copy').textContent = '✅';
    setTimeout(() => (document.getElementById('btn-copy').textContent = '📋'), 1500);
  });
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (socket) socket.emit('resetGame');
});

document.getElementById('modal-close').addEventListener('click', () => {
  modalOverlay.classList.add('hidden');
});

function joinByInput() {
  const code = document.getElementById('room-input').value.trim().toUpperCase();
  if (!code) return;
  initSocket();
  socket.emit('joinRoom', { roomId: code });
}

// ─── Socket ───────────────────────────────────────────────────────────────
function initSocket() {
  if (socket) return;
  socket = io();

  socket.on('roomCreated', ({ roomId, color }) => {
    myColor  = color;
    myRoomId = roomId;
    showGame(roomId);
    setStatus('Rakip bekleniyor… Oda kodu: ' + roomId);
  });

  socket.on('joinedRoom', ({ roomId, color, roomInfo: info }) => {
    myColor  = color;
    myRoomId = roomId;
    roomInfo = info;
    showGame(roomId);
    renderBoard(info.fen);
    renderHistory(info.history);
    updateStatus(info);
  });

  socket.on('roomUpdate', (info) => {
    roomInfo = info;
    renderBoard(info.fen);
    updateStatus(info);
  });

  socket.on('gameStart', (info) => {
    roomInfo = info;
    renderBoard(info.fen);
    updateStatus(info);
  });

  socket.on('moveMade', ({ move, roomInfo: info }) => {
    roomInfo = info;
    lastMove = { from: move.from, to: move.to };
    renderBoard(info.fen);
    renderHistory(info.history);
    updateStatus(info);
  });

  socket.on('gameOver', ({ result, roomInfo: info }) => {
    roomInfo = info;
    renderBoard(info.fen);
    showModal('Oyun Bitti', result);
  });

  socket.on('gameReset', (info) => {
    roomInfo = info;
    lastMove = null;
    selected = null;
    renderBoard(info.fen);
    renderHistory(info.history);
    updateStatus(info);
    modalOverlay.classList.add('hidden');
  });

  socket.on('playerLeft', ({ color }) => {
    setStatus((color === 'white' ? 'Beyaz' : 'Siyah') + ' oyuncu ayrıldı.');
  });

  socket.on('error', ({ message }) => {
    setStatus('⚠ ' + message);
  });
}

// ─── UI helpers ───────────────────────────────────────────────────────────
function showGame(roomId) {
  lobbyEl.classList.add('hidden');
  gameScreenEl.classList.remove('hidden');
  roomIdDisplay.textContent = roomId;
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function updateStatus(info) {
  const hasPlayers = info.players.white && info.players.black;
  if (!hasPlayers) { setStatus('Rakip bekleniyor…'); return; }
  if (info.isCheckmate) {
    const winner = info.turn === 'w' ? 'Siyah' : 'Beyaz';
    setStatus(winner + ' şah mat yaptı!');
  } else if (info.isDraw) {
    setStatus('Beraberlik!');
  } else if (info.isCheck) {
    const inCheck = info.turn === 'w' ? 'Beyaz' : 'Siyah';
    setStatus(inCheck + ' şahta!');
  } else {
    const turn = info.turn === 'w' ? 'Beyaz' : 'Siyah';
    setStatus(turn + ' oynuyor');
  }
}

function showModal(title, result) {
  modalTitle.textContent  = title;
  modalResult.textContent = result;
  modalOverlay.classList.remove('hidden');
}

// ─── Board rendering ──────────────────────────────────────────────────────
function parseFen(fen) {
  // Returns 8x8 array [rank][file] with piece chars or null
  const rows = fen.split(' ')[0].split('/');
  return rows.map((row) => {
    const cells = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < parseInt(ch, 10); i++) cells.push(null);
      } else {
        cells.push(ch);
      }
    }
    return cells;
  });
}

function squareName(rankIdx, fileIdx) {
  return 'abcdefgh'[fileIdx] + (8 - rankIdx);
}

function renderBoard(fen) {
  boardEl.innerHTML = '';
  const grid = parseFen(fen);

  const flip = myColor === 'black';

  const rankOrder = flip ? [0,1,2,3,4,5,6,7] : [0,1,2,3,4,5,6,7];
  const fileOrder = flip ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

  const ranks = flip ? [1,2,3,4,5,6,7,8]         : [8,7,6,5,4,3,2,1];
  const files = flip ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h'];

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const ri = rankOrder[r];
      const fi = fileOrder[f];
      const sq = squareName(ri, fi);
      const piece = grid[ri][fi];

      const div = document.createElement('div');
      div.classList.add('square', (ri + fi) % 2 === 0 ? 'light' : 'dark');
      div.dataset.square = sq;

      // Piece
      if (piece) {
        div.textContent = PIECES[piece] || piece;
        div.classList.add('has-piece');
      }

      // Last move highlight
      if (lastMove && (sq === lastMove.from || sq === lastMove.to)) {
        div.classList.add('last-move');
      }

      // Selected highlight
      if (selected && selected.square === sq) {
        div.classList.add('selected');
      }

      // Possible moves
      if (selected) {
        const isMove = selected.moves.some((m) => m.to === sq);
        if (isMove) {
          div.classList.add('possible');
          if (piece) div.classList.add('has-piece');
        }
      }

      // King in check highlight
      if (roomInfo && roomInfo.isCheck && piece) {
        const isKing = piece === 'K' || piece === 'k';
        const isCurrentTurnKing =
          (roomInfo.turn === 'w' && piece === 'K') ||
          (roomInfo.turn === 'b' && piece === 'k');
        if (isKing && isCurrentTurnKing) div.classList.add('in-check');
      }

      // Coordinates
      if (f === 0) {
        const span = document.createElement('span');
        span.className = 'coord-rank';
        span.textContent = ranks[r];
        div.appendChild(span);
      }
      if (r === 7) {
        const span = document.createElement('span');
        span.className = 'coord-file';
        span.textContent = files[f];
        div.appendChild(span);
      }

      div.addEventListener('click', () => onSquareClick(sq, piece));
      boardEl.appendChild(div);
    }
  }

  updateCaptured();
}

// ─── Interaction ──────────────────────────────────────────────────────────
function getLegalMoves(from) {
  if (!roomInfo) return [];
  // Ask server — but we compute moves client-side via FEN using our own mini helper.
  // We use the possible moves from roomInfo.history approach: just send the move
  // and let the server validate.  To show hints we compute from FEN.
  return computeMoves(roomInfo.fen, from);
}

function computeMoves(fen, from) {
  // Minimal legal move generator using pure FEN — delegated to inline Chess logic
  // We re-use chess.js loaded via CDN in a Worker-less context by parsing FEN ourselves.
  // For simplicity we use the server for validation and only show pseudo-legal destinations.
  const grid = parseFen(fen);
  const turn = fen.split(' ')[1]; // 'w' or 'b'
  const piece = getPieceAt(grid, from);
  if (!piece) return [];
  const isWhitePiece = piece === piece.toUpperCase();
  if (turn === 'w' && !isWhitePiece) return [];
  if (turn === 'b' && isWhitePiece) return [];

  return generateMoves(grid, from, turn);
}

function getPieceAt(grid, sq) {
  const file = 'abcdefgh'.indexOf(sq[0]);
  const rank = 8 - parseInt(sq[1], 10);
  return grid[rank][file];
}

function generateMoves(grid, from, turn) {
  const file  = 'abcdefgh'.indexOf(from[0]);
  const rank  = 8 - parseInt(from[1], 10);
  const piece = grid[rank][file];
  if (!piece) return [];

  const moves = [];
  const friendly = (p) => p && (turn === 'w' ? p === p.toUpperCase() : p === p.toLowerCase());
  const enemy    = (p) => p && !friendly(p);
  const isEmpty  = (r, f) => r >= 0 && r < 8 && f >= 0 && f < 8 && !grid[r][f];
  const toSq     = (r, f) => 'abcdefgh'[f] + (8 - r);
  const addIf    = (r, f) => {
    if (r < 0 || r > 7 || f < 0 || f > 7) return;
    if (friendly(grid[r][f])) return;
    moves.push({ to: toSq(r, f) });
  };
  const slide = (dr, df) => {
    let r = rank + dr, f = file + df;
    while (r >= 0 && r < 8 && f >= 0 && f < 8) {
      if (friendly(grid[r][f])) break;
      moves.push({ to: toSq(r, f) });
      if (enemy(grid[r][f])) break;
      r += dr; f += df;
    }
  };

  const p = piece.toLowerCase();

  if (p === 'r') { [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,df]) => slide(dr,df)); }
  else if (p === 'b') { [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,df]) => slide(dr,df)); }
  else if (p === 'q') {
    [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,df]) => slide(dr,df));
  }
  else if (p === 'n') {
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,df]) => addIf(rank+dr, file+df));
  }
  else if (p === 'k') {
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,df]) => addIf(rank+dr, file+df));
  }
  else if (p === 'p') {
    const dir   = turn === 'w' ? -1 : 1;
    const start = turn === 'w' ? 6  : 1;
    // Forward
    if (isEmpty(rank + dir, file)) {
      moves.push({ to: toSq(rank + dir, file) });
      if (rank === start && isEmpty(rank + 2 * dir, file)) {
        moves.push({ to: toSq(rank + 2 * dir, file) });
      }
    }
    // Captures
    [-1, 1].forEach((df) => {
      const nr = rank + dir, nf = file + df;
      if (nr >= 0 && nr < 8 && nf >= 0 && nf < 8 && enemy(grid[nr][nf])) {
        moves.push({ to: toSq(nr, nf) });
      }
    });
  }

  return moves;
}

function onSquareClick(sq, piece) {
  if (!roomInfo || !socket) return;
  const hasPlayers = roomInfo.players.white && roomInfo.players.black;
  if (!hasPlayers) return;
  if (myColor === 'spectator') return;
  if (roomInfo.isGameOver) return;

  const myTurn = (myColor === 'white' && roomInfo.turn === 'w') ||
                 (myColor === 'black' && roomInfo.turn === 'b');

  // If a piece is already selected
  if (selected) {
    const isMove = selected.moves.some((m) => m.to === sq);
    if (isMove) {
      socket.emit('move', { from: selected.square, to: sq });
      selected = null;
      return;
    }
    // Clicked own piece again — deselect or switch
    selected = null;
    renderBoard(roomInfo.fen);
  }

  if (!myTurn) return;

  const p = getPieceAt(parseFen(roomInfo.fen), sq);
  if (!p) return;
  const isOwn = (myColor === 'white' && p === p.toUpperCase()) ||
                (myColor === 'black' && p === p.toLowerCase());
  if (!isOwn) return;

  const moves = getLegalMoves(sq);
  selected = { square: sq, moves };
  renderBoard(roomInfo.fen);
}

// ─── Move history ─────────────────────────────────────────────────────────
function renderHistory(history) {
  moveListEl.innerHTML = '';
  history.forEach((move) => {
    const li = document.createElement('li');
    li.textContent = move.san;
    moveListEl.appendChild(li);
  });
  moveListEl.scrollTop = moveListEl.scrollHeight;
}

// ─── Captured pieces ──────────────────────────────────────────────────────
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function updateCaptured() {
  if (!roomInfo) return;
  const history = roomInfo.history || [];
  const whiteCaptured = [];
  const blackCaptured = [];

  history.forEach((move) => {
    if (move.captured) {
      const cap = move.captured.toLowerCase();
      if (move.color === 'w') whiteCaptured.push(PIECES[move.captured] || move.captured);
      else blackCaptured.push(PIECES[move.captured.toUpperCase()] || move.captured);
    }
  });

  capturedWhite.textContent = whiteCaptured.join(' ');
  capturedBlack.textContent = blackCaptured.join(' ');
}
