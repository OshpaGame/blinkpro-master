// ======================================================
// 🚀 BlinkPro Master Server (modular, seguro y escalable)
// ======================================================

import express from "express";
import http from "http";
import cors from "cors";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import panelRouter from "./routes/panel.js";
import socketHandler from "./ws/socketHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

const PORT = process.env.PORT || 3000;
const MASTER_KEY = process.env.MASTER_KEY || "blinkpro-secure-key";

// ============================
// 🌐 Middlewares
// ============================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/panel", panelRouter);

// ============================
// 🔒 Autenticación WS opcional
// ============================
server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const apiKey = url.searchParams.get("key");

  if (apiKey !== MASTER_KEY) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  if (url.pathname === "/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      socketHandler(wss, ws, request);
    });
  } else {
    socket.destroy();
  }
});

// ============================
// 🚀 Inicio del servidor
// ============================
server.listen(PORT, () => {
  console.log(`🌐 BlinkPro Master corriendo en puerto ${PORT}`);
});
