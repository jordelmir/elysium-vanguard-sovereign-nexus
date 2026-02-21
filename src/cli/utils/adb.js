const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const logger = require('./logger');

const adb = {
    /**
     * Ejecuta un comando adb y devuelve la salida.
     */
    run: async (command) => {
        try {
            const { stdout, stderr } = await execAsync(`adb ${command}`);
            return stdout.trim();
        } catch (error) {
            throw new Error(`Command fail: adb ${command} - ${error.message}`);
        }
    },

    /**
     * Devuelve la lista de dispositivos conectados.
     */
    getDevices: async () => {
        try {
            const output = await adb.run('devices');
            const lines = output.split('\n').filter(line => line.trim() !== '');
            lines.shift(); // Elimina el header "List of devices attached"

            return lines.map(line => {
                const [id, state] = line.split('\t');
                return { id: id.trim(), state: state.trim() };
            });
        } catch (error) {
            return [];
        }
    },

    /**
     * Obtiene una propiedad del dispositivo mediante getprop.
     */
    getProp: async (propName) => {
        return await adb.run(`shell getprop ${propName}`);
    },

    /**
     * Verifica si el dispositivo tiene acceso root (su).
     */
    checkRoot: async () => {
        try {
            const output = await adb.run('shell "su -c id"');
            return output.includes('uid=0(root)');
        } catch (error) {
            return false;
        }
    },

    /**
     * Obtiene estadísticas reales con diagnósticos.
     */
    getTelemetry: async () => {
        try {
            const devices = await adb.getDevices();
            if (devices.length === 0) return { error: 'DISPOSITIVO_DESCONECTADO' };

            const mainDevice = devices.find(d => d.state === 'device');
            if (!mainDevice) return { error: 'DISPOSITIVO_NO_AUTORIZADO' };

            // 1. Identificación
            const model = await adb.getProp('ro.product.model').catch(() => 'Modelo Desconocido');
            const manufacturer = await adb.getProp('ro.product.manufacturer').catch(() => 'Android');

            // 2. RAM
            const memInfo = await adb.run('shell "cat /proc/meminfo"').catch(() => '');
            let ramData = { used: '0', total: '0', percent: '0' };
            if (memInfo) {
                const totalRam = parseInt(memInfo.match(/MemTotal:\s+(\d+)/)[1]);
                const availableRam = parseInt(memInfo.match(/MemAvailable:\s+(\d+)/)[1]);
                ramData = {
                    used: ((totalRam - availableRam) / 1024 / 1024).toFixed(1),
                    total: (totalRam / 1024 / 1024).toFixed(1),
                    percent: ((1 - (availableRam / totalRam)) * 100).toFixed(1)
                };
            }

            // 3. CPU
            let cpuUsage = '0.0';
            try {
                const cpu1 = await adb.run('shell "cat /proc/stat | grep \'cpu \'"');
                await new Promise(r => setTimeout(r, 150));
                const cpu2 = await adb.run('shell "cat /proc/stat | grep \'cpu \'"');
                const p = (l) => l.split(/\s+/).slice(1, 8).map(Number);
                const t1 = p(cpu1); const t2 = p(cpu2);
                const idle = t2[3] - t1[3];
                const total = t2.reduce((a, b) => a + b, 0) - t1.reduce((a, b) => a + b, 0);
                cpuUsage = ((1 - (idle / total)) * 100).toFixed(1);
            } catch (e) { }

            // 4. BATTERY
            const battInfo = await adb.run('shell "dumpsys battery"').catch(() => '');
            const batLevel = battInfo ? battInfo.match(/level:\s+(\d+)/)[1] : '0';
            const batTemp = battInfo ? (parseInt(battInfo.match(/temperature:\s+(\d+)/)[1]) / 10).toFixed(1) : '0';

            // 5. STORAGE
            const storageOutput = await adb.run('shell "df -h /data"').catch(() => '');
            let storageData = { total: 'N/A', used: 'N/A', percent: '0' };
            if (storageOutput && storageOutput.includes('/data')) {
                const sMatch = storageOutput.split('\n').find(l => l.includes('/data')).match(/(\d+\.?\d*[KMG])\s+(\d+\.?\d*[KMG])\s+(\d+\.?\d*[KMG])\s+(\d+)%/);
                if (sMatch) {
                    storageData = { total: sMatch[1], used: sMatch[2], percent: sMatch[4] };
                }
            }

            return {
                model: `${manufacturer} ${model}`,
                cpu: cpuUsage,
                ram: ramData,
                battery: batLevel,
                temp: batTemp,
                storage: storageData,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return { error: 'ERROR_ADQUISICION_DATOS', msg: error.message };
        }
    },

    /**
     * Auditoría real de seguridad para el dashboard.
     */
    checkSecurity: async () => {
        try {
            const isRooted = await adb.checkRoot();
            const seLinux = await adb.run('shell getenforce').catch(() => 'unknown');
            const debuggable = await adb.getProp('ro.debuggable').catch(() => '0');
            const verifiedBoot = await adb.getProp('ro.boot.verifiedbootstate').catch(() => 'unknown');

            return {
                root: isRooted,
                selinux: seLinux,
                debuggable: debuggable === '1',
                verifiedBoot: verifiedBoot,
                score: isRooted ? 95 : 20 // Puntuación de "Libertad" vs "Seguridad Stock"
            };
        } catch (e) {
            return null;
        }
    }
};

module.exports = adb;
