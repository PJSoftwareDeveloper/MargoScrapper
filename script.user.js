// ==UserScript==
// @name         Margonem DataScrapper
// @namespace    http://tampermonkey.net/
// @author       Ronnie Radke
// @version      2.0
// @match        https://*.margonem.pl/*
// @exclude      https://www.margonem.pl/*
// @run-at       document-end
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    if (window.self !== window.top) return;

    const style = document.createElement('style');
    style.innerHTML = `
        #margo-debug-window {
            position: fixed;
            width: 700px;
            height: 480px;
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
            white-space: pre-wrap;
            overflow-y: auto;
            overflow-x: auto;
            border-radius: 4px;
            user-select: text;
            -webkit-user-select: text;
            pointer-events: auto;
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
    floatBtn.innerHTML = `<div class="icon-inner"></div>`;
    document.body.appendChild(floatBtn);

    const savedX = localStorage.getItem('margo_debug_pos_x');
    const savedY = localStorage.getItem('margo_debug_pos_y');
    const initialLeft = savedX !== null ? savedX + 'px' : '100px';
    const initialTop = savedY !== null ? savedY + 'px' : '100px';

    const win = document.createElement('div');
    win.id = 'margo-debug-window';
    win.style.left = initialLeft;
    win.style.top = initialTop;
    win.style.display = 'none';

    win.innerHTML = `
        <div id="margo-debug-header">
            <span>MargoTools - Podgląd Danych</span>
            <button id="margo-debug-close">×</button>
        </div>
        <div id="margo-debug-tabs">
            <button class="margo-debug-tab active" data-target="pane-map">Map</button>
            <button class="margo-debug-tab" data-target="pane-gateways">Gateways</button>
            <button class="margo-debug-tab" data-target="pane-npcs">NPCs</button>
            <button class="margo-debug-tab" data-target="pane-dialogs">Dialogs</button>
            <button class="margo-debug-tab" data-target="pane-status">Status</button>
        </div>
        <div id="margo-debug-content">
            <div id="pane-map" class="margo-tab-pane active">
                <div class="margo-pane-header">
                    <span>Dane Mapy</span>
                    <button class="margo-copy-btn" data-clipboard="map">Kopiuj</button>
                </div>
                <div class="margo-json-viewer" id="view-map">Oczekiwanie na mapę...</div>
            </div>
            <div id="pane-gateways" class="margo-tab-pane">
                <div class="margo-pane-header">
                    <span>Lista Przejść (Gateways)</span>
                    <button class="margo-copy-btn" data-clipboard="gateways">Kopiuj</button>
                </div>
                <div class="margo-json-viewer" id="view-gateways">Brak przejść...</div>
            </div>
            <div id="pane-npcs" class="margo-tab-pane">
                <div class="margo-pane-header">
                    <span>Lista NPC</span>
                    <button class="margo-copy-btn" data-clipboard="npcs">Kopiuj</button>
                </div>
                <div class="margo-json-viewer" id="view-npcs">Brak NPC...</div>
            </div>
            <div id="pane-dialogs" class="margo-tab-pane">
                <div class="margo-pane-header">
                    <span>Ostatnio Zapisany Dialog</span>
                    <button class="margo-copy-btn" data-clipboard="dialogs">Kopiuj</button>
                </div>
                <div class="margo-json-viewer" id="view-dialogs">Brak przechwyconych dialogów...</div>
            </div>
            <div id="pane-status" class="margo-tab-pane">
                <div class="margo-pane-header">
                    <span>Status i Błędy Połączenia</span>
                </div>
                <div class="margo-json-viewer" id="view-status" style="color: #e0e0e0;">Inicjalizowanie skryptu...</div>
            </div>
        </div>
    `;
    document.body.appendChild(win);

    floatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        win.style.display = win.style.display === 'none' ? 'flex' : 'none';
    });

    document.getElementById('margo-debug-close').addEventListener('click', () => {
        win.style.display = 'none';
    });

    const tabs = win.querySelectorAll('.margo-debug-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            win.querySelectorAll('.margo-tab-pane').forEach(p => p.classList.remove('active'));
            win.querySelector(`#${tab.getAttribute('data-target')}`).classList.add('active');
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
        status: "Skrypt uruchomiony pomyślnie."
    };

    function updateStatus(msg, isError = false) {
        const timeStr = new Date().toLocaleTimeString();
        const line = `[${timeStr}] ${msg}\n`;
        store.status = line + store.status;
        const statusEl = document.getElementById('view-status');
        if (statusEl) {
            statusEl.style.color = isError ? '#ff4444' : '#03dac6';
            statusEl.innerText = store.status;
        }
        if (isError) console.error("[MargoTools Error]:", msg);
    }

    win.querySelectorAll('.margo-copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-clipboard');
            const dataToCopy = store[type];
            if (dataToCopy) {
                navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
                alert(`Skopiowano sekcję ${type} do schowka!`);
            } else {
                alert('Brak danych do skopiowania w tej sekcji.');
            }
        });
    });

    const header = document.getElementById('margo-debug-header');
    let isDragging = false, startX, startY;
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - win.offsetLeft;
        startY = e.clientY - win.offsetTop;
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        win.style.left = (e.clientX - startX) + 'px';
        win.style.top = (e.clientY - startY) + 'px';
    });
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            localStorage.setItem('margo_debug_pos_x', parseInt(win.style.left));
            localStorage.setItem('margo_debug_pos_y', parseInt(win.style.top));
        }
    });

    async function sendToServer(endpoint, payload) {
        try {
            await fetch(`http://localhost:5000/${endpoint}`, {
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
                try {
                    const winRef = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
                    return winRef.Engine ? winRef.Engine : null;
                } catch (e) { return null; }
            },
            _extractCollisions() {
                try {
                    const engine = this._getEngine();
                    if (!engine || !engine.map) return null;
                    const colModule = engine.map.col;
                    if (!colModule || typeof colModule.check !== 'function') return null;
                    const width = engine.map.d ? engine.map.d.x : 0;
                    const height = engine.map.d ? engine.map.d.y : 0;
                    if (!width || !height) return null;
                    const flatCollisions = [];
                    for (let y = 0; y < height; y++) {
                        for (let x = 0; x < width; x++) {
                            flatCollisions.push(colModule.check(x, y));
                        }
                    }
                    return JSON.stringify(flatCollisions);
                } catch (e) { return null; }
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
                    const data = npc.d || npc;
                    return {
                        npc_id: data.id || npc.id || 0,
                        nick: data.nick || npc.nick || "Brak",
                        x: data.x !== undefined ? data.x : (npc.x !== undefined ? npc.x : 0),
                        y: data.y !== undefined ? data.y : (npc.y !== undefined ? npc.y : 0),
                        type: data.type !== undefined ? data.type : 0,
                        lvl: data.lvl || 0,
                        icon: data.icon || ""
                    };
                }).filter(n => n.npc_id !== 0);

                return {
                    map: {
                        id: mapD.id, name: mapD.name, file: mapD.file, bg: mapD.bg,
                        width: mapD.x, height: mapD.y, pvp: mapD.pvp !== undefined ? mapD.pvp : 0,
                        water: mapD.water || "", params: mapD.params || {}
                    },
                    collisions: this._extractCollisions(),
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
                                document.getElementById('view-map').innerText = JSON.stringify(data.map, null, 2);
                                document.getElementById('view-gateways').innerText = JSON.stringify(data.gateways, null, 2);
                                document.getElementById('view-npcs').innerText = JSON.stringify(data.npcs, null, 2);
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
                        const winRef = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
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
                                            document.getElementById('view-dialogs').innerText = JSON.stringify(structuredData, null, 2);
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
        start() {
            try {
                this.MapExtractor.init();
                this.DialogParser.init();
            } catch (e) {
                updateStatus(`Krytyczny błąd startu: ${e.message}`, true);
            }
        }
    };

    MargoTools.start();

})();