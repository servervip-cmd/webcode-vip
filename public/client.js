const socket = io();

const term = new Terminal({
  cursorBlink: true,
  fontSize: 14,
  fontFamily: "monospace",
  scrollback: 1000
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
socket.on("output", data => term.write(data));