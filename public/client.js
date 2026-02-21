const socket = io();

/* ================= TERMINAL SETUP ================= */

const term = new Terminal({
  cursorBlink: false,
  fontSize: 14,
  lineHeight: 1.1,
  fontFamily: "JetBrains Mono, monospace",
  scrollback: 2000,
  theme: {
    background: "#000000",
    foreground: "#00ff00"
  }
});

const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);

const termElement = document.getElementById("terminal");

term.open(termElement);
fitAddon.fit();

term.textarea.setAttribute("autocapitalize", "off");
term.textarea.setAttribute("autocomplete", "off");
term.textarea.setAttribute("autocorrect", "off");
term.textarea.setAttribute("spellcheck", "false");

/* ================= SMART AUTO SCROLL ================= */

let userScrolledUp = false;

term.onScroll(() => {
  const buffer = term.buffer.active;
  const bottomLine = buffer.baseY + buffer.cursorY;
  const viewBottom = buffer.viewportY + term.rows;
  userScrolledUp = viewBottom < bottomLine - 2;
});

let writeBuffer = "";
let writeScheduled = false;

socket.on("output", data => {
  writeBuffer += data;

  if (!writeScheduled) {
    writeScheduled = true;
    requestAnimationFrame(() => {
      term.write(writeBuffer);
      term.scrollToBottom();
      writeBuffer = "";
      writeScheduled = false;
    });
  }
});

/* ================= INPUT HANDLING ================= */

let ctrlActive = false;

term.onData(data => {
  if (ctrlActive && data.length === 1) {
    const code = data.toUpperCase().charCodeAt(0) - 64;
    if (code > 0 && code < 32) {
      socket.emit("input", String.fromCharCode(code));
    }
    ctrlActive = false;
    updateCtrlButton(false);
  } else {
    socket.emit("input", data);
  }
});

function updateCtrlButton(state) {
  const btn = document.getElementById("ctrlBtn");
  if (!btn) return;
  btn.style.background = state ? "#00ff00" : "black";
  btn.style.color = state ? "black" : "#00ff00";
}

function toggleCtrl() {
  ctrlActive = !ctrlActive;
  updateCtrlButton(ctrlActive);
  keepKeyboardOpen();
}

function sendESC() { 
  socket.emit("input", "\x1b");
  keepKeyboardOpen();
}

function sendTab() { 
  socket.emit("input", "\t");
  keepKeyboardOpen();
}

function sendArrow(dir) {
  const map = {
    up: "\x1b[A",
    down: "\x1b[B",
    right: "\x1b[C",
    left: "\x1b[D"
  };
  if (map[dir]) socket.emit("input", map[dir]);
  keepKeyboardOpen();
}

/* ================= RESIZE TERMINAL ================= */

function resizeTerm() {
  fitAddon.fit();
  socket.emit("resize", {
    cols: term.cols,
    rows: term.rows
  });
}

let resizeTimeout;

window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    fitAddon.fit();
    socket.emit("resize", { cols: term.cols, rows: term.rows });
  }, 120);
});

/* ================= iOS KEYBOARD → CSS VAR ================= */

function updateKeyboardHeight() {
  if (!window.visualViewport) return;

  const kb = Math.max(0, window.innerHeight - window.visualViewport.height);

  // ถ้าคีย์บอร์ดสูงเกิน 120px ค่อยถือว่าเปิดจริง
  const keyboardHeight = kb > 120 ? kb : 0;

  document.documentElement.style.setProperty('--kb-height', keyboardHeight + 'px');

  resizeTerm(); // ให้ terminal คำนวณขนาดใหม่
}

if (window.visualViewport) {
  visualViewport.addEventListener("resize", updateKeyboardHeight);
  visualViewport.addEventListener("scroll", updateKeyboardHeight);
}

window.addEventListener("orientationchange", updateKeyboardHeight);

/* ================= NANO MODE WINDOW ================= */

const nanoOverlay = document.getElementById("nanoOverlay");
const nanoTermDiv = document.getElementById("nano-terminal");
const mainTermDiv = document.getElementById("terminal");

function enterNanoMode() {
  nanoOverlay.classList.remove("hidden");

  // ย้าย terminal ไปอยู่ในหน้าต่าง nano
  nanoTermDiv.appendChild(mainTermDiv);

  setTimeout(forceResize, 120);
}

function exitNanoMode() {
  nanoOverlay.classList.add("hidden");

  // ย้ายกลับจอหลัก
  document.body.appendChild(mainTermDiv);

  setTimeout(forceResize, 120);
}

socket.on("nano-start", enterNanoMode);
socket.on("nano-end", exitNanoMode);

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    socket.emit("input", text);
  } catch (err) {
    alert("ไม่สามารถวางข้อความได้ เบราว์เซอร์อาจไม่อนุญาต");
  }
}

function keepKeyboardOpen() {
  term.focus();   // บังคับโฟกัสกลับไปที่ xterm
}

function updateLayoutVars() {
  const toolbar = document.getElementById("toolbar");
  if (!toolbar) return;

  // วัดความสูง toolbar จริงจาก DOM
  const toolbarHeight = toolbar.offsetHeight;
  document.documentElement.style.setProperty('--toolbar-height', toolbarHeight + 'px');

  if (!window.visualViewport) return;

  const kb = Math.max(0, window.innerHeight - window.visualViewport.height);
  const keyboardHeight = kb > 120 ? kb : 0;

  document.documentElement.style.setProperty('--kb-height', keyboardHeight + 'px');

  resizeTerm(); // ให้ xterm คำนวณขนาดใหม่
}

if (window.visualViewport) {
  visualViewport.addEventListener("resize", updateLayoutVars);
  visualViewport.addEventListener("scroll", updateLayoutVars);
}

window.addEventListener("resize", updateLayoutVars);
window.addEventListener("orientationchange", updateLayoutVars);
window.addEventListener("load", updateLayoutVars);