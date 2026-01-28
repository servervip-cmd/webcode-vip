const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const pty = require("node-pty");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.static("public"));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  pingTimeout: 60000,     // กันหลุดง่าย
  pingInterval: 25000
});

io.on("connection", (socket) => {
  console.log("User connected");

  const shell = process.platform === "win32" ? "powershell.exe" : "bash";

  const ptyProcess = pty.spawn(shell, [], {
    name: "xterm-color",
    cols: 80,
    rows: 24,
    cwd: process.env.HOME,
    env: process.env
  });

  // ป้องกันโปรเซสค้าง
  ptyProcess.on("exit", () => {
    socket.disconnect(true);
  });

  ptyProcess.on("data", (data) => {
    socket.emit("output", data);
  });

  socket.on("input", (data) => {
    try {
      ptyProcess.write(data);
    } catch (e) {
      console.log("Write error:", e.message);
    }
  });

  socket.on("disconnect", () => {
    try { ptyProcess.kill(); } catch {}
    console.log("User disconnected");
  });
});

// กันเซิร์ฟเวอร์ crash
process.on("uncaughtException", err => console.error("Uncaught:", err));
process.on("unhandledRejection", err => console.error("Unhandled:", err));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
