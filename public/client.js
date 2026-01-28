const socket = io();

/* ================= TERMINAL SETUP ================= */

const term = new Terminal({
  cursorBlink: true,
  fontSize: 12,
  lineHeight: 1.1,
  fontFamily: "JetBrains Mono, monospace",
  scrollback: 5000,
  theme: {
    background: "#000000",
    foreground: "#00ff00"
  }
});

const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);

const termElement = document.getElementById("terminal");
const toolbar = document.getElementById("toolbar");

term.open(termElement);
fitAddon.fit();

/* ================= AUTO SCROLL ================= */

socket.on("output", data => {
  term.write(data);
  term.scrollToBottom();
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
}

function sendESC() { socket.emit("input", "\x1b"); }
function sendTab() { socket.emit("input", "\t"); }

function sendArrow(dir) {
  const map = {
    up: "\x1b[A",
    down: "\x1b[B",
    right: "\x1b[C",
    left: "\x1b[D"
  };
  if (map[dir]) socket.emit("input", map[dir]);
}

/* ================= RESIZE TERMINAL ================= */

function resizeTerm() {
  fitAddon.fit();
  socket.emit("resize", {
    cols: term.cols,
    rows: term.rows
  });
}

window.addEventListener("resize", resizeTerm);

/* ===== Detect iOS keyboard and lift toolbar ===== */
if (window.visualViewport) {
  const vv = window.visualViewport;

  function adjustForKeyboard() {
    const keyboardHeight = window.innerHeight - vv.height;

    if (keyboardHeight > 150) {
      document.body.classList.add("keyboard-open");
      document.getElementById("toolbar").style.transform =
        `translateY(-${keyboardHeight}px)`;
    } else {
      document.body.classList.remove("keyboard-open");
      document.getElementById("toolbar").style.transform = "translateY(0)";
    }

    resizeTerm();
  }

  vv.addEventListener("resize", adjustForKeyboard);
}

/* ================= NANO MODE WINDOW ================= */

function enterNanoMode() {
  if (!document.querySelector(".nano-frame")) {
    const frame = document.createElement("div");
    frame.className = "nano-frame";
    termElement.parentNode.insertBefore(frame, termElement);
    frame.appendChild(termElement);
    setTimeout(resizeTerm, 80);
  }
}

function exitNanoMode() {
  const frame = document.querySelector(".nano-frame");
  if (frame) {
    frame.parentNode.insertBefore(termElement, frame);
    frame.remove();
    setTimeout(resizeTerm, 80);
  }
}

socket.on("nano-start", enterNanoMode);
socket.on("nano-end", exitNanoMode);

/* ===== iOS KEYBOARD FIX (สำคัญสุด) ===== */

function adjustTerminalForKeyboard() {
  if (!window.visualViewport) return;

  const vv = window.visualViewport;
  const keyboardHeight = window.innerHeight - vv.height;
  const toolbar = document.getElementById("toolbar");
  const termEl = document.getElementById("terminal");

  if (keyboardHeight > 150) {
    // คีย์บอร์ดเปิด
    document.body.classList.add("keyboard-open");

    // เลื่อน toolbar ขึ้น
    toolbar.style.transform = `translateY(-${keyboardHeight}px)`;

    // ลดความสูง terminal
    termEl.style.height = `calc(100vh - ${keyboardHeight + toolbar.offsetHeight}px)`;

  } else {
    // คีย์บอร์ดปิด
    document.body.classList.remove("keyboard-open");
    toolbar.style.transform = "translateY(0)";
    termEl.style.height = "100%";
  }

  resizeTerm(); // สำคัญมาก ให้ terminal คำนวณขนาดใหม่
}

if (window.visualViewport) {
  visualViewport.addEventListener("resize", adjustTerminalForKeyboard);
}
