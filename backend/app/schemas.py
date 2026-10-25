from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class AccuracyMetrics(BaseModel):
    sample_count: int
    mae_mw: float = Field(..., description="Mean Absolute Error in MW")
    rmse_mw: float = Field(..., description="Root Mean Square Error in MW")
    bias_mw: float = Field(..., description="Mean Error / Bias in MW (+: Over-forecast, -: Under-forecast)")
    wape_pct: float = Field(..., description="Weighted Absolute Percentage Error %")
    p10_error_mw: float
    p50_error_mw: float
    p90_error_mw: float
    p95_error_mw: float
    max_over_forecast_mw: float
    max_under_forecast_mw: float
    recommended_p90_reserve_mw: float
    recommended_p95_reserve_mw: float

class HourlyComparison(BaseModel):
    hour: int
    time_label: str
    start_time: str
    forecast_mw: Optional[float] = None
    actual_mw: Optional[float] = None
    error_mw: Optional[float] = None
    abs_error_mw: Optional[float] = None
    publish_time: Optional[str] = None

class HalfHourlyComparison(BaseModel):
    settlement_period: int
    start_time: str
    time_label: str
    forecast_mw: Optional[float] = None
    actual_mw: Optional[float] = None
    error_mw: Optional[float] = None

class DayAheadDecisionResponse(BaseModel):
    decision_date: str
    gate_closure: str
    cutoff_publish_time: str
    delivery_date: str
    metrics: AccuracyMetrics
    hourly_comparison: List[HourlyComparison]
    half_hourly_comparison: List[HalfHourlyComparison]

class ProcurementCalculationRequest(BaseModel):
    demand_mw: float = Field(25000.0, description="Customer electricity demand in MW")
    confidence_level: float = Field(90.0, description="Desired risk coverage percentile (e.g. 90% or 95%)")
    decision_date: str = Field("2026-01-15", description="Decision date in YYYY-MM-DD")
    gate_closure_time: str = Field("11:00:00", description="Gate closure time GMT")

class ThermalProcurementSchedule(BaseModel):
    hour: int
    time_label: str
    customer_demand_mw: float
    wind_forecast_mw: float
    unadjusted_thermal_buy_mw: float
    risk_buffer_mw: float
    recommended_thermal_procurement_mw: float
    actual_wind_mw: Optional[float] = None
    net_imbalance_without_buffer_mw: Optional[float] = None
    net_imbalance_with_buffer_mw: Optional[float] = None

class ProcurementCalculationResponse(BaseModel):
    decision_date: str
    delivery_date: str
    confidence_level: float
    total_unadjusted_thermal_buy_mwh: float
    total_recommended_thermal_procurement_mwh: float
    total_buffer_cost_hedging_mwh: float
    hourly_schedule: List[ThermalProcurementSchedule]
