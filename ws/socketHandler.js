// ======================================================
// 📡 Manejador WebSocket — canal /ws
// ======================================================

let devices = {};

export default function socketHandler(wss, ws, req) {
  console.log("📲 Nuevo cliente conectado vía WS");

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      if (!data.deviceId) return;

      devices[data.deviceId] = {
        model: data.model,
        sdk: data.sdk,
        online: data.online,
        sessionTime: data.sessionTime,
        lastSeen: new Date().toLocaleTimeString(),
      };

      broadcast(wss, { type: "updateDevices", devices });
    } catch (err) {
      console.error("❌ Error en mensaje WS:", err.message);
    }
  });

  ws.on("close", () => {
    console.log("🔴 Cliente WS desconectado");
  });
}

// Envía datos a todos los paneles conectados
function broadcast(wss, data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(msg);
  });
}
