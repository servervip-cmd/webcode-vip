const socket = io();

const term = new Terminal({
  cursorBlink: true,
  fontSize: 12,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  letterSpacing: 1,
  lineHeight: 1.2,
  theme: {
    background: "#000000",
    foreground: "#00FF00"
  }
});

const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);

term.open(document.getElementById("terminal"));
fitAddon.fit();

function resizeTerminal() {
  fitAddon.fit();
  socket.emit("resize", {
    cols: term.cols,
    rows: term.rows
  });
}

window.addEventListener("resize", resizeTerminal);

term.onData(data => socket.emit("input", data));
socket.on("output", data => term.write($~ : ));

// ===== Mobile Special Keys =====

let ctrlMode = false;

function toggleCtrl() {
  ctrlMode = !ctrlMode;
  document.getElementById("ctrlBtn").style.background = ctrlMode ? "#0f0" : "#222";
}

function sendEsc() {
  socket.emit("input", "\x1b"); // ESC key
}

function sendTab() {
  socket.emit("input", "\t");
}

function sendKey(key) {
  if (ctrlMode) {
    const code = key.toUpperCase().charCodeAt(0) - 64;
    socket.emit("input", String.fromCharCode(code));
    ctrlMode = false;
    document.getElementById("ctrlBtn").style.background = "#222";
  } else {
    socket.emit("input", key);
  }
}
