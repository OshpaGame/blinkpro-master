<<<<<<< HEAD
const socket = io();

function renderDevices(devices) {
  const dashboard = document.querySelector(".dashboard");
  dashboard.innerHTML = "";

  Object.entries(devices).forEach(([id, dev]) => {
    const card = document.createElement("div");
    card.className = "card";

    const percent = Math.min(dev.sessionTime / 600, 100); // Simula progreso
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

socket.on("updateDevices", (devices) => renderDevices(devices));
=======
const socket = io();

function renderDevices(devices) {
  const dashboard = document.querySelector(".dashboard");
  dashboard.innerHTML = "";

  Object.entries(devices).forEach(([id, dev]) => {
    const card = document.createElement("div");
    card.className = "card";

    const percent = Math.min(dev.sessionTime / 600, 100); // Simula progreso
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

socket.on("updateDevices", (devices) => renderDevices(devices));
>>>>>>> e1bf73c35b14f7d4363e87974fd9b79b123be269
