const socket = io();

const term = new Terminal({
  cursorBlink: true,
  fontSize: 14,
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
term.onData(data => socket.emit("input", data));

function sendESC() { term.write("\x1b"); }
function sendTab() { term.write("\t"); }

let ctrlDown = false;
function toggleCtrl() { ctrlDown = !ctrlDown; }

function sendKey(k) {
  if (ctrlDown) {
    term.write(String.fromCharCode(k.charCodeAt(0) - 96));
    ctrlDown = false;
  } else {
    term.write(k);
  }
}
function toggleFull() {
  const termDiv = document.getElementById("terminal");
  termDiv.classList.toggle("fullscreen-terminal");

  setTimeout(() => {
    fitAddon.fit();
    socket.emit("resize", {
      cols: term.cols,
      rows: term.rows
    });
  }, 100);
}

window.addEventListener("resize", () => {
  fitAddon.fit();
  socket.emit("resize", {
    cols: term.cols,
    rows: term.rows
  });
});
