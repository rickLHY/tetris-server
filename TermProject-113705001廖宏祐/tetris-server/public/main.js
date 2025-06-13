const rankPanel = document.getElementById("rankPanel");
const rankButton = document.getElementById("rankButton");
const gameElements = [
  document.getElementById("tetris"),
  document.getElementById("prelook"),
  document.getElementById("scoreDisplay"),
  document.getElementById("timerDisplay"),
  document.getElementById("Level")
];

//音樂-------------------------------------------------------------------------------
const musicFiles = [
    "Musics/SANABI.mp3",  // 確保資料夾與檔名正確
    "Musics/masshiro.mp3",
    "Musics/蕭煌奇 Ricky Hsiao〈 你攏無咧看〉Official Music Video.mp3"
];

const randomIndex = Math.floor(Math.random() * musicFiles.length);
const selectedMusic = musicFiles[randomIndex];

const player = document.getElementById("bgmPlayer");
player.src = selectedMusic;
player.volume = 0.5;
// 播放監聽
player.addEventListener("play", () => {
    console.log("🎵 音樂正在播放：" + selectedMusic);
});

// 錯誤偵測
player.addEventListener("error", () => {
    const error = player.error;
    if (error) {
        switch (error.code) {
            case error.MEDIA_ERR_ABORTED:
                console.error("音訊載入中止");
                break;
            case error.MEDIA_ERR_NETWORK:
                console.error("網路錯誤，無法載入音訊");
                break;
            case error.MEDIA_ERR_DECODE:
                console.error("音訊解碼錯誤，可能是損壞或格式不支援");
                break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                console.error("音訊來源不支援或找不到檔案：" + player.src);
                break;
            default:
                console.error("未知錯誤，代碼：" + error.code);
        }
    }
});

// 瀏覽器阻擋播放：等使用者互動後再播一次
document.addEventListener("click", () => {
    if (player.paused) {
        player.play().then(() => {
            console.log("🎵 使用者互動後成功播放音樂");
        }).catch(err => {
            console.warn("⚠️ 互動後仍無法播放音樂", err);
        });
    }
}, { once: true });

// 初始化區塊 ------------------------------------------------------------
let score = 0;
let gameSpeed = 500;
let level = 1;
let startTime = Date.now();

const canvas = document.getElementById("tetris");
const canvassmall = document.getElementById("prelook");
const context = canvas.getContext("2d");
const contextsmall = canvassmall.getContext("2d");

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
context.scale(BLOCK_SIZE, BLOCK_SIZE);
contextsmall.scale(BLOCK_SIZE, BLOCK_SIZE);

let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

// 區塊形狀 ------------------------------------------------------------
const SHAPES = [
  [],
  [[0, 1, 0], 
   [1, 1, 1], 
   [0, 0, 0]],        // T
  [[1, 1], 
   [1, 1]],  // O
  [[0, 1, 1], 
   [1, 1, 0], 
   [0, 0, 0]],        // S
  [[1, 1, 0], 
   [0, 1, 1], 
   [0, 0, 0]],        // Z
  [[1, 0, 0], 
   [1, 1, 1], 
   [0, 0, 0]],     // J
  [[0, 0, 1], 
   [1, 1, 1], 
   [0, 0, 0]], // L
  [[0, 0, 0, 0], 
   [1, 1, 1, 1], 
   [0, 0, 0, 0], 
   [0, 0, 0, 0]] // I
];

// 工具函式 ------------------------------------------------------------
function randomShape() {
  const index = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
  return SHAPES[index];
}

function drawBlock(x, y, color) {
  context.fillStyle = color;
  context.fillRect(x, y, 1, 1);
  context.strokeStyle = "#222";
  context.strokeRect(x, y, 1, 1);
}

function drawBlocksmall(x, y, color) {
  contextsmall.fillStyle = color;
  contextsmall.fillRect(x, y, 1, 1);
  contextsmall.strokeStyle = "#222";
  contextsmall.strokeRect(x, y, 1, 1);
}

function drawShape(shape, offsetX, offsetY, color) {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) drawBlock(offsetX + x, offsetY + y, color);
    }
  }
}

function drawShapesmall(shape, offsetX, offsetY, color) {
  contextsmall.clearRect(0, 0, 4 * BLOCK_SIZE, 4 * BLOCK_SIZE);
  drawGridsmall();
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) drawBlocksmall(offsetX + x, offsetY + y, color);
    }
  }
}

function drawGrid() {
  context.strokeStyle = "#333";
  context.lineWidth = 0.05;
  for (let x = 0; x <= COLS; x++) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, ROWS);
    context.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(COLS, y);
    context.stroke();
  }
}

function drawGridsmall() {
  contextsmall.strokeStyle = "#333";
  contextsmall.lineWidth = 0.05;
  for (let x = 0; x <= 4; x++) {
    contextsmall.beginPath();
    contextsmall.moveTo(x, 0);
    contextsmall.lineTo(x, 4);
    contextsmall.stroke();
  }
  for (let y = 0; y <= 4; y++) {
    contextsmall.beginPath();
    contextsmall.moveTo(0, y);
    contextsmall.lineTo(4, y);
    contextsmall.stroke();
  }
}

function collision(shape, offsetX, offsetY) {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const newX = offsetX + x;
        const newY = offsetY + y;
        if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
        if (newY >= 0 && board[newY][newX]) return true;
      }
    }
  }
  return false;
}

function merge(shape, offsetX, offsetY) {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) board[offsetY + y][offsetX + x] = 1;
    }
  }
}

function clearLines() {
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every(cell => cell !== 0)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(0));
      y++;
      score += 100;
      playSound("clear")
    }
  }
  updatelow();
}

function LevelUp() {
  let newLevel = Math.floor(score / 1000) + 1;
  if (newLevel > level) {
    level = newLevel;
    clearInterval(gameLoop);
    gameSpeed = Math.max(100, gameSpeed - 50);
    gameLoop = setInterval(update, gameSpeed);
  }
  document.getElementById("Level").textContent = `Level: ${level}`;
}

function updatelow() {
  context.fillStyle = "#000";
  context.fillRect(0, 0, COLS, ROWS);
  drawGrid();
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x]) drawBlock(x, y, "#1F7F6C");
    }
  }
  drawShape(currentShape, posX, posY, "#1F7F6C");
}

function rotate(shape) {
  const N = shape.length;
  const newShape = [];
  for (let y = 0; y < N; y++) {
    newShape[y] = [];
    for (let x = 0; x < N; x++) {
      newShape[y][x] = shape[N - x - 1][y];
    }
  }
  return newShape;
}

// 鍵盤控制 ------------------------------------------------------------
document.addEventListener("keydown", (event) => {
    if(!paused){
        if (event.key === "ArrowLeft" && !collision(currentShape, posX - 1, posY)) {
          posX--;
          playSound("move");
        }
        else if (event.key === "ArrowRight" && !collision(currentShape, posX + 1, posY)){
            posX++;
            playSound("move");
        } 
        else if (event.key === "ArrowDown" && !collision(currentShape, posX, posY + 1)) {
            posY++;
        }
        else if (event.key === "ArrowUp") {
            const rotated = rotate(currentShape);
            if (!collision(rotated, posX, posY)) currentShape = rotated;
            playSound("move");
        }
        updatelow();
        clearLines();
    }
});

// 遊戲主循環 ------------------------------------------------------------
let currentShape = randomShape();
let nextShape = randomShape();
let posX = 3;
let posY = 0;
let gameLoop =null;

function update() {
    if(!paused){
        if (!collision(currentShape, posX, posY + 1)) posY++;
        else {
            merge(currentShape, posX, posY);
            clearLines();
            currentShape = nextShape;
            nextShape = randomShape();
            drawShapesmall(nextShape, 0, 0, "#1F7F6C");
            posX = 3;
            posY = 0;
            if (collision(currentShape, posX, posY)) {
              const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
              playSound("gameover");
              document.getElementById("gameOverPanel").classList.remove("hidden");
              clearInterval(gameLoop);

            }
        }
          

        context.fillStyle = "#000";
        context.fillRect(0, 0, COLS, ROWS);
        drawGrid();
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
            if (board[y][x]) drawBlock(x, y, "#1F7F6C");
            }
        }
        drawShape(currentShape, posX, posY, "#1F7F6C");
        document.getElementById("scoreDisplay").textContent = `Score: ${score}`;
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        document.getElementById("timerDisplay").textContent = `Time: ${elapsedTime}s`;
        LevelUp();
    }
}        

function start() {
  context.fillStyle = "#000";
  context.fillRect(0, 0, COLS, ROWS);
  drawGrid();
  drawGridsmall();
  drawShapesmall(nextShape, 0, 0, "#1F7F6C");
  gameLoop = setInterval(update, 500);
}

// 排行榜功能 ------------------------------------------------------------
function showRank() {
  fetch('http://140.113.65.41:3000/rank')
    .then(res => res.json())
    .then(rankData => {
      const rankList = document.getElementById("rankList");
      rankList.innerHTML = "";
      rankData.forEach((entry, index) => {
        const li = document.createElement("li");
        li.textContent = `${index + 1}. ${entry.name} - ${entry.score}分 (${entry.time}s)`;
        rankList.appendChild(li);
      });
    });
}

window.addEventListener("DOMContentLoaded", () => {
    rankButton.addEventListener("click", () => {
        const isHidden = rankPanel.classList.contains("hidden");
        if (isHidden) {
            paused = true; // 自動暫停
            gameElements.forEach(el => el.style.display = "none");
            showRank();
            rankPanel.classList.remove("hidden");
        } else {
            gameElements.forEach(el => el.style.display = "");
            rankPanel.classList.add("hidden");
        }
    });
});

//鍵盤行為綁定
const pauseBtn = document.getElementById("btnPause");
let paused = false;

document.getElementById("btnUp").addEventListener("click", () => handleInput("ArrowUp"));
document.getElementById("btnDown").addEventListener("click", () => handleInput("ArrowDown"));
document.getElementById("btnLeft").addEventListener("click", () => handleInput("ArrowLeft"));
document.getElementById("btnRight").addEventListener("click", () => handleInput("ArrowRight"));
pauseBtn.addEventListener("click", () => togglePause());

function handleInput(key) {
   document.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

function togglePause() {
    paused = !paused;
    // 自行設計 paused 時不執行 loop 邏輯
}

//音效-----------------------------------------------------------------------------

const sounds = {
    clear: new Audio("sounds/clear.mp3"),
    move: new Audio("sounds/move.mp3"),
    gameover: new Audio("sounds/gameover.mp3"),
};
sounds.clear.volume = 0.05;   
sounds.move.volume = 0.05;
sounds.gameover.volume = 0.2; 

function playSound(name) {
    if (sounds[name]) {
      sounds[name].currentTime = 0; 
      sounds[name].play();
    }
}


document.getElementById("startBtn").addEventListener("click", () => {
  // 隱藏按鈕
  document.getElementById("startBtn").style.display = "none";

  // 播放背景音樂
  player.play().then(() => {
    console.log("✅ 背景音樂播放成功");
  }).catch(err => {
    console.warn("⚠️ 音樂播放失敗", err);
  });
  start();
  // 開始主遊戲迴圈
  startTime = Date.now(); // 重設開始時間
  score = 0;
});

function resetGame() {
    // 重設遊戲參數
    score = 0;
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    currentShape = randomShape();
    nextShape = randomShape();
    posX = 3;
    posY = 0;
    startTime = Date.now();
    document.getElementById("scoreDisplay").textContent = `Score: 0`;
    document.getElementById("timerDisplay").textContent = `Time: 0s`;
    paused = false;

    // 清除畫面並畫出初始狀態
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawShape(currentShape, posX, posY, "#1F7F6C");
    drawShapesmall(nextShape, 0, 0, "#1F7F6C");

    // 重新啟動 gameLoop
    clearInterval(gameLoop);
    gameLoop = setInterval(update, 500);

    rankPanel.classList.add("hidden");
}

function submitScore() {
  const name = document.getElementById("playerName").value.trim();
  const elapsedTime = Math.floor((Date.now() - startTime) / 1000);

  if (name) {
    saveScoreToRank(score, elapsedTime, name);
  }
}



function restartGame() {
  document.getElementById("gameOverPanel").classList.add("hidden");
  resetGame(); // 正確拼法
}

function saveScoreToRank(score, time, name) {
  const isValid = /^[\u4e00-\u9fa5a-zA-Z0-9_]{1,15}$/.test(name);
  if (!isValid) {
    alert("⚠️ 名字不合法！請使用中英文、數字或底線，最多15字");
    return;
  }


  fetch('http://140.113.65.41:3000/rank')
    .then(res => res.json())
    .then(data => {
      const nameExists = data.some(entry => entry.name === name);
      if (nameExists) {
        alert("此名字已經存在排行榜中，請換一個！");
        return;
      }

      return fetch('http://140.113.65.41:3000/rank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, score, time })
      });
    })
    .then(res => res?.json?.())
    .then(data => {
      if (data) {
        console.log("儲存成功", data);

        gameElements.forEach(el => el.style.display = "none");
        document.getElementById("gameOverPanel").classList.add("hidden");
        showRank();
        rankPanel.classList.remove("hidden");

        setTimeout(() => {
          rankPanel.classList.add("hidden");
          gameElements.forEach(el => el.style.display = "");
          resetGame();
        }, 3000);
      }
    })
    .catch(err => {
      console.error("發生錯誤：", err);
    });
}

//music panel----------------------------------------------------
const musicPanel = document.getElementById("musicPanel");
const musicList = document.getElementById("musicList");
const currentMusicText = document.getElementById("currentMusic");
const volumeControl = document.getElementById("volumeControl");


let currentTrack = 0;
player.src = musicFiles[currentTrack];
player.volume = 0.5;

// 音樂 UI 初始化
function initMusicList() {
  musicFiles.forEach((file, index) => {
    const li = document.createElement("li");
    const name = file.split("/").pop().replace(".mp3", "");
    li.textContent = name;
    li.addEventListener("click", () => {
      currentTrack = index;
      player.src = musicFiles[currentTrack];
      player.play();
      updateCurrentMusicText();
    });
    musicList.appendChild(li);
  });
  updateCurrentMusicText();
}

function updateCurrentMusicText() {
  const name = musicFiles[currentTrack].split("/").pop().replace(".mp3", "");
  currentMusicText.textContent = `正在播放：${name}`;
}

function toggleMusic() {
  musicPanel.classList.toggle("hidden");
}

function togglePlay() {
  if (player.paused) {
    player.play();
  } else {
    player.pause();
  }
}

volumeControl.addEventListener("input", (e) => {
  player.volume = parseFloat(e.target.value);
});

// 初始化一次
window.addEventListener("DOMContentLoaded", () => {
  initMusicList();
});

document.getElementById("HomeButton").addEventListener("click", () => {
  window.location.href = "http://lhy0123.duckdns.org/";
});
