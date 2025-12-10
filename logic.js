function idToRC(id) {
  const n = parseInt(id.slice(1), 10); 
  const row = Math.floor(n / 100);     
  const col = n % 10;                  
  return { row, col };
}

function rcToId(row, col) {
  if (row < 1 || row > 8 || col < 1 || col > 8) return null;
  return `b${row}0${col}`;
}

const squares = {};
document.querySelectorAll('.box').forEach(box => squares[box.id] = box);

function insertImage() {
  Object.values(squares).forEach(el => {
    const text = (el.innerText || "").trim();
    if (!text) {
      el.innerHTML = "";
      el.style.cursor = 'default';
      return;
    }
    el.innerHTML = `${text} <img class='all-img' src="${text}.png" alt="">`;
    el.style.cursor = 'pointer';
  });
}

function coloring() {
  Object.values(squares).forEach(el => {
    const { row, col } = idToRC(el.id);
    const sum = row + col;
    el.style.backgroundColor = (sum % 2 === 0) ? 'rgb(232 235 239)' : 'rgb(125 135 150)';
  });
}

coloring();
insertImage();

function buildBoardFromDom() {
  const board = {}; 
  for (let r = 1; r <= 8; r++) {
    for (let c = 1; c <= 8; c++) {
      const id = rcToId(r, c);
      const el = squares[id];
      board[`${r},${c}`] = (el && el.innerText) ? el.innerText.trim() : "";
    }
  }
  return board;
}

function cloneBoard(board) {
  return JSON.parse(JSON.stringify(board));
}

function isInside(r, c) { return r >= 1 && r <= 8 && c >= 1 && c <= 8; }

function generateMovesFor(board, r, c) {
  const piece = board[`${r},${c}`];
  if (!piece) return [];
  const color = piece[0]; 
  const type = piece.slice(1).toLowerCase(); 
  const moves = [];

  if (type === 'pawn') {
    const dir = (color === 'W') ? 1 : -1; 
    const startRow = (color === 'W') ? 2 : 7;
    if (isInside(r + dir, c) && !board[`${r + dir},${c}`]) {
      moves.push({ r: r + dir, c });
      if (r === startRow && !board[`${r + 2*dir},${c}`]) moves.push({ r: r + 2*dir, c });
    }
    [[r + dir, c - 1], [r + dir, c + 1]].forEach(([rr, cc]) => {
      if (isInside(rr, cc) && board[`${rr},${cc}`] && board[`${rr},${cc}`][0] !== color) moves.push({ r: rr, c: cc });
    });
  }

  if (type === 'knight') {
    const deltas = [[2,1],[1,2],[-1,2],[-2,1],[-2,-1],[-1,-2],[1,-2],[2,-1]];
    deltas.forEach(([dr, dc]) => {
      const rr = r + dr, cc = c + dc;
      if (isInside(rr, cc) && (!board[`${rr},${cc}`] || board[`${rr},${cc}`][0] !== color)) moves.push({ r: rr, c: cc });
    });
  }

  if (type === 'king') {
    for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) {
      if (dr===0 && dc===0) continue;
      const rr = r + dr, cc = c + dc;
      if (isInside(rr, cc) && (!board[`${rr},${cc}`] || board[`${rr},${cc}`][0] !== color)) moves.push({ r: rr, c: cc });
    }
  }

  const slide = (dirs) => {
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (isInside(rr, cc)) {
        const t = board[`${rr},${cc}`];
        if (!t) moves.push({ r: rr, c: cc });
        else { if (t[0] !== color) moves.push({ r: rr, c: cc }); break; }
        rr += dr; cc += dc;
      }
    }
  };

  if (type === 'rook') slide([[1,0],[-1,0],[0,1],[0,-1]]);
  if (type === 'bishop') slide([[1,1],[1,-1],[-1,1],[-1,-1]]);
  if (type === 'queen') slide([[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);

  return moves;
}

function isSquareAttacked(board, r, c, attackerColor) {
  for (let row=1; row<=8; row++) for (let col=1; col<=8; col++) {
    const piece = board[`${row},${col}`];
    if (!piece || piece[0] !== attackerColor) continue;
    if (generateMovesFor(board,row,col).some(mv => mv.r===r && mv.c===c)) return true;
  }
  return false;
}

function findKing(board, color) {
  for (let r=1; r<=8; r++) for (let c=1; c<=8; c++)
    if (board[`${r},${c}`] === `${color}king`) return { r, c };
  return null;
}

function isInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return true;
  const opponent = (color === 'W') ? 'B' : 'W';
  return isSquareAttacked(board, king.r, king.c, opponent);
}

function legalMoves(board, r, c) {
  const piece = board[`${r},${c}`];
  if (!piece) return [];
  const color = piece[0];
  return generateMovesFor(board,r,c).filter(mv => {
    const b2 = cloneBoard(board);
    b2[`${mv.r},${mv.c}`] = piece;
    b2[`${r},${c}`] = "";
    return !isInCheck(b2, color);
  });
}

function sideHasAnyLegalMove(board, color) {
  for (let r=1;r<=8;r++) for (let c=1;c<=8;c++)
    if (board[`${r},${c}`]?.[0] === color && legalMoves(board,r,c).length>0) return true;
  return false;
}

let turn = 'W';
const togText = document.getElementById('tog');

function updateTurnText() {
  togText.innerText = turn === 'W' ? "White's Turn" : "Black's Turn";
}
updateTurnText();

function clearHighlights() { coloring(); }

function showLegalMovesFor(r,c) {
  clearHighlights();
  const moves = legalMoves(buildBoardFromDom(), r, c);
  const srcId = rcToId(r,c);
  if (srcId) squares[srcId].style.backgroundColor = 'blue';
  moves.forEach(mv => { const id = rcToId(mv.r,mv.c); if(id) squares[id].style.backgroundColor = 'greenyellow'; });
}

let selected = null;

Object.values(squares).forEach(el => {
  el.addEventListener('click', () => {
    const { row, col } = idToRC(el.id);
    const board = buildBoardFromDom();
    const clickedPiece = board[`${row},${col}`];

    if (el.style.backgroundColor==='greenyellow' && selected) {
      const newBoard = cloneBoard(board);
      newBoard[`${row},${col}`] = selected.piece;
      newBoard[`${selected.r},${selected.c}`] = "";
      pushBoardToDom(newBoard);

      turn = turn==='W'?'B':'W';
      updateTurnText();

      const boardAfter = buildBoardFromDom();
      const sideInCheck = isInCheck(boardAfter, turn);

      highlightCheck(sideInCheck); // <-- RED BOARD IF CHECK
      if(sideInCheck) togText.innerText = turn==='W'?"White is in CHECK!":"Black is in CHECK!";

      if(!sideHasAnyLegalMove(boardAfter, turn)) {
        if(sideInCheck) setTimeout(()=>alert(`CHECKMATE! ${(turn==='W')?'Black':'White'} wins!`),10);
        else setTimeout(()=>alert(`Stalemate!`),10);
      }

      selected=null;
      clearHighlights();
      insertImage();
      return;
    }

    if(clickedPiece && clickedPiece[0]===turn) {
      if(legalMoves(board,row,col).length>0){ selected={r:row,c:col,piece:clickedPiece}; showLegalMovesFor(row,col); }
      else { selected=null; clearHighlights(); }
      return;
    }

    selected=null; clearHighlights();
  });
});

document.getElementById("reset-btn").addEventListener("click",()=>location.reload());
insertImage();
coloring();

function highlightCheck(isCheck) {
  Object.values(squares).forEach(el => {
    const { row, col } = idToRC(el.id);
    const sum = row + col;
    el.style.backgroundColor = isCheck ? 'red' : (sum%2===0?'rgb(232 235 239)':'rgb(125 135 150)');
  });
}

function pushBoardToDom(board) {
  for(let r=1;r<=8;r++) for(let c=1;c<=8;c++){
    const id = rcToId(r,c);
    const el = squares[id];
    el.innerText = board[`${r},${c}`]||"";
  }
  insertImage();
  coloring();
}
