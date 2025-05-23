// Protocol constants
const MANAGEMENT = 0, CONTROL = 1, DATA = 2;
const ASSOCIATE = 0, GET = 0, PUSH = 1;
const ASSOCIATIONSUCCESS = 1, ASSOCIATIONFAILED = 2, BUFFEREMPTY = 1, POSITIVEACK = 2, UNKNOWNERROR = 3;

let ws, clientId;

const E2EE_KEY = 42; // Both clients must use the same key

function appendMessage(msg) {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML += msg + '<br>';
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function xorEncryptDecrypt(data) {
    let result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        result[i] = data[i] ^ E2EE_KEY;
    }
    return result;
}

document.getElementById('connectForm').onsubmit = function(event) {
    event.preventDefault(); // Prevent form from submitting and reloading the page
    clientId = parseInt(document.getElementById('clientId').value, 10);
    if (isNaN(clientId) || clientId < 0 || clientId > 255) {
        alert('Enter valid client ID (0-255)');
        return;
    }
    ws = new WebSocket('wss://m3r31kmx-12345.inc1.devtunnels.ms/');
    ws.binaryType = 'arraybuffer';
    ws.onopen = function() {
        // Send associate packet
        let packet = new Uint8Array([MANAGEMENT, ASSOCIATE, clientId]);
        ws.send(packet);
        document.getElementById('status').textContent = 'Connecting...';
    };
    ws.onmessage = function(event) {
        let data = new Uint8Array(event.data);
        if (data[0] === MANAGEMENT) {
            if (data[1] === ASSOCIATIONSUCCESS) {
                document.getElementById('status').textContent = 'Connected!';
                document.getElementById('main').style.display = '';
            } else {
                document.getElementById('status').textContent = 'Association failed (' + data[1] + ')';
            }
        } else if (data[0] === CONTROL) {
            if (data[1] === BUFFEREMPTY) {
                appendMessage('No messages in buffer.');
            } else if (data[1] === POSITIVEACK) {
                appendMessage('Message sent successfully.');
            } else if (data[1] === 3) {
                appendMessage('Buffer full.');
            }
        } else if (data[0] === DATA) {
            if (data[1] === 0) { // GETRESPONSE
                let senderId = data[3];
                let length = data[4];
                let payload = data.slice(5, 5 + length);
                payload = xorEncryptDecrypt(payload); // Decrypt after receiving
                let text = new TextDecoder().decode(payload);
                appendMessage('From ' + senderId + ': ' + text);
            }
        } else {
            appendMessage('Unknown response: ' + data);
        }
    };
    ws.onerror = function() {
        document.getElementById('status').textContent = 'WebSocket error!';
    };
    ws.onclose = function() {
        document.getElementById('status').textContent = 'Disconnected';
        document.getElementById('main').style.display = 'none';
    };
};

document.getElementById('messageForm').onsubmit = function(event) {
    event.preventDefault();
    let receiverId = parseInt(document.getElementById('receiverId').value, 10);
    let message = document.getElementById('messageInput').value;
    if (!ws || ws.readyState !== 1) return;
    if (isNaN(receiverId) || receiverId < 0 || receiverId > 255) {
        alert('Enter valid receiver ID (0-255)');
        return;
    }
    let payload = new TextEncoder().encode(message);
    payload = xorEncryptDecrypt(payload); // Encrypt before sending
    if (payload.length > 254) {
        alert('Message too long (max 254 bytes)');
        return;
    }
    let packet = new Uint8Array(5 + payload.length);
    packet[0] = DATA;
    packet[1] = PUSH;
    packet[2] = clientId;
    packet[3] = receiverId;
    packet[4] = payload.length;
    packet.set(payload, 5);
    ws.send(packet);
    document.getElementById('messageInput').value = '';
};

document.getElementById('getBtn').onclick = function() {
    if (!ws || ws.readyState !== 1) return;
    let packet = new Uint8Array([CONTROL, GET, clientId]);
    ws.send(packet);
};
