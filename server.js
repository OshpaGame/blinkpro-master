// ======================================================
// 📡 BlinkPro Master Server — compatible con Render.com
// ======================================================
import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import fs from "fs";
import multer from "multer";

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
// 📦 Configurar almacenamiento de APKs
// =============================
const updatesDir = path.join(__dirname, "public", "updates");
if (!fs.existsSync(updatesDir)) fs.mkdirSync(updatesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, updatesDir),
  filename: (_, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, safeName);
  }
});
const upload = multer({ storage });

// =============================
// 📤 Subir nueva APK desde el panel
// =============================
app.post("/api/upload", upload.single("apk"), (req, res) => {
  try {
    const { version } = req.body;
    if (!version || !req.file) {
      return res.status(400).send("Faltan versión o archivo APK");
    }

    const fileUrl = `/apk/${req.file.filename}`;
    latestUpdate = {
      version,
      url: fileUrl,
      date: new Date().toISOString()
    };

    console.log(`📦 Nueva APK subida: ${req.file.filename} (v${version})`);

    // Notificar a todos los clientes WS
    const payload = JSON.stringify({ type: "newUpdate", ...latestUpdate });
    wss.clients.forEach((ws) => {
      if (ws.readyState === 1) ws.send(payload);
    });

    res.send(`✅ Versión v${version} subida y publicada correctamente.`);
  } catch (err) {
    console.error("🚨 Error en /api/upload:", err);
    res.status(500).send("Error interno al subir APK");
  }
});

// =============================
// 📦 Ruta para descargar APKs
// =============================
app.get("/apk/:file", (req, res) => {
  const fileName = req.params.file;
  const filePath = path.join(updatesDir, fileName);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Archivo no encontrado: ${filePath}`);
    return res.status(404).send("APK no encontrado");
  }

  console.log(`📦 Enviando APK: ${fileName}`);
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  fs.createReadStream(filePath).pipe(res);
});

// =============================
// 🔌 OTA (API REST)
// =============================
app.post("/api/update", (req, res) => {
  const { version, url } = req.body || {};
  if (!version || !url) {
    return res.status(400).send("Datos incompletos (version y url requeridos)");
  }

  latestUpdate = { version, url, date: new Date().toISOString() };
  console.log(`🚀 Nueva actualización publicada: v${version} -> ${url}`);

  const payload = JSON.stringify({ type: "newUpdate", ...latestUpdate });
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1) ws.send(payload);
  });

  res.send("Actualización enviada a los dispositivos.");
});

app.get("/api/update", (_, res) => {
  res.json(latestUpdate || { version: "none" });
});

// =============================
// 🔌 Upgrade a WebSocket
// =============================
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const key = url.searchParams.get("key");

  if (key === "blinkpro-secure-key") {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, "device");
    });
  } else if (key === "panel") {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, "panel");
    });
  } else {
    socket.destroy();
  }
});

// =============================
// 🔁 Manejo de conexiones WS
// =============================
wss.on("connection", (ws, req, type) => {
  if (type === "device") {
    console.log("📱 Dispositivo conectado desde Android");

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

        if (latestUpdate && version !== "unknown" && version !== latestUpdate.version) {
          ws.send(JSON.stringify({ type: "newUpdate", ...latestUpdate }));
        }

        broadcastToPanels({ type: "updateDevices", devices });
      } catch (e) {
        console.error("⚠️ Error procesando mensaje WS:", e.message);
      }
    });

    ws.on("close", () => {
      console.log("❌ Dispositivo desconectado");
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

    ws.send(JSON.stringify({ type: "updateDevices", devices }));
    if (latestUpdate) ws.send(JSON.stringify({ type: "newUpdate", ...latestUpdate }));

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
}, 240000);

// =============================
// 🚀 Arrancar
// =============================
const PORT = process.env.PORT || 10000;
server.listen(PORT, () =>
  console.log(`🚀 BlinkPro Master corriendo en puerto ${PORT}`)
);
