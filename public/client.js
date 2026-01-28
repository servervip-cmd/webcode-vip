const socket = io();
const term = new Terminal({
  cursorBlink: true,
  fontSize: 14
});

term.open(document.getElementById("terminal"));

term.onData(data => {
  socket.emit("input", data);
});

socket.on("output", data => {
  term.write(data);
});