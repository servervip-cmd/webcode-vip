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

term.open(termElement);
fitAddon.fit();

/* ================= SMART AUTO SCROLL ================= */

let userScrolledUp = false;

term.onScroll(() => {
  const buffer = term.buffer.active;
  const bottomLine = buffer.baseY + buffer.cursorY;
  const viewBottom = buffer.viewportY + term.rows;
  userScrolledUp = viewBottom < bottomLine - 2;
});

socket.on("output", data => {
  const shouldScroll = !userScrolledUp;
  term.write(data);
  if (shouldScroll) term.scrollToBottom();
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

/* ================= iOS KEYBOARD → CSS VAR ================= */

function updateKeyboardHeight() {
  if (!window.visualViewport) return;

  const keyboardHeight = window.innerHeight - window.visualViewport.height;

  document.documentElement.style.setProperty(
    "--kb-height",
    keyboardHeight > 100 ? keyboardHeight + "px" : "0px"
  );

  resizeTerm();
}

if (window.visualViewport) {
  visualViewport.addEventListener("resize", updateKeyboardHeight);
  visualViewport.addEventListener("scroll", updateKeyboardHeight);
}

window.addEventListener("load", updateKeyboardHeight);

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