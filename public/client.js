const socket = io();

const term = new Terminal({
  cursorBlink: true,
  fontSize: 14,
  fontFamily: "monospace",
  theme: {
    background: "#000000",
    foreground: "#00FF00"
  }
});

const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);

term.open(document.getElementById("terminal"));
fitAddon.fit(); // ปรับขนาดให้พอดอ

// ปรับขนาดอัตโนมัติเมื่อหมุนจอ
window.addEventListener("resize", () => {
  fitAddon.fit();
});

term.onData(data => {
  socket.emit("input", data);
});

socket.on("output", data => {
  term.write(data);
});