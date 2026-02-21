// Connection with Go Engine via Native WebSockets
const socket = new WebSocket(`ws://${window.location.host}/ws`);

// UI Elements
const cpuLoad = document.getElementById('cpu-load');
const cpuFill = document.getElementById('cpu-fill');
const ramUsage = document.getElementById('ram-usage');
const ramFill = document.getElementById('ram-fill');
const batteryLevel = document.getElementById('battery-level');
const batteryFill = document.getElementById('battery-fill');
const storageUsage = document.getElementById('storage-usage');
const storageFill = document.getElementById('storage-fill');
const rootStatus = document.getElementById('root-status');
const rootHint = document.getElementById('root-hint');
const miniDeviceName = document.getElementById('mini-device-name');
const statusIndicator = document.getElementById('device-status-indicator');
const logContainer = document.getElementById('log-container');

// New Elements
const terminalOutput = document.getElementById('terminal-output');
const terminalInput = document.getElementById('terminal-input');
const modulesList = document.getElementById('modules-list');
const auditResults = document.getElementById('audit-results');
const deviceModelDisplay = document.getElementById('device-model-display');
const fileListContainer = document.getElementById('file-list-container');
const currentPathDisplay = document.getElementById('current-path-display');
const goUpBtn = document.getElementById('go-up-btn');
const refreshFilesBtn = document.getElementById('refresh-files');

socket.onopen = () => {
    console.log('Conectado al Engine de Go');
    addLog('Conexión establecida con el Engine v2.0 (Go)', 'success');
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'terminal') {
        appendTerminal(data.output);
    } else if (data.type === 'modules') {
        renderModules(data.output);
    } else if (data.type === 'security') {
        renderSecurity(data.output);
    } else if (data.type === 'perf_hack') {
        addLog(`Hack de Rendimiento: ${data.output}`, 'success');
    } else if (data.type === 'files') {
        console.log('Recibidos datos de archivos:', data);
        renderFiles(data.files, data.path);
    } else {
        updateUI(data);
    }
};

function updateUI(data) {
    // Handle Warning for Mock data
    if (data.isMock) {
        miniDeviceName.style.color = '#ff3e3e';
        statusIndicator.className = 'status-indicator offline';
        addLog(`ADVERTENCIA: Usando Datos Simulados (${data.error})`, 'warn');
    } else {
        miniDeviceName.style.color = '#00f2ff';
        statusIndicator.className = 'status-indicator online';
    }

    // Model
    if (data.model) {
        miniDeviceName.innerText = data.model;
        deviceModelDisplay.innerText = data.model.includes('A10') ? 'A10' : (data.model.includes('V2') ? 'V2' : 'DEV');
        statusIndicator.className = 'status-indicator online';
    } else {
        miniDeviceName.innerText = 'Desconectado';
        statusIndicator.className = 'status-indicator offline';
    }

    // CPU
    cpuLoad.innerText = `${data.cpu.toFixed(1)}%`;
    cpuFill.style.width = `${data.cpu}%`;

    // RAM
    if (data.ram) {
        ramUsage.innerText = `${data.ram.used} / ${data.ram.total} GB`;
        ramFill.style.width = `${data.ram.percent}%`;
    }

    // Storage
    if (data.storage) {
        storageUsage.innerText = `${data.storage.used} / ${data.storage.total} (${data.storage.free} Libres)`;
        storageFill.style.width = `${data.storage.percent}%`;
        storageFill.style.background = data.storage.percent > 90 ? 'var(--accent-red)' : 'var(--accent-green)';
    }

    // Battery
    batteryLevel.innerText = `${data.battery}%`;
    batteryFill.style.width = `${data.battery}%`;

    // Root Status
    if (data.rooted !== undefined) {
        rootStatus.innerText = data.rooted ? 'ROOTED' : 'UNLOCKED/LOCKED';
        rootStatus.className = data.rooted ? 'stat-value status-yes' : 'stat-value status-no';
        rootHint.innerText = data.rooted ? 'Privilegios de SuperUsuario activos' : 'Esperando desbloqueo';
    }

    // addLog(`Telemetría: CPU ${data.cpu}% | RAM ${data.ram.percent || data.ram}%`, 'info');
}

// Tab Switching
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.getAttribute('data-tab');

        // Update active link
        document.querySelectorAll('nav a').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Update active content
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(tab).classList.add('active');

        // Initial actions for tabs
        if (tab === 'modules') {
            socket.send(JSON.stringify({ type: 'modules', command: 'list' }));
        } else if (tab === 'security') {
            socket.send(JSON.stringify({ type: 'security', command: 'audit' }));
        } else if (tab === 'files') {
            loadPath(currentFileState.path);
        }
    });
});

// File Manager State
let currentCWD = "/";
let currentFileState = {
    path: "/",
    files: []
};

// Terminal Input
terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const cmd = terminalInput.value;
        if (!cmd) return;

        appendTerminal(`<span class="prompt">${currentCWD} $</span> ${cmd}`, 'input');

        // Custom performance command for A10
        if (cmd === 'perf-boost' || cmd === 'max-perf') {
            socket.send(JSON.stringify({ type: 'perf_hack', command: 'boost' }));
        } else if (cmd.startsWith('fastboot ')) {
            socket.send(JSON.stringify({ type: 'fastboot', command: cmd.substring(9) }));
        } else {
            socket.send(JSON.stringify({ type: 'terminal', command: cmd }));
        }
        terminalInput.value = '';
    }
});

function appendTerminal(text, type = 'output') {
    // If it's a JSON response with CWD
    if (typeof text === 'object' && text.cwd) {
        currentCWD = text.cwd;
        text = text.output;
    }

    const line = document.createElement('div');
    line.className = 'term-line ' + type;
    line.innerHTML = text.replace(/\n/g, '<br>');
    terminalOutput.appendChild(line);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function renderModules(data) {
    if (!data || data.includes('adb error')) {
        modulesList.innerHTML = '<div class="empty-state stagger-item">No se detectaron módulos o se requiere Root.</div>';
        return;
    }
    const modules = data.trim().split('\n');
    modulesList.innerHTML = modules.map((m, idx) => `
        <div class="module-card stagger-item" style="animation-delay: ${idx * 0.05}s">
            <div class="module-icon">📦</div>
            <div class="module-info">
                <h4>${m}</h4>
                <p>Status: Active / Verified</p>
            </div>
        </div>
    `).join('');
}

function renderSecurity(data) {
    auditResults.innerHTML = Object.entries(data).map(([key, val]) => {
        let statusClass = 'info';
        if (val === 'Enforcing' || val === '0') statusClass = 'pass';
        if (val === 'Permissive' || val === '1') statusClass = 'fail';

        return `
            <div class="audit-item">
                <div class="audit-label">
                    <h4>${key}</h4>
                    <p>Current system property state detection</p>
                </div>
                <div class="audit-status ${statusClass}">${val}</div>
            </div>
        `;
    }).join('');
}

// Refresh buttons
document.getElementById('refresh-modules').addEventListener('click', () => {
    socket.send(JSON.stringify({ type: 'modules', command: 'list' }));
});

document.getElementById('run-audit').addEventListener('click', () => {
    socket.send(JSON.stringify({ type: 'security', command: 'audit' }));
});

function addLog(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.innerHTML = `<span style="color: #666">[${time}]</span> ${message}`;
    logContainer.prepend(line);

    if (logContainer.children.length > 20) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

// File Manager Logic
function loadPath(path) {
    console.log('Solicitando ruta:', path);
    socket.send(JSON.stringify({ type: 'files', command: path }));
    currentFileState.path = path;
    currentPathDisplay.value = path;
}

function renderFiles(files, path) {
    if (!files) {
        fileListContainer.innerHTML = '<div class="empty-state">No se pudo acceder a esta ruta o está vacía.</div>';
        return;
    }

    fileListContainer.innerHTML = '';
    files.forEach((file, idx) => {
        const item = document.createElement('div');
        // Add staggering animation class and dynamically calculated delay
        item.className = 'file-item stagger-item';
        item.style.animationDelay = `${idx * 0.05}s`;

        let actionsHTML = '';
        if (!file.isDir) {
            actionsHTML = `
                <div class="file-actions">
                    <button class="a-btn download" title="Descargar/Copiar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></button>
                    <button class="a-btn delete" title="Borrar Falso"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                </div>
            `;
        }

        item.innerHTML = `
            <div class="file-icon">${file.isDir ? '📁' : '📄'}</div>
            <div class="file-name" title="${file.name}">${file.name}</div>
            <div class="file-info-mini">${file.isDir ? 'DIR' : file.size}</div>
            ${actionsHTML}
        `;

        item.onclick = (e) => {
            // Prevenir navegación si se hizo clic en un botón de acción
            if (e.target.closest('.a-btn')) {
                const btn = e.target.closest('.a-btn');
                if (btn.classList.contains('delete')) {
                    addLog(`[SIMULACIÓN] Borrando archivo seguro: ${file.name}`, 'warn');
                    item.style.opacity = '0.5';
                    setTimeout(() => item.remove(), 500);
                } else if (btn.classList.contains('download')) {
                    addLog(`[SIMULACIÓN] Extrayendo: ${file.name} a /Dashboard...`, 'success');
                }
                return;
            }

            if (file.isDir) {
                const newPath = path === '/' ? `/${file.name}` : `${path}/${file.name}`;
                loadPath(newPath.replace(/\/+/g, '/'));
            } else {
                addLog(`Archivo seleccionado: ${file.name}`, 'info');
            }
        };

        fileListContainer.appendChild(item);
    });
}

goUpBtn.onclick = () => {
    if (currentFileState.path === '/') return;
    const parts = currentFileState.path.split('/').filter(p => p !== '');
    parts.pop();
    const parentPath = '/' + parts.join('/');
    loadPath(parentPath);
};

refreshFilesBtn.onclick = () => loadPath(currentFileState.path);
