import express from "express";
import http from "http";
import { Server } from "socket.io";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// 🔹 Mapa de dispositivos conectados
const devices = {};

// 🔹 Servidor WebSocket (para la app Android)
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("📱 Dispositivo conectado");

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      const id = data.deviceId || "unknown";
      devices[id] = {
        ...data,
        lastSeen: new Date().toLocaleTimeString(),
        online: true
      };

      // Emitir actualización al panel web
      io.emit("updateDevices", devices);
    } catch (err) {
      console.error("❌ Error al procesar mensaje:", err.message);
    }
  });

  ws.on("close", () => {
    for (const id in devices) {
      devices[id].online = false;
    }
    io.emit("updateDevices", devices);
  });
});

// 🔹 Servidor HTTP para el panel web
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
});

// 🔹 Escuchar en Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 BlinkPro Master corriendo en puerto ${PORT}`));
