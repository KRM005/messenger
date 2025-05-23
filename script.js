let ws;
let clientId = 42;

function log(msg) {
  const output = document.getElementById("output");
  output.textContent += msg + "\n";
  output.scrollTop = output.scrollHeight; // Auto-scroll to bottom
}

function toUint8Array(...args) {
  return new Uint8Array(args);
}

function associate() {
  clientId = parseInt(document.getElementById("clientId").value);
  if (isNaN(clientId) || clientId < 0 || clientId > 255) {
    log("❌ Invalid Client ID");
    return;
  }

  // If using local testing: ws://localhost:12345
  // If using tunnel or public server, use a valid `wss://` or `ws://` URL
  ws = new WebSocket("wss://m3r31kmx-12345.inc1.devtunnels.ms/"); // or your own server URL
  ws.binaryType = "arraybuffer";

  ws.onopen = () => {
    log("✅ Connected to WebSocket Server");
    const packet = toUint8Array(0, 0, clientId); // MANAGEMENT, ASSOCIATE, ID
    ws.send(packet);
  };

  ws.onmessage = (event) => {
    const data = new Uint8Array(event.data);
    const type = data[0], msg = data[1], id = data[2];

    if (type === 0) {
      if (msg === 1) log(`✅ Associated (Client ID: ${id})`);
      else if (msg === 2) log("❌ Association failed");
      else if (msg === 3) log("⚠️ ID already in use");
    } else if (type === 1) {
      if (msg === 1) log("ℹ️ Buffer empty");
      else if (msg === 2) log("✅ Message sent (ACK)");
      else if (msg === 3) log("⚠️ Receiver's buffer full");
    } else if (type === 2 && msg === 0) {
      const senderId = data[3];
      const len = data[4];
      const text = new TextDecoder().decode(data.slice(5, 5 + len));
      log(`📨 Message from ${senderId}: ${text}`);
    }
  };

  ws.onerror = (e) => log("❌ WebSocket error: check if server is running");
  ws.onclose = () => log("⚠️ WebSocket closed");
}

function sendMessage() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    log("❌ WebSocket is not open");
    return;
  }

  const receiverId = parseInt(document.getElementById("receiverId").value);
  const text = document.getElementById("message").value;

  if (isNaN(receiverId) || receiverId < 0 || receiverId > 255) {
    log("❌ Invalid Receiver ID");
    return;
  }

  const encoder = new TextEncoder();
  const payload = encoder.encode(text);
  if (payload.length > 254) {
    log("⚠️ Message too long");
    return;
  }

  const header = toUint8Array(2, 1, clientId, receiverId, payload.length);
  const packet = new Uint8Array(header.length + payload.length);
  packet.set(header);
  packet.set(payload, header.length);

  ws.send(packet);
  log(`📤 Sent to ${receiverId}: ${text}`);
}

function getMessage() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    log("❌ WebSocket is not open");
    return;
  }

  const packet = toUint8Array(1, 0, clientId); // MANAGEMENT, GET, ID
  ws.send(packet);
  log("📥 Requested message from server...");
}
