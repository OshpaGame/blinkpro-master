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

// Para leer JSON en las rutas REST (OTA)
app.use(express.json());

// =============================
// 🗃️ Estado en memoria
// =============================
// Estructura: devices[deviceId] = {
//   model, sdk, online, sessionTime, lastSeen, version
// }
const devices = {};
const panels = new Set(); // conexiones WS del dashboard
let latestUpdate = null;  // { version, url, date }

// =============================
// 🌐 Archivos estáticos + ping
// =============================
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (_, res) => res.redirect("/index.html"));
app.get("/ping", (_, res) => res.send("pong")); // Keep-alive

// =============================
// 🔌 OTA (API REST)
// =============================
// Publicar una nueva actualización
app.post("/api/update", (req, res) => {
  const { version, url } = req.body || {};
  if (!version || !url) {
    return res.status(400).send("Datos incompletos (version y url requeridos)");
  }

  latestUpdate = { version, url, date: new Date().toISOString() };
  console.log(`🚀 Nueva actualización publicada: v${version} -> ${url}`);

  // Notificar a TODOS los WS (dispositivos y paneles)
  const payload = JSON.stringify({ type: "newUpdate", ...latestUpdate });
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1) ws.send(payload);
  });

  res.send("Actualización enviada a los dispositivos.");
});

// Consultar la última versión publicada
app.get("/api/update", (_, res) => {
  res.json(latestUpdate || { version: "none" });
});

// =============================
// 🔌 Upgrade a WebSocket
// =============================
server.on("upgrade", (req, socket, head) => {
  // ⚠️ En Render el tráfico interno es HTTP
  const url = new URL(req.url, `http://${req.headers.host}`);
  const key = url.searchParams.get("key");

  if (key === "blinkpro-secure-key") {
    // App Android (cliente)
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, "device");
    });
  } else if (key === "panel") {
    // Panel web (navegador)
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, "panel");
    });
  } else {
    socket.destroy(); // 🔒 Rechazar conexiones no autorizadas
  }
});

// =============================
// 🔁 Manejo de conexiones WS
// =============================
wss.on("connection", (ws, req, type) => {
  if (type === "device") {
    console.log("📱 Dispositivo conectado desde Android");

    // Si hay un update global, NO lo enviamos aún; esperamos el primer estado
    // para saber qué versión trae este dispositivo.

    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.type !== "deviceStatus") return;

        const id = data.deviceId || "unknown";
        const version = data.version || "unknown";

        devices[id] = {
          model: data.model,
          sdk: data.sdk,
          online: !!data.online,
          sessionTime: data.sessionTime,
          lastSeen: new Date().toLocaleTimeString(),
          version
        };

        // Enviar update SOLO si el dispositivo no tiene la última versión
        if (latestUpdate && version !== "unknown" && version !== latestUpdate.version) {
          ws.send(JSON.stringify({ type: "newUpdate", ...latestUpdate }));
        }

        // Actualizar paneles
        broadcastToPanels({ type: "updateDevices", devices });
      } catch (e) {
        console.error("⚠️ Error procesando mensaje WS:", e.message);
      }
    });

    ws.on("close", () => {
      console.log("❌ Dispositivo desconectado");
      // Marcar offline a los que estén online (simple)
      for (const [, dev] of Object.entries(devices)) {
        if (dev.online) dev.online = false;
      }
      broadcastToPanels({ type: "updateDevices", devices });
    });

    ws.on("error", (err) => {
      console.error("🚨 Error WS dispositivo:", err.message);
    });
  }

  if (type === "panel") {
    console.log("🖥️ Panel conectado");
    panels.add(ws);

    // Enviar estado actual
    ws.send(JSON.stringify({ type: "updateDevices", devices }));

    // Enviar la última actualización publicada (si existe)
    if (latestUpdate) {
      ws.send(JSON.stringify({ type: "newUpdate", ...latestUpdate }));
    }

    ws.on("close", () => panels.delete(ws));
    ws.on("error", (err) => console.error("🚨 Error WS panel:", err.message));
  }
});

// =============================
// 📤 Broadcast a paneles
// =============================
function broadcastToPanels(data) {
  const payload = JSON.stringify(data);
  for (const ws of panels) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

// =============================
// 💓 KeepAlive (Render)
// =============================
setInterval(() => {
  fetch("https://blinkpro-master.onrender.com/ping")
    .then((res) => console.log("💓 KeepAlive:", res.status))
    .catch((err) => console.log("⚠️ Fallo KeepAlive:", err.message));
}, 240000); // 4 min

// =============================
// 🚀 Arrancar
// =============================
const PORT = process.env.PORT || 10000;
server.listen(PORT, () =>
  console.log(`🚀 BlinkPro Master corriendo en puerto ${PORT}`)
);
