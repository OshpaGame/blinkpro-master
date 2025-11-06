// 📡 Conexión WebSocket (Render /ws)
const ws = new WebSocket("wss://blinkpro-master.onrender.com/ws?key=blinkpro-secure-key");

// 📋 Renderiza los dispositivos conectados
function renderDevices(devices) {
  const dashboard = document.querySelector(".dashboard");
  dashboard.innerHTML = "";

  Object.entries(devices).forEach(([id, dev]) => {
    const card = document.createElement("div");
    card.className = "card";

    const percent = Math.min(dev.sessionTime / 600, 100);
    card.innerHTML = `
      <div class="status ${dev.online ? "online" : "offline"}">
        ${dev.online ? "Conectado" : "Desconectado"}
      </div>
      <div class="details">
        <strong>Modelo:</strong> ${dev.model}<br>
        <strong>SDK:</strong> ${dev.sdk}<br>
        <strong>Tiempo activo:</strong> ${dev.sessionTime}s<br>
        <strong>Último reporte:</strong> ${dev.lastSeen}
      </div>
      <div class="time-bar">
        <div class="time-fill" style="width:${percent}%;"></div>
      </div>
    `;

    dashboard.appendChild(card);
  });
}

// 🔄 Escucha los mensajes del servidor
ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    if (data.type === "updateDevices") {
      renderDevices(data.devices);
    }
  } catch (err) {
    console.error("Error procesando mensaje:", err);
  }
};

// 🔁 Reconexión automática
ws.onclose = () => {
  console.warn("Conexión WS cerrada, reconectando...");
  setTimeout(() => location.reload(), 5000);
};
