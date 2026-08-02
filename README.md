# MargoTools - Data Scrapper

Narzędzie ułatwiające zbieranie danych z gry Margonem (mapy, przejścia, NPC, dialogi) za pomocą skryptu Tampermonkey oraz lokalnego serwera w Pythonie.

---

#### Instrukcja
Odpalamy oba skrypty i bazę danych. Następnie chodzimy po wybranych mapach i klikamy we wszystkie npc by zgarnąć dialogi. Wszystko na bieżąco się zapisuje do bazy. Podgląd jest pod fioletowym widgetem. Dodatek do margonem stworzony pod NI.


---

## Wymagania
* Konto Margonem (najlepiej multi by bana nie dostać).
* Przeglądarka internetowa z zainstalowanym rozszerzeniem **Tampermonkey**.
* Zainstalowany **Python** (wersja 3.8 lub nowsza).
* Dowolny serwer bazodanowy **MySQL / MariaDB** (lub dostosowanie kodu Pythona pod SQLite).

---

##### Tampermonkey 
https://pjsoftwaredeveloper.github.io/MargoScrapper/script.user.js



##### Python
```powershell
pip install flask flask-cors mysql-connector-python
```
```powershell
python MargoScrapper.py
```

##### Baza danych
```sql
CREATE DATABASE IF NOT EXISTS margo_tools CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE margo_tools;

CREATE TABLE IF NOT EXISTS maps (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    file VARCHAR(100),
    bg VARCHAR(100),
    width INT,
    height INT,
    pvp INT,
    water TEXT,
    params JSON,
    collisions LONGTEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gateways (
    id INT AUTO_INCREMENT PRIMARY KEY,
    map_id INT,
    x INT,
    y INT,
    target_map_id INT,
    target_map_name VARCHAR(100),
    gateway_key INT,
    lvl INT,
    FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS npcs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    map_id INT,
    npc_id INT,
    nick VARCHAR(100),
    x INT,
    y INT,
    type INT,
    lvl INT,
    icon VARCHAR(150),
    FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dialogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    query_text VARCHAR(255),
    npc_id INT,
    npc_name VARCHAR(100),
    npc_text TEXT,
    options JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```