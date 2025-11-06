// ======================================================
// 📡 BlinkPro Master Server — compatible con Render.com
// ======================================================
import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// =============================
// 🗃️ Almacenamiento en memoria
// =============================
const devices = {}; // { deviceId: { model, sdk, online, sessionTime, lastSeen } }
const panels = new Set(); // conexiones del dashboard

// =============================
// 🌐 Servir archivos estáticos
// =============================
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (_, res) => res.redirect("/index.html"));

// =============================
// 🔌 Manejador de conexiones WS
// =============================
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const key = url.searchParams.get("key");

  if (key === "blinkpro-secure-key") {
    // App Android (cliente)
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, "device");
    });
  } else if (key === "panel") {
    // Panel del navegador
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, "panel");
    });
  } else {
    socket.destroy(); // 🔒 Rechazar conexiones no autorizadas
  }
});

// =============================
// 🔁 Manejador de eventos WS
// =============================
wss.on("connection", (ws, req, type) => {
  if (type === "device") {
    console.log("📱 Dispositivo conectado");

    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        const id = data.deviceId || "unknown";

        devices[id] = {
          model: data.model,
          sdk: data.sdk,
          online: data.online,
          sessionTime: data.sessionTime,
          lastSeen: new Date().toLocaleTimeString(),
        };

        broadcastToPanels({
          type: "updateDevices",
          devices,
        });
      } catch (e) {
        console.error("⚠️ Error procesando mensaje WS:", e.message);
      }
    });

    ws.on("close", () => {
      console.log("❌ Dispositivo desconectado");
      for (const [id, dev] of Object.entries(devices)) {
        if (dev.online) dev.online = false;
      }
      broadcastToPanels({ type: "updateDevices", devices });
    });

    ws.on("error", (err) => {
      console.error("🚨 Error en conexión WS:", err.message);
    });
  }

  if (type === "panel") {
    console.log("🖥️ Panel conectado");
    panels.add(ws);
    ws.send(JSON.stringify({ type: "updateDevices", devices }));

    ws.on("close", () => panels.delete(ws));
  }
});

// =============================
// 📤 Broadcast global
// =============================
function broadcastToPanels(data) {
  const payload = JSON.stringify(data);
  for (const ws of panels) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

// =============================
// 💓 KeepAlive automático Render
// =============================
if (process.env.KEEPALIVE === "true") {
  setInterval(() => {
    fetch("https://blinkpro-master.onrender.com")
      .then((res) => console.log("💓 KeepAlive:", res.status))
      .catch((err) => console.log("⚠️ Fallo KeepAlive:", err.message));
  }, 240000); // cada 4 minutos
}

// =============================
// 🚀 Iniciar servidor
// =============================
const PORT = process.env.PORT || 10000;
server.listen(PORT, () =>
  console.log(`🚀 BlinkPro Master corriendo en puerto ${PORT}`)
);
