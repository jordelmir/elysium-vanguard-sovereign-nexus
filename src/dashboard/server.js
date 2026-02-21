const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const systeminformation = require('systeminformation');
const adb = require('../cli/utils/adb');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3001;

app.use(express.static(path.join(__dirname, 'public')));

// Mock Telemetry Data Generator
function generateMockData() {
    const isHeavyLoad = Math.random() > 0.8;
    return {
        model: 'SIMULATED DEVICE (DEV MODE)',
        cpu: (isHeavyLoad ? Math.random() * 30 + 60 : Math.random() * 20 + 5).toFixed(1),
        ram: { used: '2.4', total: '16.0', percent: (Math.random() * 2 + 15).toFixed(1) },
        battery: Math.floor(Math.random() * 5 + 85),
        temp: (Math.random() * 5 + 38).toFixed(1),
        storage: { used: '45GB', total: '256GB', percent: '18' },
        rooted: false,
        status: isHeavyLoad ? 'Performance Mode' : 'Balanced'
    };
}

io.on('connection', (socket) => {
    console.log('Cliente conectado al Dashboard');

    const telemetryInterval = setInterval(async () => {
        const devices = await adb.getDevices();
        const mainDevice = devices.find(d => d.state === 'device');

        let data = await adb.getTelemetry();
        let security = await adb.checkSecurity();

        if (mainDevice && data && !data.error) {
            socket.emit('telemetry', { ...data, security });
        } else {
            // Si hay error en telemetría o no hay dispositivo, enviamos mock con flag de error
            socket.emit('telemetry', { ...generateMockData(), isMock: true, error: data?.error || 'OFFLINE' });
        }
    }, 2000);

    socket.on('disconnect', () => {
        clearInterval(telemetryInterval);
        console.log('Cliente desconectado');
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 Dashboard premium ejecutándose en http://localhost:${PORT}`);
});
