from fastapi import FastAPI, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, Any
import logging
from datetime import datetime, timedelta

from .database import init_db, get_connection, insert_actuals, insert_forecasts
from .analytics import (
    get_day_ahead_decision,
    get_monthly_evaluation,
    get_forecast_evolution,
    calculate_percentile
)
from .schemas import (
    DayAheadDecisionResponse,
    ProcurementCalculationRequest,
    ProcurementCalculationResponse,
    ThermalProcurementSchedule
)
from .elexon_client import fetch_elexon_stream, fetch_month_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("elexon_wind_app")

app = FastAPI(
    title="UK Wind Day-Ahead Decision & Forecasting Intelligence API",
    description="Product for UK Energy Utility Day-Ahead Power Procurement & Quantified Forecast Error Evaluation (Elexon BMRS data)",
    version="1.0.0"
)

# Enable CORS for React frontend (Vite dev server, Vercel, localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()
    logger.info("Database initialized successfully.")

from datetime import datetime, timezone

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "elexon-wind-forecasting-api", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/api/status")
def get_system_status():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) as count, MIN(start_time) as min_st, MAX(start_time) as max_st FROM actual_generation")
    actual_stat = c.fetchone()
    
    c.execute("SELECT COUNT(*) as count, MIN(publish_time) as min_pt, MAX(publish_time) as max_pt FROM forecast_generation")
    forecast_stat = c.fetchone()
    
    c.execute("SELECT * FROM sync_history ORDER BY synced_at DESC LIMIT 5")
    syncs = [dict(r) for r in c.fetchall()]
    conn.close()
    
    return {
        "actuals": {
            "record_count": actual_stat["count"],
            "earliest_start_time": actual_stat["min_st"],
            "latest_start_time": actual_stat["max_st"]
        },
        "forecasts": {
            "record_count": forecast_stat["count"],
            "earliest_publish_time": forecast_stat["min_pt"],
            "latest_publish_time": forecast_stat["max_pt"]
        },
        "recent_syncs": syncs
    }

@app.get("/api/decision", response_model=DayAheadDecisionResponse)
def get_decision(
    decision_date: str = Query("2026-01-15", pattern=r"^\d{4}-\d{2}-\d{2}$", description="Decision date in YYYY-MM-DD"),
    gate_closure: str = Query("11:00:00", description="Day-Ahead gate closure time GMT (default 11:00:00)")
):
    """
    Get the Day-Ahead forecast visible at Gate Closure on decision_date,
    compared against the outturn on delivery_date (decision_date + 1).
    """
    try:
        result = get_day_ahead_decision(decision_date, gate_closure)
        return result
    except Exception as e:
        logger.error(f"Error computing decision for {decision_date}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/monthly-accuracy")
def get_monthly_accuracy(
    year: int = Query(2026, ge=2020, le=2030),
    month: int = Query(1, ge=1, le=12),
    gate_closure: str = Query("11:00:00")
):
    """
    Comprehensive quantitative evaluation across all Day-Ahead decisions made during the specified month.
    Returns MAE, RMSE, Bias, P10/P50/P90/P95, hourly error profiles, and error distribution.
    """
    try:
        return get_monthly_evaluation(year, month, gate_closure)
    except Exception as e:
        logger.error(f"Error evaluating month {year}-{month}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/forecast-evolution")
def get_evolution(
    delivery_date: str = Query("2026-01-16", pattern=r"^\d{4}-\d{2}-\d{2}$")
):
    """
    Trace the evolution ('fan chart') of forecasts across lead times (D-2, D-1 gate closure, intraday)
    for a given delivery day.
    """
    try:
        return get_forecast_evolution(delivery_date)
    except Exception as e:
        logger.error(f"Error computing evolution for {delivery_date}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/procurement-calculator", response_model=ProcurementCalculationResponse)
def calculate_procurement(req: ProcurementCalculationRequest):
    """
    Simulate thermal power procurement for the Day-Ahead market:
    Calculates residual demand (Demand - Wind Forecast) and adds a dynamic
    procurement risk buffer based on the user's desired confidence level.
    """
    decision_res = get_day_ahead_decision(req.decision_date, req.gate_closure_time)
    hourly = decision_res["hourly_comparison"]
    metrics = decision_res["metrics"]
    
    # Determine the buffer based on requested confidence level
    # If 90%, use p90; if 95%, use p95; or dynamically estimate
    if req.confidence_level >= 95:
        buffer_val = metrics["p95_error_mw"]
    elif req.confidence_level >= 90:
        buffer_val = metrics["p90_error_mw"]
    elif req.confidence_level >= 50:
        buffer_val = metrics["p50_error_mw"]
    else:
        buffer_val = 0.0
        
    buffer_val = max(0.0, buffer_val) # Buffer to cover shortfall (over-forecast)
    
    schedule = []
    total_unadjusted_mwh = 0.0
    total_recommended_mwh = 0.0
    
    for h in hourly:
        fc = h["forecast_mw"] or 0.0
        act = h["actual_mw"]
        
        # Net thermal requirement = Demand - Wind
        unadjusted = max(0.0, req.demand_mw - fc)
        recommended = max(0.0, req.demand_mw - fc + buffer_val)
        
        # In real delivery:
        # Imbalance without buffer: Demand - (Wind Actual + Unadjusted Buy) = Wind Forecast - Wind Actual
        imbalance_no_buf = (fc - act) if act is not None else None
        # Imbalance with buffer:
        imbalance_with_buf = (fc - act - buffer_val) if act is not None else None
        
        schedule.append(ThermalProcurementSchedule(
            hour=h["hour"],
            time_label=h["time_label"],
            customer_demand_mw=req.demand_mw,
            wind_forecast_mw=fc,
            unadjusted_thermal_buy_mw=round(unadjusted, 1),
            risk_buffer_mw=round(buffer_val, 1),
            recommended_thermal_procurement_mw=round(recommended, 1),
            actual_wind_mw=act,
            net_imbalance_without_buffer_mw=round(imbalance_no_buf, 1) if imbalance_no_buf is not None else None,
            net_imbalance_with_buffer_mw=round(imbalance_with_buf, 1) if imbalance_with_buf is not None else None
        ))
        
        total_unadjusted_mwh += unadjusted
        total_recommended_mwh += recommended

    return ProcurementCalculationResponse(
        decision_date=req.decision_date,
        delivery_date=decision_res["delivery_date"],
        confidence_level=req.confidence_level,
        total_unadjusted_thermal_buy_mwh=round(total_unadjusted_mwh, 1),
        total_recommended_thermal_procurement_mwh=round(total_recommended_mwh, 1),
        total_buffer_cost_hedging_mwh=round(total_recommended_mwh - total_unadjusted_mwh, 1),
        hourly_schedule=schedule
    )

def _background_sync_task():
    logger.info("Starting background ingestion for January 2026 data...")
    init_db()
    # Ingest actuals
    fuelhh_data = fetch_month_data("FUELHH", year=2026, month=1, chunk_days=5)
    ins_actual = insert_actuals(fuelhh_data)
    # Ingest forecasts
    windfor_data = fetch_month_data("WINDFOR", year=2026, month=1, chunk_days=5)
    ins_fc = insert_forecasts(windfor_data)
    logger.info(f"Ingestion finished: {ins_actual} actuals, {ins_fc} forecasts inserted.")

@app.post("/api/sync")
def trigger_sync(background_tasks: BackgroundTasks):
    """
    Trigger ingestion of January 2026 data from Elexon BMRS API streams.
    """
    background_tasks.add_task(_background_sync_task)
    return {"message": "Background sync task started for January 2026"}
