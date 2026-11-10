// =========================================================
// KONFIGURASI MQTT CLOUD
// =========================================================
const brokerUrl = 'wss://y6c1f078.ala.asia-southeast1.emqxsl.com:8084/mqtt'; 

const topics = {
    sub: [
        'ttg_dapur/sensor/mq7', 'ttg_dapur/sensor/temp', 
        'ttg_dapur/sensor/hum', 
        'ttg_dapur/status/fan', 'ttg_dapur/status/buzzer'
    ],
    pubFan: 'ttg_dapur/control/fan',
    pubBuzzer: 'ttg_dapur/control/buzzer',
    pubSetpoint: 'ttg_dapur/setpoint/mq7'
};

// =========================================================
// SETUP JAM REAL-TIME
// =========================================================
function updateClock() {
    const now = new Date();
    const timeEl = document.getElementById('time-display');
    const dateEl = document.getElementById('date-display');
    
    timeEl.innerText = now.toLocaleTimeString('en-US', { hour12: false });
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.innerText = now.toLocaleDateString('en-US', options);
}
setInterval(updateClock, 1000);
updateClock();

// =========================================================
// SETUP GRAFIK CHART.JS (RINGAN UNTUK HP)
// =========================================================
const ctx = document.getElementById('mq7Chart').getContext('2d');
const MAX_DATA_POINTS = 20;

const gradient = ctx.createLinearGradient(0, 0, 0, 300);
gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

const mq7Chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: Array(MAX_DATA_POINTS).fill(''),
        datasets: [{
            label: 'Gas Level (ppm)',
            data: Array(MAX_DATA_POINTS).fill(null),
            borderColor: '#3b82f6',
            backgroundColor: gradient,
            borderWidth: 2,
            pointBackgroundColor: '#f59e0b',
            pointBorderColor: '#0f172a',
            pointBorderWidth: 1,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // Disable animation for smoother mobile performance
        plugins: { legend: { display: false } },
        scales: {
            y: { 
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#94a3b8' }
            },
            x: { 
                grid: { display: false },
                ticks: { display: false }
            }
        }
    }
});

// =========================================================
// LOGIKA MAX & MIN GAS
// =========================================================
let maxGas = 0;
let minGas = Infinity;

function updateGasStats(val) {
    if (isNaN(val)) return;
    if (val > maxGas) maxGas = val;
    if (val < minGas) minGas = val;
    document.getElementById('max-mq7').innerText = maxGas;
    document.getElementById('min-mq7').innerText = (minGas === Infinity) ? val : minGas;
}

// =========================================================
// KONEKSI MQTT & AUTO RECONNECT
// =========================================================
let client = null;
let isConnected = false;

const mqttOptions = {
    clientId: 'web_dash_' + Math.random().toString(16).substr(2, 8),
    username: 'web_dash',                 
    password: 'EKTg9jxwGaZ2tq4', 
    clean: true,
    connectTimeout: 10000,
    reconnectPeriod: 0,
    keepalive: 30
};

let reconnectTimer = null;
let reconnectAttempts = 0;

function resetReconnectState() {
    reconnectAttempts = 0;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}

function scheduleReconnect() {
    if (reconnectTimer) return;
    const delay = Math.min(30000, 2000 * Math.pow(2, reconnectAttempts));
    reconnectAttempts++;
    console.log(`[MQTT] Reconnecting in ${delay / 1000} seconds...`);
    reconnectTimer = setTimeout(() => { reconnectTimer = null; attemptReconnect(); }, delay);
}

function attemptReconnect() {
    console.log('[MQTT] Attempting to establish a new connection...');
    if (client) { try { client.end(true); } catch (e) {} client = null; }
    try { createClient(); } catch (e) { console.error('[MQTT] Failed:', e); scheduleReconnect(); }
}

function attachClientHandlers(c) {
    c.on('connect', () => {
        resetReconnectState();
        isConnected = true;
        
        const badge = document.getElementById('conn-status');
        badge.classList.add('connected');
        document.getElementById('status-text').innerText = 'Cloud Connected';

        c.subscribe(topics.sub, { qos: 0 }, (err) => {
            if (!err) showToast('Successfully connected to MQTT Cloud', 'success');
        });
    });

    c.on('offline', () => {
        isConnected = false;
        document.getElementById('conn-status').classList.remove('connected');
        document.getElementById('status-text').innerText = 'Disconnected';
        scheduleReconnect();
    });

    c.on('close', () => {
        if (isConnected) {
            isConnected = false;
            document.getElementById('conn-status').classList.remove('connected');
            document.getElementById('status-text').innerText = 'Disconnected';
            scheduleReconnect();
        }
    });

    // ---------- MESSAGE RECEIVER ----------
    c.on('message', (topic, message) => {
        const msgStr = message.toString();

        if (topic === 'ttg_dapur/sensor/mq7') {
            document.getElementById('val-mq7').innerHTML = `${msgStr} <span class="unit">ppm</span>`;
            const val = parseFloat(msgStr);
            updateChart(val);
            updateGasStats(val);
        }
        if (topic === 'ttg_dapur/sensor/temp') {
            document.getElementById('val-temp').innerHTML = `${msgStr} <span class="unit">°C</span>`;
        }
        if (topic === 'ttg_dapur/sensor/hum') {
            document.getElementById('val-hum').innerHTML = `${msgStr} <span class="unit">%</span>`;
        }

        if (topic === 'ttg_dapur/status/fan') {
            const isON = (msgStr.toUpperCase() === 'ON');
            document.getElementById('toggle-fan').checked = isON;
            document.getElementById('label-fan').innerText = isON ? 'ON' : 'OFF';
            document.getElementById('label-fan').style.color = isON ? 'var(--blue)' : 'var(--text-muted)';
            
            const iconFan = document.getElementById('icon-fan');
            if(isON) iconFan.classList.add('fa-spin');
            else iconFan.classList.remove('fa-spin');
        }

        if (topic === 'ttg_dapur/status/buzzer') {
            const isON = (msgStr.toUpperCase() === 'ON');
            document.getElementById('toggle-buzzer').checked = isON;
            document.getElementById('label-buzzer').innerText = isON ? 'ON' : 'OFF';
            document.getElementById('label-buzzer').style.color = isON ? 'var(--red)' : 'var(--text-muted)';
            
            if (isON) { 
                triggerNotification(); 
                showToast('⚠️ WARNING: Buzzer is ON!', 'error'); 
            }
        }
    });
}

function createClient() {
    client = mqtt.connect(brokerUrl, mqttOptions);
    attachClientHandlers(client);
}

// =========================================================
// FUNGSI KONTROL
// =========================================================
function toggleActuator(device, isChecked) {
    const payload = isChecked ? 'ON' : 'OFF';
    if (!client || !client.connected) {
        showToast('Not connected to the broker.', 'error');
        if (device === 'fan') document.getElementById('toggle-fan').checked = !isChecked;
        if (device === 'buzzer') document.getElementById('toggle-buzzer').checked = !isChecked;
        return;
    }
    if (device === 'fan') client.publish(topics.pubFan, payload);
    if (device === 'buzzer') client.publish(topics.pubBuzzer, payload);
    showToast(`${device} ${payload} command sent`, 'success');
}

function kirimSetpoint() {
    const val = document.getElementById('input-setpoint').value;
    if (!val) return showToast('Enter a setpoint value', 'error');
    if (!client || !client.connected) return showToast('Not connected to the broker.', 'error');
    
    client.publish(topics.pubSetpoint, val);
    document.getElementById('current-setpoint').innerText = val + ' ppm';
    document.getElementById('input-setpoint').value = '';
    showToast('Setpoint updated successfully', 'success');
}

// =========================================================
// UI HELPER
// =========================================================
function updateChart(value) {
    if (isNaN(value)) return;
    mq7Chart.data.datasets[0].data.shift();
    mq7Chart.data.datasets[0].data.push(value);
    mq7Chart.update('none'); // 'none' disables transition animation
}

let toastTimeout;
function showToast(message, type) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    const toastIcon = toast.querySelector('i');
    
    toastMsg.innerText = message;
    
    if (type === 'error') {
        toastIcon.className = 'fa-solid fa-triangle-exclamation';
        toastIcon.style.color = 'var(--red)';
    } else {
        toastIcon.className = 'fa-solid fa-circle-check';
        toastIcon.style.color = 'var(--green)';
    }
    
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

let notifCooledDown = true;
function enableNotifications() {
    if ("Notification" in window) {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") showToast("Notifications enabled!", 'success');
            else showToast("Notification permission denied.", 'error');
        });
    } else showToast("This browser does not support notifications.", 'error');
}

function triggerNotification() {
    if ("Notification" in window && Notification.permission === "granted" && notifCooledDown) {
        new Notification("⚠️ DANGER: GAS LEAK DETECTED", {
            body: "The buzzer is on. Check the system location immediately!",
            icon: "https://cdn-icons-png.flaticon.com/512/1008/1008988.png"
        });
        notifCooledDown = false;
        setTimeout(() => { notifCooledDown = true; }, 15000);
    }
}

// BOOT
createClient();

window.addEventListener('online', () => {
    resetReconnectState();
    if (!client || !client.connected) attemptReconnect();
});