import json
import logging
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"

def fetch_elexon_stream(dataset: str, from_dt: str, to_dt: str, timeout: int = 45) -> List[Dict[str, Any]]:
    """
    Fetch streaming dataset from Elexon BMRS API with pagination/window parameters.
    dataset: 'FUELHH' or 'WINDFOR'
    from_dt: ISO 8601 string, e.g. '2026-01-01T00:00:00Z'
    to_dt: ISO 8601 string, e.g. '2026-01-05T00:00:00Z'
    """
    url = f"{BASE_URL}/datasets/{dataset}/stream?publishDateTimeFrom={from_dt}&publishDateTimeTo={to_dt}"
    headers = {
        "User-Agent": "AntigravityEnergyTrader/1.0",
        "Accept": "application/json"
    }
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            if response.status != 200:
                logger.error(f"Elexon API returned status {response.status} for {url}")
                return []
            content = response.read().decode("utf-8")
            data = json.loads(content)
            return data if isinstance(data, list) else []
    except urllib.error.HTTPError as e:
        logger.error(f"HTTPError fetching {url}: {e.code} {e.reason}")
        return []
    except Exception as e:
        logger.error(f"Error fetching {url}: {str(e)}")
        return []

def fetch_month_data(dataset: str, year: int = 2026, month: int = 1, chunk_days: int = 4) -> List[Dict[str, Any]]:
    """
    Fetch an entire month of data in safe multi-day chunks to prevent payload timeouts.
    Includes extra padding around month boundaries for Day-Ahead lookbacks (Dec 31 to Feb 2).
    """
    start_date = datetime(year, month, 1) - timedelta(days=2) # include Dec 30/31
    # End around Feb 3
    if month == 12:
        end_date = datetime(year + 1, 1, 3)
    else:
        end_date = datetime(year, month + 1, 3)
    
    current_start = start_date
    all_records = []
    
    while current_start < end_date:
        current_end = min(current_start + timedelta(days=chunk_days), end_date)
        from_str = current_start.strftime("%Y-%m-%dT00:00:00Z")
        to_str = current_end.strftime("%Y-%m-%dT23:59:59Z")
        
        logger.info(f"Fetching {dataset} from {from_str} to {to_str}...")
        records = fetch_elexon_stream(dataset, from_str, to_str)
        all_records.extend(records)
        logger.info(f"Received {len(records)} records for chunk {from_str} -> {to_str}")
        
        current_start = current_end + timedelta(seconds=1)
        
    return all_records
