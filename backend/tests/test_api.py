import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db

client = TestClient(app)

def setup_module(module):
    init_db()

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"

def test_status():
    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.json()
    assert "actuals" in data
    assert "forecasts" in data

def test_decision_endpoint():
    res = client.get("/api/decision?decision_date=2026-01-15&gate_closure=11:00:00")
    assert res.status_code == 200
    data = res.json()
    assert data["decision_date"] == "2026-01-15"
    assert data["delivery_date"] == "2026-01-16"
    assert "metrics" in data
    assert "hourly_comparison" in data
    assert len(data["hourly_comparison"]) == 24

def test_procurement_calculator():
    payload = {
        "demand_mw": 30000.0,
        "confidence_level": 90.0,
        "decision_date": "2026-01-15",
        "gate_closure_time": "11:00:00"
    }
    res = client.post("/api/procurement-calculator", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["confidence_level"] == 90.0
    assert len(data["hourly_schedule"]) == 24
    assert data["total_recommended_thermal_procurement_mwh"] >= data["total_unadjusted_thermal_buy_mwh"]
