const socket = io();

const term = new Terminal({
  cursorBlink: true,
  fontSize: 10,
  lineHeight: 1.1,
  fontFamily: "monospace",
  theme: {
    background: "#000000",
    foreground: "#00ff00"
  }
});

const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);

term.open(document.getElementById("terminal"));
fitAddon.fit();

socket.on("output", data => term.write(data));

/* ================= INPUT HANDLING ================= */

let ctrlActive = false;

// รับปุ่มจากคีย์บอร์ดจริง
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

/* ================= TOOLBAR BUTTONS ================= */

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

function sendESC() {
  socket.emit("input", "\x1b");
}

function sendTab() {
  socket.emit("input", "\t");
}

function sendArrow(dir) {
  const map = {
    up: "\x1b[A",
    down: "\x1b[B",
    right: "\x1b[C",
    left: "\x1b[D"
  };

  if (map[dir]) {
    socket.emit("input", map[dir]);
  }
}

/* ================= RESIZE HANDLING ================= */

function resizeTerm() {
  fitAddon.fit();
  socket.emit("resize", {
    cols: term.cols,
    rows: term.rows
  });
}

window.addEventListener("resize", resizeTerm);

/* ================= NANO WINDOW MODE ================= */

const termContainer = document.getElementById("terminal");

function enterNanoMode() {
  if (!document.querySelector(".nano-frame")) {
    const frame = document.createElement("div");
    frame.className = "nano-frame";
    termContainer.parentNode.insertBefore(frame, termContainer);
    frame.appendChild(termContainer);
    setTimeout(resizeTerm, 50);
  }
}

function exitNanoMode() {
  const frame = document.querySelector(".nano-frame");
  if (frame) {
    frame.parentNode.insertBefore(termContainer, frame);
    frame.remove();
    setTimeout(resizeTerm, 50);
  }
}

socket.on("nano-start", enterNanoMode);
socket.on("nano-end", exitNanoMode);
