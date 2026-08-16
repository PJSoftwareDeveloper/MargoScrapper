import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)

# Połączenie z MongoDB Atlas (adres bazy pobierany ze zmiennej środowiskowej Rendera)
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb+srv://margoScrapper:margatron@margoscrapper.3fhi293.mongodb.net/?appName=margoScrapper')
client = MongoClient(MONGO_URI)
db = client['margonem']  # Nazwa bazy danych

# Kolekcje (odpowiedniki tabel)
maps_col = db['maps']
dialogs_col = db['dialogs']
battle_col = db['battle_npcs']

@app.route("/save_map", methods=["POST"])
def save_map():
    req_data = request.json
    map_data = req_data.get("map", {})
    map_id = map_data.get("id")
    
    if not map_id:
        return jsonify({"status": "error", "message": "Brak ID mapy"}), 400

    try:
        # Przygotowanie całego pakietu danych mapy jako jeden dokument
        document = {
            "_id": map_id,  # Używamy ID mapy jako klucza głównego
            "map": map_data,
            "gateways": req_data.get("gateways", []),
            "npcs": req_data.get("npcs", [])
        }

        # Zapisz lub zaktualizuj (Upsert)
        maps_col.replace_one({"_id": map_id}, document, upsert=True)
        
        print(f"[ZAPISANO MAPĘ]: ID {map_id} ({map_data.get('name')})")
        return jsonify({"status": "success", "message": "Mapa została zapisana w MongoDB."})

    except Exception as e:
        print(f"[BŁĄD MONGODB (MAP)]: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/save_dialog", methods=["POST"])
def save_dialog():
    req_data = request.json
    query = req_data.get("query")
    
    if not query:
        return jsonify({"status": "error", "message": "Brak query"}), 400

    try:
        # Sprawdzamy czy dialog już istnieje
        existing = dialogs_col.find_one({"query": query})
        if existing:
            return jsonify({"status": "exists", "message": "Taki dialog już istnieje"})

        dialogs_col.insert_one(req_data)
        print(f"[ZAPISANO DIALOG]: {query}")
        return jsonify({"status": "success", "message": "Dodano nowy dialog"})

    except Exception as e:
        print(f"[BŁĄD MONGODB (DIALOG)]: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/save_battle_npcs", methods=["POST"])
def save_battle_npcs():
    req_data = request.json
    enemies = req_data.get("enemies", [])
    
    if not enemies:
        return jsonify({"status": "error", "message": "Brak danych"}), 400

    try:
        for enemy in enemies:
            enemy_id = enemy.get("id")
            if enemy_id:
                battle_col.update_one({"id": enemy_id}, {"$set": enemy}, upsert=True)

        print(f"[ZAPISANO WALKĘ]: Przetworzono {len(enemies)} przeciwników.")
        return jsonify({"status": "success", "message": f"Zapisano {len(enemies)} przeciwników."})

    except Exception as e:
        print(f"[BŁĄD MONGODB (BATTLE)]: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))