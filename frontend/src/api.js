const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchHealth() {
  const res = await fetch(`${API_BASE_URL}/api/health`);
  return res.json();
}

export async function fetchSystemStatus() {
  const res = await fetch(`${API_BASE_URL}/api/status`);
  return res.json();
}

export async function fetchDayAheadDecision(decisionDate = "2026-01-15", gateClosure = "11:00:00") {
  const params = new URLSearchParams({ decision_date: decisionDate, gate_closure: gateClosure });
  const res = await fetch(`${API_BASE_URL}/api/decision?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch decision data: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchMonthlyAccuracy(year = 2026, month = 1, gateClosure = "11:00:00") {
  const params = new URLSearchParams({ year, month, gate_closure: gateClosure });
  const res = await fetch(`${API_BASE_URL}/api/monthly-accuracy?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch monthly accuracy: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchForecastEvolution(deliveryDate = "2026-01-16") {
  const params = new URLSearchParams({ delivery_date: deliveryDate });
  const res = await fetch(`${API_BASE_URL}/api/forecast-evolution?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch evolution: ${res.statusText}`);
  }
  return res.json();
}

export async function calculateProcurement(demandMw = 25000, confidenceLevel = 90, decisionDate = "2026-01-15", gateClosure = "11:00:00") {
  const res = await fetch(`${API_BASE_URL}/api/procurement-calculator`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      demand_mw: parseFloat(demandMw),
      confidence_level: parseFloat(confidenceLevel),
      decision_date: decisionDate,
      gate_closure_time: gateClosure
    })
  });
  if (!res.ok) {
    throw new Error(`Failed to calculate procurement: ${res.statusText}`);
  }
  return res.json();
}

export async function triggerLiveSync() {
  const res = await fetch(`${API_BASE_URL}/api/sync`, { method: "POST" });
  return res.json();
}
