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
  pingTimeout: 60000,
  pingInterval: 25000
});

io.on("connection", (socket) => {
  console.log("User connected");

  const shell = process.platform === "win32" ? "powershell.exe" : "bash";

  const ptyProcess = pty.spawn(shell, [], {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd: __dirname,   // ให้ shell ใช้โฟลเดอร์เดียวกับ serverHOME,
    env: {
      ...process.env,
      TERM: "xterm-256color"
    }
  });

  let nanoActive = false;

  // ส่ง output ไปหน้าเว็บ
  ptyProcess.on("data", (data) => {
  socket.emit("output", data);

  // เข้า nano
  if (data.includes("GNU nano")) {
    socket.emit("nano-start");
  }

  // ออกจาก nano (Ctrl+X)
  if (data.includes("Save modified buffer") ||
      data.includes("File Name to Write") ||
      data.includes("Exit")) {
    socket.emit("nano-end");
  }
});

  // ถ้า process ปิด ให้ตัดการเชื่อมต่อ
  ptyProcess.on("exit", () => {
    console.log("PTY exited");
    try { socket.disconnect(true); } catch {}
  });

  // รับ input จาก client
  socket.on("input", (data) => {
    try {
      ptyProcess.write(data);
    } catch (e) {
      console.log("Write error:", e.message);
    }
  });

  // resize terminal
  socket.on("resize", ({ cols, rows }) => {
    try {
      ptyProcess.resize(cols, rows);
    } catch (e) {
      console.log("Resize error:", e.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    try { ptyProcess.kill(); } catch {}
  });
});

/* ===== กัน server crash ===== */
process.on("uncaughtException", (err) =>
  console.error("Uncaught Exception:", err)
);

process.on("unhandledRejection", (err) =>
  console.error("Unhandled Rejection:", err)
);

const path = require("path");
const fs = require("fs");

app.get("/download", (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).send("No file path");

  const baseDir = __dirname; // /app

  const fullPath = require("path").resolve(baseDir, filePath);

  if (!fullPath.startsWith(baseDir + require("path").sep)) {
    return res.status(403).send("Access denied");
  }

  const fs = require("fs");

  if (!fs.existsSync(fullPath)) {
    return res.status(404).send("File not found");
  }

  if (!fs.statSync(fullPath).isFile()) {
    return res.status(400).send("Not a file");
  }

  res.download(fullPath, require("path").basename(fullPath));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log("Server running on port " + PORT);
});
