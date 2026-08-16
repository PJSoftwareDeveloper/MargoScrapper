from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import json

app = Flask(__name__)
CORS(app)

# Konfiguracja połączenia z XAMPP MySQL
DB_CONFIG = {
    'host': 'localhost',
    'database': 'margonem',
    'user': 'root',
    'password': ''  # W XAMPP domyślnie hasło jest puste
}

@app.route("/save_map", methods=["POST"])
def save_map():
    req_data = request.json
    map_data = req_data.get("map", {})
    gateways = req_data.get("gateways", [])
    npcs = req_data.get("npcs", [])
    
    map_id = map_data.get("id")
    if not map_id:
        return jsonify({"status": "error", "message": "Brak ID mapy"}), 400

    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()

        # Wyciąganie pól z params jeśli istnieją
        params = map_data.get("params", {})
        battle_pool = params.get("battlePoolTimeLimits", {})
        
        sql_map = """
            INSERT INTO maps (id, name, file, bg, width, height, pvp, water, mode, mainid, is_drop_item_tax, battle_pool_min, battle_pool_penalty, battle_pool_total, is_timetickets_usage_disabled, lvl_max, lvl_min, respawn, collisions)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
            name=VALUES(name), file=VALUES(file), bg=VALUES(bg), width=VALUES(width), height=VALUES(height),
            pvp=VALUES(pvp), water=VALUES(water), mode=VALUES(mode), mainid=VALUES(mainid), is_drop_item_tax=VALUES(is_drop_item_tax),
            battle_pool_min=VALUES(battle_pool_min), battle_pool_penalty=VALUES(battle_pool_penalty), battle_pool_total=VALUES(battle_pool_total),
            is_timetickets_usage_disabled=VALUES(is_timetickets_usage_disabled), lvl_max=VALUES(lvl_max), lvl_min=VALUES(lvl_min), respawn=VALUES(respawn), collisions=VALUES(collisions)
        """
        
        map_values = (
            map_id,
            map_data.get("name", ""),
            map_data.get("file", ""),
            map_data.get("bg", ""),
            map_data.get("width", 0),
            map_data.get("height", 0),
            map_data.get("pvp", 0),
            map_data.get("water", ""),
            map_data.get("mode", 0),
            map_data.get("mainid", 0),
            map_data.get("is_drop_item_tax", False),
            battle_pool.get("minimum"),
            battle_pool.get("penalty"),
            battle_pool.get("total"),
            params.get("isTimeticketsUsageDisabled", False),
            params.get("lvlMax", 0),
            params.get("lvlMin", 0),
            params.get("respawn", ""),
            map_data.get("collisions", "")
        )
        
        cursor.execute(sql_map, map_values)

        # Czyszczenie starych gateways i npcs dla tej mapy przed ponownym wstawieniem
        cursor.execute("DELETE FROM gateways WHERE map_id = %s", (map_id,))
        cursor.execute("DELETE FROM npcs WHERE map_id = %s", (map_id,))

        # Wstawianie Gateways
        for gw in gateways:
            sql_gw = """
                INSERT INTO gateways (map_id, x, y, target_map_id, target_map_name, gateway_key, lvl)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql_gw, (
                map_id,
                gw.get("x", 0),
                gw.get("y", 0),
                gw.get("target_map_id", 0),
                gw.get("target_map_name", ""),
                gw.get("gateway_key", 0),
                gw.get("lvl", 0)
            ))

        # Wstawianie NPC
        for npc in npcs:
            sql_npc = """
                INSERT INTO npcs (id, map_id, nick, x, y, type, lvl, icon)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql_npc, (
                npc.get("npc_id", 0),
                map_id,
                npc.get("nick", ""),
                npc.get("x", 0),
                npc.get("y", 0),
                npc.get("type", 0),
                npc.get("lvl", 0),
                npc.get("icon", "")
            ))

        connection.commit()
        cursor.close()
        connection.close()
        
        print(f"[ZAPISANO MAPĘ]: ID {map_id} ({map_data.get('name')})")
        return jsonify({"status": "success", "message": "Mapa, kolizje, przejścia i NPC zostały zapisane."})

    except Error as e:
        print(f"[BŁĄD BAZY DANYCH (MAP)]: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/save_dialog", methods=["POST"])
def save_dialog():
    req_data = request.json
    query = req_data.get("query")
    npc_id = req_data.get("npc_id", 0)
    npc_name = req_data.get("npc_name", "")
    npc_text = req_data.get("npc_text", "")
    options = req_data.get("options", [])
    
    if not query:
        return jsonify({"status": "error", "message": "Brak query"}), 400

    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()

        sql_dialog = """
            INSERT IGNORE INTO dialogs (query, npc_id, npc_name, npc_text) 
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(sql_dialog, (query, npc_id, npc_name, npc_text))
        
        if cursor.rowcount == 0:
            print(f"[POMINIĘTO (Duplikat tekstu)]: {npc_name} -> {npc_text[:30]}...")
            cursor.close()
            connection.close()
            return jsonify({"status": "exists", "message": "Taki dialog tego NPC już istnieje w bazie"})

        dialog_id = cursor.lastrowid

        for opt in options:
            sql_opt = """
                INSERT INTO dialog_options (dialog_id, action_code, option_text)
                VALUES (%s, %s, %s)
            """
            cursor.execute(sql_opt, (
                dialog_id,
                opt.get("action_code", ""),
                opt.get("option_text", "")
            ))

        connection.commit()
        cursor.close()
        connection.close()
        
        print(f"[ZAPISANO DIALOG]: {query}")
        return jsonify({"status": "success", "message": "Dodano nowy dialog i opcje"})

    except Error as e:
        print(f"[BŁĄD BAZY DANYCH (DIALOG)]: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/save_battle_npcs", methods=["POST"])
def save_battle_npcs():
    req_data = request.json
    enemies = req_data.get("enemies", [])
    
    if not enemies:
        return jsonify({"status": "error", "message": "Brak danych przeciwników"}), 400

    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()

        # Opcjonalnie: Możesz dostosować zapytanie do swojej tabeli w bazie danych przechowującej przeciwników z walk
        for enemy in enemies:
            hp_data = enemy.get("hp", {})
            stats_data = enemy.get("stats", {})
            
            # Przykładowe zapytanie INSERT / UPDATE (dostosuj nazwę tabeli i kolumn do swojego schematu SQL)
            sql_battle_npc = """
                INSERT INTO battle_npcs (margo_id, original_id, name, lvl, prof, gender, team, wt, icon, hp_max, hp_cur, hp_hpp, stat_ac, stat_act, res_fire, res_frost, res_light)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                name=VALUES(name), lvl=VALUES(lvl), hp_max=VALUES(hp_max), hp_cur=VALUES(hp_cur), hp_hpp=VALUES(hp_hpp)
            """
            cursor.execute(sql_battle_npc, (
                enemy.get("id"),
                enemy.get("originalId"),
                enemy.get("name"),
                enemy.get("lvl"),
                enemy.get("prof"),
                enemy.get("gender"),
                enemy.get("team"),
                enemy.get("wt"),
                enemy.get("icon"),
                hp_data.get("max", 0),
                hp_data.get("cur", 0),
                hp_data.get("hpp", 100),
                stats_data.get("ac", 0),
                stats_data.get("act", 0),
                stats_data.get("resfire", 0),
                stats_data.get("resfrost", 0),
                stats_data.get("reslight", 0)
            ))

        connection.commit()
        cursor.close()
        connection.close()
        
        print(f"[ZAPISANO WALKĘ]: Przetworzono {len(enemies)} przeciwników.")
        return jsonify({"status": "success", "message": f"Zapisano {len(enemies)} przeciwników z walki."})

    except Error as e:
        print(f"[BŁĄD BAZY DANYCH (BATTLE)]: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000, debug=True)