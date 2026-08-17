// ==UserScript==
// @name         Margonem DataScrapper
// @namespace    http://tampermonkey.net/
// @author       Ronnie Radke
// @version      2.5
// @description  Scrapper do Margonem
// @match        https://*.margonem.pl/*
// @exclude      https://www.margonem.pl/*
// @run-at       document-end
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    if (window.self !== window.top) return;

    const winRef = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
    let lastExtractedBattleId = null;
    let lastExtractedShopId = null;

    const style = document.createElement('style');
    style.textContent = `
        #margo-debug-window {
            position: fixed;
            width: 700px;
            height: 480px;
            min-width: 400px;
            min-height: 250px;
            background: rgba(18, 18, 18, 0.95);
            border: 2px solid #bb86fc;
            border-radius: 8px;
            color: #e0e0e0;
            font-family: Arial, sans-serif;
            z-index: 999999;
            box-shadow: 0 4px 15px rgba(0,0,0,0.7);
            display: flex;
            flex-direction: column;
            user-select: text;
            -webkit-user-select: text;
            overflow: hidden;
        }
        #margo-debug-header {
            background: #1e1e1e;
            padding: 10px 12px;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #333;
            font-weight: bold;
            font-size: 14px;
            color: #bb86fc;
            user-select: none;
            -webkit-user-select: none;
            border-top-left-radius: 6px;
            border-top-right-radius: 6px;
        }
        #margo-debug-close {
            background: none;
            border: none;
            color: #e0e0e0;
            font-size: 16px;
            cursor: pointer;
            font-weight: bold;
        }
        #margo-debug-close:hover {
            color: #ff4444;
        }
        #margo-debug-tabs {
            padding: 8px;
            background: #161616;
            display: flex;
            gap: 5px;
            border-bottom: 1px solid #2c2c2c;
            flex-wrap: wrap;
            user-select: none;
            -webkit-user-select: none;
        }
        .margo-debug-tab {
            background: #2d2d2d;
            border: 1px solid #444;
            color: #e0e0e0;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: bold;
        }
        .margo-debug-tab.active {
            background: #bb86fc;
            color: #121212;
            border-color: #bb86fc;
        }
        #margo-debug-content {
            flex: 1;
            padding: 10px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
        }
        .margo-tab-pane {
            display: none;
            flex-direction: column;
            height: 100%;
        }
        .margo-tab-pane.active {
            display: flex;
        }
        .margo-pane-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
            font-size: 12px;
            font-weight: bold;
            user-select: none;
            -webkit-user-select: none;
        }
        .margo-copy-btn {
            background: #bb86fc;
            border: none;
            color: #121212;
            padding: 3px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
            font-weight: bold;
        }
        .margo-copy-btn:hover {
            background: #03dac6;
        }
        .margo-json-viewer {
            flex: 1;
            background: #1e1e1e;
            border: 1px solid #2c2c2c;
            color: #03dac6;
            padding: 8px;
            font-family: monospace;
            font-size: 11px;
            overflow-y: auto;
            overflow-x: auto;
            border-radius: 4px;
            user-select: text;
            -webkit-user-select: text;
            pointer-events: auto;
            line-height: 1.4;
        }

        /* Styl drzewka JSON w stylu VSC */
        .json-tree {
            margin: 0;
            padding: 0;
            list-style: none;
        }
        .json-tree li {
            position: relative;
            margin: 0;
            padding-left: 20px;
        }
        .json-node-expander {
            position: absolute;
            left: 0;
            top: 1px;
            width: 12px;
            height: 12px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #bb86fc;
            user-select: none;
            font-weight: bold;
        }
        .json-node-expander::before {
            content: "▼";
            display: inline-block;
            transition: transform 0.1s ease;
        }
        .json-node.collapsed > .json-node-expander::before {
            transform: rotate(-90deg);
        }
        .json-node.collapsed > .json-children {
            display: none;
        }
        .json-key { color: #9cdcfe; }
        .json-string { color: #ce9178; }
        .json-number { color: #b5cea8; }
        .json-boolean { color: #569cd6; }
        .json-null { color: #569cd6; }
        .json-punctuation { color: #d4d4d4; }
        .json-preview {
            color: #888;
            font-style: italic;
            font-size: 10px;
            display: none;
            margin-left: 5px;
        }
        .json-node.collapsed > .json-preview {
            display: inline;
        }

        #margo-tools-float-btn {
            position: fixed;
            top: 0px;
            left: 310px;
            width: 42px;
            height: 42px;
            background: linear-gradient(to bottom, #2d2d2d, #1a1a1a);
            border: 2px solid #bb86fc;
            border-radius: 6px;
            cursor: pointer;
            z-index: 999998;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
            transition: transform 0.1s ease, border-color 0.2s ease;
        }
        #margo-tools-float-btn:hover {
            border-color: #03dac6;
            transform: scale(1.05);
        }
        #margo-tools-float-btn .icon-inner {
            width: 24px;
            height: 24px;
            background: radial-gradient(circle, #bb86fc 0%, #3700b3 100%);
            border-radius: 50%;
        }
    `;
    document.head.appendChild(style);

    const floatBtn = document.createElement('div');
    floatBtn.id = 'margo-tools-float-btn';
    floatBtn.title = 'MargoTools - Otwórz Debugger';

    const iconInner = document.createElement('div');
    iconInner.className = 'icon-inner';
    floatBtn.appendChild(iconInner);
    document.body.appendChild(floatBtn);

    const savedX = localStorage.getItem('margo_debug_pos_x');
    const savedY = localStorage.getItem('margo_debug_pos_y');
    const savedW = localStorage.getItem('margo_debug_width');
    const savedH = localStorage.getItem('margo_debug_height');
    const savedIsOpen = localStorage.getItem('margo_debug_is_open');

    const initialLeft = savedX !== null ? savedX + 'px' : '100px';
    const initialTop = savedY !== null ? savedY + 'px' : '100px';

    const win = document.createElement('div');
    win.id = 'margo-debug-window';
    win.style.left = initialLeft;
    win.style.top = initialTop;
    if (savedW !== null) win.style.width = savedW + 'px';
    if (savedH !== null) win.style.height = savedH + 'px';

    // Ustawienie początkowego stanu okna na podstawie zapamiętanej wartości (domyślnie zamknięte, chyba że zapisano 'true')
    win.style.display = savedIsOpen === 'true' ? 'flex' : 'none';

    const headerEl = document.createElement('div');
    headerEl.id = 'margo-debug-header';
    const headerTitle = document.createElement('span');
    headerTitle.textContent = 'MargoTools - Podgląd Danych';
    const closeBtn = document.createElement('button');
    closeBtn.id = 'margo-debug-close';
    closeBtn.textContent = '×';
    headerEl.appendChild(headerTitle);
    headerEl.appendChild(closeBtn);
    win.appendChild(headerEl);

    const tabsEl = document.createElement('div');
    tabsEl.id = 'margo-debug-tabs';
    const tabConfigs = [
        { target: 'pane-map', text: 'Map', active: true },
        { target: 'pane-gateways', text: 'Gateways', active: false },
        { target: 'pane-npcs', text: 'NPCs', active: false },
        { target: 'pane-dialogs', text: 'Dialogs', active: false },
        { target: 'pane-battle-addon', text: 'Battle NPCs', active: false },
        { target: 'pane-shops', text: 'Shops', active: false },
        { target: 'pane-status', text: 'Status', active: false }
    ];
    tabConfigs.forEach(cfg => {
        const tBtn = document.createElement('button');
        tBtn.className = `margo-debug-tab${cfg.active ? ' active' : ''}`;
        tBtn.setAttribute('data-target', cfg.target);
        tBtn.textContent = cfg.text;
        tabsEl.appendChild(tBtn);
    });
    win.appendChild(tabsEl);

    const contentEl = document.createElement('div');
    contentEl.id = 'margo-debug-content';

    const paneConfigs = [
        { id: 'pane-map', title: 'Dane Mapy', clip: 'map', initText: 'Oczekiwanie na mapę...' },
        { id: 'pane-gateways', title: 'Lista Przejść (Gateways)', clip: 'gateways', initText: 'Brak przejść...' },
        { id: 'pane-npcs', title: 'Lista NPC', clip: 'npcs', initText: 'Brak NPC...' },
        { id: 'pane-dialogs', title: 'Ostatnio Zapisany Dialog', clip: 'dialogs', initText: 'Brak przechwyconych dialogów...' },
        { id: 'pane-battle-addon', title: 'Przeciwnici w Walce (Addon)', clip: 'battle-addon', initText: 'Oczekiwanie na walkę...' },
        { id: 'pane-shops', title: 'Zawartość Sklepu', clip: 'shops', initText: 'Oczekiwanie na otwarcie sklepu...' },
        { id: 'pane-status', title: 'Status i Błędy Połączenia', clip: null, initText: 'Inicjalizowanie skryptu...' }
    ];

    paneConfigs.forEach((paneCfg, idx) => {
        const pane = document.createElement('div');
        pane.id = paneCfg.id;
        pane.className = `margo-tab-pane${idx === 0 ? ' active' : ''}`;

        const pHeader = document.createElement('div');
        pHeader.className = 'margo-pane-header';
        const pTitle = document.createElement('span');
        pTitle.textContent = paneCfg.title;
        pHeader.appendChild(pTitle);

        if (paneCfg.clip) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'margo-copy-btn';
            copyBtn.setAttribute('data-clipboard', paneCfg.clip);
            copyBtn.textContent = 'Kopiuj';
            pHeader.appendChild(copyBtn);
        }
        pane.appendChild(pHeader);

        const viewer = document.createElement('div');
        viewer.className = 'margo-json-viewer';
        viewer.id = `view-${paneCfg.clip || 'status'}`;
        if (paneCfg.id === 'pane-status') {
            viewer.style.color = '#e0e0e0';
            viewer.textContent = paneCfg.initText;
        } else {
            renderJsonTree(viewer, paneCfg.initText);
        }
        pane.appendChild(viewer);

        contentEl.appendChild(pane);
    });
    win.appendChild(contentEl);
    document.body.appendChild(win);

    function renderJsonTree(container, data) {
        container.innerHTML = '';
        if (typeof data === 'string') {
            container.textContent = data;
            return;
        }
        const treeRoot = document.createElement('ul');
        treeRoot.className = 'json-tree';
        treeRoot.appendChild(createNode(null, data));
        container.appendChild(treeRoot);
    }

    function createNode(key, value) {
        const li = document.createElement('li');
        li.className = 'json-node';

        const isObject = value !== null && typeof value === 'object';
        const hasChildren = isObject && Object.keys(value).length > 0;

        if (hasChildren) {
            const expander = document.createElement('span');
            expander.className = 'json-node-expander';
            expander.addEventListener('click', (e) => {
                e.stopPropagation();
                li.classList.toggle('collapsed');
            });
            li.appendChild(expander);
        }

        if (key !== null) {
            const keySpan = document.createElement('span');
            keySpan.className = 'json-key';
            keySpan.textContent = `"${key}": `;
            li.appendChild(keySpan);
        }

        if (isObject) {
            const isArray = Array.isArray(value);
            const openBr = document.createElement('span');
            openBr.className = 'json-punctuation';
            openBr.textContent = isArray ? '[' : '{';
            li.appendChild(openBr);

            if (hasChildren) {
                const preview = document.createElement('span');
                preview.className = 'json-preview';
                preview.textContent = isArray ? `Array(${value.length})` : `Object {..}`;
                li.appendChild(preview);

                const ul = document.createElement('ul');
                ul.className = 'json-children';

                const keys = Object.keys(value);
                keys.forEach((k) => {
                    ul.appendChild(createNode(isArray ? null : k, value[k]));
                });
                li.appendChild(ul);
            }

            const closeBr = document.createElement('span');
            closeBr.className = 'json-punctuation';
            closeBr.textContent = isArray ? ']' : '}';
            if (hasChildren) {
                closeBr.style.cursor = 'pointer';
                closeBr.addEventListener('click', () => {
                    li.classList.toggle('collapsed');
                });
            }
            li.appendChild(closeBr);
        } else {
            const valSpan = document.createElement('span');
            let valType = typeof value;
            if (value === null) {
                valSpan.className = 'json-null';
                valSpan.textContent = 'null';
            } else if (valType === 'string') {
                valSpan.className = 'json-string';
                valSpan.textContent = `"${value}"`;
            } else if (valType === 'number') {
                valSpan.className = 'json-number';
                valSpan.textContent = value;
            } else if (valType === 'boolean') {
                valSpan.className = 'json-boolean';
                valSpan.textContent = value;
            }
            li.appendChild(valSpan);
        }

        return li;
    }

    floatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = win.style.display === 'none';
        win.style.display = isOpen ? 'flex' : 'none';
        localStorage.setItem('margo_debug_is_open', isOpen ? 'true' : 'false');
    });

    document.getElementById('margo-debug-close').addEventListener('click', () => {
        win.style.display = 'none';
        localStorage.setItem('margo_debug_is_open', 'false');
    });

    const tabs = win.querySelectorAll('.margo-debug-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            win.querySelectorAll('.margo-tab-pane').forEach(p => p.classList.remove('active'));
            const targetPane = win.querySelector(`#${tab.getAttribute('data-target')}`);
            if (targetPane) targetPane.classList.add('active');
        });
    });

    document.querySelectorAll('.margo-json-viewer').forEach(viewer => {
        viewer.addEventListener('mousedown', (e) => e.stopPropagation());
        viewer.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
    });

    let store = {
        map: null,
        gateways: [],
        npcs: [],
        dialogs: null,
        'battle-addon': null,
        shops: null,
        status: "Skrypt uruchomiony pomyślnie."
    };

    function updateStatus(msg, isError = false) {
        const timeStr = new Date().toLocaleTimeString();
        const line = `[${timeStr}] ${msg}\n`;
        store.status = line + store.status;
        const statusEl = document.getElementById('view-status');
        if (statusEl) {
            statusEl.style.color = isError ? '#ff4444' : '#03dac6';
            statusEl.textContent = store.status;
        }
        if (isError) console.error("[MargoTools Error]:", msg);
    }

    win.querySelectorAll('.margo-copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-clipboard');
            const dataToCopy = store[type];
            if (dataToCopy) {
                const textVal = typeof dataToCopy === 'string' ? dataToCopy : JSON.stringify(dataToCopy, null, 2);
                navigator.clipboard.writeText(textVal);
                alert(`Skopiowano sekcję ${type} do schowka!`);
            } else {
                alert('Brak danych do skopiowania w tej sekcji.');
            }
        });
    });

    const header = document.getElementById('margo-debug-header');
    let isDragging = false, isResizing = false, resizeDir = '';
    let startX, startY, startLeft, startTop, startWidth, startHeight;
    const edgeSize = 8;

    header.addEventListener('mousedown', (e) => {
        if (e.target.id === 'margo-debug-close') return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = win.offsetLeft;
        startTop = win.offsetTop;
    });

    win.addEventListener('mousemove', (e) => {
        if (isDragging || isResizing) return;
        const rect = win.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const w = rect.width;
        const h = rect.height;

        let dir = '';
        if (x > w - edgeSize && y > h - edgeSize) dir = 'se';
        else if (x < edgeSize && y > h - edgeSize) dir = 'sw';
        else if (x > w - edgeSize && y < edgeSize) dir = 'ne';
        else if (x < edgeSize && y < edgeSize) dir = 'nw';
        else if (x > w - edgeSize) dir = 'e';
        else if (x < edgeSize) dir = 'w';
        else if (y > h - edgeSize) dir = 's';
        else if (y < edgeSize) dir = 'n';

        win.style.cursor = dir ? dir + '-resize' : 'default';
    });

    win.addEventListener('mousedown', (e) => {
        const rect = win.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const w = rect.width;
        const h = rect.height;

        let dir = '';
        if (x > w - edgeSize && y > h - edgeSize) dir = 'se';
        else if (x < edgeSize && y > h - edgeSize) dir = 'sw';
        else if (x > w - edgeSize && y < edgeSize) dir = 'ne';
        else if (x < edgeSize && y < edgeSize) dir = 'nw';
        else if (x > w - edgeSize) dir = 'e';
        else if (x < edgeSize) dir = 'w';
        else if (y > h - edgeSize) dir = 's';
        else if (y < edgeSize) dir = 'n';

        if (dir) {
            isResizing = true;
            resizeDir = dir;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = win.offsetLeft;
            startTop = win.offsetTop;
            startWidth = w;
            startHeight = h;
            e.preventDefault();
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            win.style.left = (startLeft + dx) + 'px';
            win.style.top = (startTop + dy) + 'px';
        } else if (isResizing) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            if (resizeDir.includes('e')) {
                win.style.width = Math.max(400, startWidth + dx) + 'px';
            }
            if (resizeDir.includes('s')) {
                win.style.height = Math.max(250, startHeight + dy) + 'px';
            }
            if (resizeDir.includes('w')) {
                const newWidth = Math.max(400, startWidth - dx);
                if (newWidth > 400) {
                    win.style.width = newWidth + 'px';
                    win.style.left = (startLeft + (startWidth - newWidth)) + 'px';
                }
            }
            if (resizeDir.includes('n')) {
                const newHeight = Math.max(250, startHeight - dy);
                if (newHeight > 250) {
                    win.style.height = newHeight + 'px';
                    win.style.top = (startTop + (startHeight - newHeight)) + 'px';
                }
            }
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            localStorage.setItem('margo_debug_pos_x', parseInt(win.style.left, 10));
            localStorage.setItem('margo_debug_pos_y', parseInt(win.style.top, 10));
        }
        if (isResizing) {
            isResizing = false;
            win.style.cursor = 'default';
            localStorage.setItem('margo_debug_width', parseInt(win.style.width, 10));
            localStorage.setItem('margo_debug_height', parseInt(win.style.height, 10));
        }
    });

    async function sendToServer(endpoint, payload) {
        try {
            await fetch(`https://margoscrapper.onrender.com/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            updateStatus(`Wysłano poprawnie do /${endpoint}`);
        } catch (err) {
            updateStatus(`Błąd połączenia z serwerem (${endpoint}): ${err.message}`, true);
        }
    }

    const MargoTools = {
        MapExtractor: {
            lastMapId: null,
            _getEngine() {
                try { return winRef.Engine ? winRef.Engine : null; } catch (e) { return null; }
            },
            _extractCollisionsString() {
                try {
                    const engine = this._getEngine();
                    if (!engine || !engine.map) return "";
                    const colModule = engine.map.col;
                    const width = engine.map.d ? engine.map.d.x : 0;
                    const height = engine.map.d ? engine.map.d.y : 0;
                    if (!colModule || typeof colModule.check !== 'function' || !width || !height) return "";

                    let rows = [];
                    for (let t = 0; t < (width * height); t++) {
                        let cx = t % width;
                        let cy = Math.floor(t / width);
                        let checkVal = colModule.check(cx, cy);
                        let prefix = (cx === 0 && t > 0) ? "\n" : "";
                        rows.push(prefix + checkVal);
                    }
                    return rows.join('');
                } catch (e) { return ""; }
            },
            async extractWithRetry(retries = 3, delay = 400) {
                for (let i = 0; i < retries; i++) {
                    try {
                        const data = this._extractRaw();
                        if (data && data.npcs.length > 0) return data;
                    } catch (e) {}
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                return this._extractRaw();
            },
            _extractRaw() {
                const engine = this._getEngine();
                if (!engine || !engine.map || !engine.map.d || !engine.map.d.id) return null;
                const mapD = engine.map.d;
                const gm = engine.map.getGateways ? engine.map.getGateways() : null;
                const gatewaysList = (gm && typeof gm.getList === 'function') ? gm.getList() : [];
                const townNames = (gm && gm.townnames) ? gm.townnames : {};

                const gateways = gatewaysList.map(gw => {
                    const d = gw.d || {};
                    const targetId = d.key || d.id || d.mapid || 0;
                    return {
                        x: gw.rx !== undefined ? gw.rx : (d.x || 0),
                        y: gw.ry !== undefined ? gw.ry : (d.y || 0),
                        target_map_id: targetId,
                        target_map_name: townNames[targetId] || "Nieznana",
                        gateway_key: d.key !== undefined ? d.key : 0,
                        lvl: d.lvl !== undefined ? d.lvl : 0
                    };
                });

                let npcsArray = [];
                if (engine.npcs) {
                    const rawNpcs = typeof engine.npcs.check === 'function' ? engine.npcs.check() : null;
                    if (rawNpcs) {
                        npcsArray = Array.isArray(rawNpcs) ? rawNpcs : Object.values(rawNpcs);
                    } else if (typeof engine.npcs.getList === 'function') {
                        npcsArray = engine.npcs.getList();
                    }
                }

                const npcs = npcsArray.map(npc => {
                    const data = (npc && npc.d) ? npc.d : (npc || {});
                    return {
                        npc_id: data.id || npc.id || 0,
                        nick: data.nick || npc.nick || "Brak",
                        x: data.x !== undefined ? data.x : (npc.x !== undefined ? npc.x : 0),
                        y: data.y !== undefined ? data.y : (npc.y !== undefined ? npc.y : 0),
                        type: data.type !== undefined ? data.type : (npc.type !== undefined ? npc.type : 0),
                        lvl: data.lvl !== undefined ? data.lvl : (npc.lvl !== undefined ? npc.lvl : 0),
                        icon: data.icon || npc.icon || "",
                        actions: data.actions !== undefined ? data.actions : (npc.actions !== undefined ? npc.actions : 0),
                        tpl: data.tpl !== undefined ? data.tpl : (npc.tpl !== undefined ? npc.tpl : 0),
                        grp: data.grp !== undefined ? data.grp : (npc.grp !== undefined ? npc.grp : 0),
                        wt: data.wt !== undefined ? data.wt : (npc.wt !== undefined ? npc.wt : 0)
                    };
                }).filter(n => n.npc_id !== 0);

                return {
                    map: {
                        id: mapD.id,
                        name: mapD.name,
                        file: mapD.file,
                        bg: mapD.bg,
                        width: mapD.x,
                        height: mapD.y,
                        pvp: mapD.pvp !== undefined ? mapD.pvp : 0,
                        water: mapD.water || "",
                        params: mapD.params || {},
                        collisions: this._extractCollisionsString()
                    },
                    gateways,
                    npcs
                };
            },
            init() {
                setInterval(async () => {
                    try {
                        const engine = this._getEngine();
                        if (!engine || !engine.map || !engine.map.d || !engine.map.d.id) return;
                        const currentMapId = engine.map.d.id;
                        if (currentMapId !== this.lastMapId) {
                            this.lastMapId = currentMapId;
                            updateStatus(`Wykryto zmianę mapy na ID: ${currentMapId}`);
                            const data = await this.extractWithRetry(4, 500);
                            if (data) {
                                store.map = data.map;
                                store.gateways = data.gateways;
                                store.npcs = data.npcs;

                                renderJsonTree(document.getElementById('view-map'), data.map);
                                renderJsonTree(document.getElementById('view-gateways'), data.gateways);
                                renderJsonTree(document.getElementById('view-npcs'), data.npcs);

                                sendToServer('save_map', data);
                            }
                        }
                    } catch (e) {
                        updateStatus(`Błąd w pętli mapy: ${e.message}`, true);
                    }
                }, 500);
            }
        },
        DialogParser: {
            init() {
                const checkInterval = setInterval(() => {
                    try {
                        if (winRef._g && !winRef._g.__margo_hooked) {
                            winRef._g.__margo_hooked = true;
                            clearInterval(checkInterval);
                            updateStatus("Pomyślnie podpięto hook pod funkcję _g (dialogi).");
                            const original_g = winRef._g;
                            winRef._g = function(query, callback) {
                                const wrappedCallback = function(response) {
                                    try {
                                        if (query && typeof query === 'string' && query.includes('talk') && response && response.d) {
                                            const d = response.d;
                                            let currentHeroNick = "";
                                            try {
                                                if (winRef.Engine && winRef.Engine.hero && winRef.Engine.hero.d) {
                                                    currentHeroNick = winRef.Engine.hero.d.nick;
                                                }
                                            } catch (err) {}
                                            let rawNpcText = String(d[4] || "");
                                            let npcTextCleaned = currentHeroNick ? rawNpcText.replaceAll(currentHeroNick, "[NICK_POSTACI]") : rawNpcText;
                                            const structuredData = {
                                                query: query,
                                                npc_id: d[2],
                                                npc_name: d[1],
                                                npc_text: npcTextCleaned,
                                                options: []
                                            };
                                            let i = 7;
                                            let rawItems = [];
                                            while (i < d.length) {
                                                if (d[i] !== undefined) rawItems.push(d[i]);
                                                i++;
                                            }
                                            let filtered = rawItems.filter(item => {
                                                let str = String(item).trim();
                                                if (/^[1-9]$/.test(str)) return false;
                                                return true;
                                            });
                                            for (let j = 0; j < filtered.length; j += 2) {
                                                let first = filtered[j];
                                                let second = filtered[j + 1];
                                                if (first !== undefined && second !== undefined) {
                                                    let isFirstText = String(first).length > 5 || String(first).includes(' ');
                                                    let optionTextRaw = isFirstText ? String(first) : String(second);
                                                    let optionTextCleaned = currentHeroNick ? optionTextRaw.replaceAll(currentHeroNick, "[NICK_POSTACI]") : optionTextRaw;
                                                    structuredData.options.push({
                                                        action_code: isFirstText ? String(second) : String(first),
                                                        option_text: optionTextCleaned
                                                    });
                                                }
                                            }
                                            store.dialogs = structuredData;
                                            renderJsonTree(document.getElementById('view-dialogs'), structuredData);
                                            sendToServer('save_dialog', structuredData);
                                        }
                                    } catch (err) {
                                        updateStatus(`Błąd przetwarzania dialogu: ${err.message}`, true);
                                    }
                                    if (callback) return callback(response);
                                };
                                return original_g.call(this, query, wrappedCallback);
                            };
                        }
                    } catch (e) {
                        updateStatus(`Błąd hookowania _g: ${e.message}`, true);
                    }
                }, 200);
            }
        },
        BattleAddon: {
            init() {
                setInterval(() => {
                    try {
                        if (winRef.Engine && winRef.Engine.battle && winRef.Engine.battle.warriorsList) {
                            const warriors = winRef.Engine.battle.warriorsList;
                            winRef.debugWarriors = warriors;

                            let enemyKeys = Object.keys(warriors).filter(id => {
                                let w = warriors[id];
                                return w && winRef.Engine.hero && w.team !== winRef.Engine.hero.d.team;
                            });

                            if (enemyKeys.length > 0) {
                                let currentBattleSignature = enemyKeys.join('_');

                                if (currentBattleSignature !== lastExtractedBattleId) {
                                    lastExtractedBattleId = currentBattleSignature;

                                    let battleDataList = [];
                                    for (let id of enemyKeys) {
                                        let w = warriors[id];
                                        const isNpc = w.npc === 1 || Number(w.id) < 0;

                                        if (!isNpc) continue;

                                        battleDataList.push({
                                            id: w.id,
                                            originalId: w.originalId || w.id,
                                            name: w.name,
                                            lvl: w.lvl,
                                            prof: w.prof,
                                            gender: w.gender || "x",
                                            team: w.team,
                                            wt: w.wt !== undefined ? w.wt : 0,
                                            icon: w.icon || "",
                                            hp: {
                                                max: w.hp ? w.hp.max : 0,
                                                cur: w.hp ? w.hp.cur : 0,
                                                hpp: w.hp ? w.hp.hpp : 100
                                            },
                                            stats: {
                                                ac: w.ac ? w.ac.cur : 0,
                                                act: w.act ? w.act.cur : 0,
                                                resfire: w.resfire ? w.resfire.cur : 0,
                                                resfrost: w.resfrost ? w.resfrost.cur : 0,
                                                reslight: w.reslight ? w.reslight.cur : 0
                                            }
                                        });
                                    }

                                    store['battle-addon'] = battleDataList;
                                    renderJsonTree(document.getElementById('view-battle-addon'), battleDataList);

                                    updateStatus(`Wykryto walkę! Przeciwników: ${battleDataList.length}`);
                                    sendToServer('save_battle_npcs', { enemies: battleDataList });
                                }
                            } else {
                                lastExtractedBattleId = null;
                            }
                        }
                    } catch (err) {}
                }, 500);
            }
        },
        ShopScrapper: {
            init() {
                setInterval(() => {
                    try {
                        if (winRef.Engine && winRef.Engine.shop && typeof winRef.Engine.shop.getData === 'function') {
                            const shopData = winRef.Engine.shop.getData();
                            if (shopData && shopData.id) {
                                const currentShopId = shopData.id;
                                if (currentShopId !== lastExtractedShopId) {
                                    lastExtractedShopId = currentShopId;
                                    store.shops = shopData;

                                    renderJsonTree(document.getElementById('view-shops'), shopData);

                                    updateStatus(`Wykryto otwarcie sklepu o ID: ${currentShopId}`);
                                    sendToServer('save_shop', shopData);
                                }
                            } else {
                                lastExtractedShopId = null;
                            }
                        }
                    } catch (err) {}
                }, 500);
            }
        },
        start() {
            try {
                this.MapExtractor.init();
                this.DialogParser.init();
                this.BattleAddon.init();
                this.ShopScrapper.init();
                updateStatus("Wszystkie moduły DataScrapper i Battle Addon zostały zainicjowane.");
            } catch (e) {
                updateStatus(`Krytyczny błąd startu: ${e.message}`, true);
            }
        }
    };

    MargoTools.start();

})();