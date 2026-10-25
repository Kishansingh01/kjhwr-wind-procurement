#!/usr/bin/env python3
"""
Data Ingestion Script for Elexon BMRS January 2026 Datasets:
- FUELHH stream (fuelType='WIND')
- WINDFOR stream (Wind generation forecast)

Covers the window: 2025-12-30 to 2026-02-02 to ensure full Day-Ahead lookback
and delivery coverage for every decision made in January 2026.
"""

import sys
import os
import time
import logging
from datetime import datetime, timedelta

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import init_db, insert_actuals, insert_forecasts, get_connection
from app.elexon_client import fetch_elexon_stream

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ingestion")

def run_ingestion():
    init_db()
    
    start_dt = datetime(2025, 12, 30, 0, 0, 0)
    end_dt = datetime(2026, 2, 2, 23, 59, 59)
    chunk_days = 4
    
    total_actuals = 0
    total_forecasts = 0
    
    curr = start_dt
    t0 = time.time()
    
    logger.info("=====================================================")
    logger.info(f"Starting Elexon BMRS Ingestion for January 2026")
    logger.info(f"Window: {start_dt.isoformat()} to {end_dt.isoformat()}")
    logger.info("=====================================================")
    
    while curr < end_dt:
        chunk_end = min(curr + timedelta(days=chunk_days), end_dt)
        from_str = curr.strftime("%Y-%m-%dT00:00:00Z")
        to_str = chunk_end.strftime("%Y-%m-%dT23:59:59Z")
        
        logger.info(f"--> Chunk: {from_str} to {to_str}")
        
        # 1. Fetch FUELHH
        try:
            actual_records = fetch_elexon_stream("FUELHH", from_str, to_str)
            ins_act = insert_actuals(actual_records)
            total_actuals += ins_act
            logger.info(f"    FUELHH: Fetched {len(actual_records)} records, inserted {ins_act} WIND actuals")
        except Exception as e:
            logger.error(f"    FUELHH error: {e}")
            
        # 2. Fetch WINDFOR
        try:
            forecast_records = fetch_elexon_stream("WINDFOR", from_str, to_str)
            ins_fc = insert_forecasts(forecast_records)
            total_forecasts += ins_fc
            logger.info(f"    WINDFOR: Fetched {len(forecast_records)} records, inserted {ins_fc} forecasts")
        except Exception as e:
            logger.error(f"    WINDFOR error: {e}")
            
        curr = chunk_end + timedelta(seconds=1)
        time.sleep(0.3) # Friendly spacing for Elexon BMRS API
        
    duration = time.time() - t0
    logger.info("=====================================================")
    logger.info(f"Ingestion completed in {duration:.2f}s!")
    logger.info(f"Total WIND Actuals Stored: {total_actuals}")
    logger.info(f"Total WINDFOR Forecasts Stored: {total_forecasts}")
    logger.info("=====================================================")
    
    # Verify records in database
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM actual_generation")
    print("Database Actuals Count:", c.fetchone()[0])
    c.execute("SELECT COUNT(*) FROM forecast_generation")
    print("Database Forecasts Count:", c.fetchone()[0])
    conn.close()

if __name__ == "__main__":
    run_ingestion()
