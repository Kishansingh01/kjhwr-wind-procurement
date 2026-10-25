import sqlite3
import os
from typing import List, Dict, Any, Optional

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "..", "elexon_wind.db"))

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Table for actual generation (FUELHH stream with fuelType='WIND')
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS actual_generation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dataset TEXT NOT NULL,
            publish_time TEXT NOT NULL,
            start_time TEXT NOT NULL,
            settlement_date TEXT NOT NULL,
            settlement_period INTEGER NOT NULL,
            fuel_type TEXT NOT NULL,
            generation REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(start_time, fuel_type)
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_actual_start_time ON actual_generation(start_time)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_actual_date ON actual_generation(settlement_date)")

    # Table for wind forecasts (WINDFOR stream)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS forecast_generation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dataset TEXT NOT NULL,
            publish_time TEXT NOT NULL,
            start_time TEXT NOT NULL,
            generation REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(publish_time, start_time)
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_forecast_start_time ON forecast_generation(start_time)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_forecast_publish_time ON forecast_generation(publish_time)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_forecast_lookup ON forecast_generation(start_time, publish_time)")

    # Table for tracking ingestion status/sync history
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sync_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dataset TEXT NOT NULL,
            from_time TEXT NOT NULL,
            to_time TEXT NOT NULL,
            records_ingested INTEGER NOT NULL,
            status TEXT NOT NULL,
            synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()

def insert_actuals(records: List[Dict[str, Any]]) -> int:
    if not records:
        return 0
    conn = get_connection()
    cursor = conn.cursor()
    inserted = 0
    for r in records:
        if r.get("fuelType") != "WIND":
            continue
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO actual_generation 
                (dataset, publish_time, start_time, settlement_date, settlement_period, fuel_type, generation)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                r.get("dataset", "FUELHH"),
                r.get("publishTime", ""),
                r.get("startTime", ""),
                r.get("settlementDate", ""),
                r.get("settlementPeriod", 0),
                r.get("fuelType", "WIND"),
                float(r.get("generation", 0.0))
            ))
            inserted += 1
        except Exception:
            continue
    conn.commit()
    conn.close()
    return inserted

def insert_forecasts(records: List[Dict[str, Any]]) -> int:
    if not records:
        return 0
    conn = get_connection()
    cursor = conn.cursor()
    inserted = 0
    for r in records:
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO forecast_generation 
                (dataset, publish_time, start_time, generation)
                VALUES (?, ?, ?, ?)
            """, (
                r.get("dataset", "WINDFOR"),
                r.get("publishTime", ""),
                r.get("startTime", ""),
                float(r.get("generation", 0.0))
            ))
            inserted += 1
        except Exception:
            continue
    conn.commit()
    conn.close()
    return inserted
