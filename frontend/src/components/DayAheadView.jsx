import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from "recharts";
import {
  Calendar,
  Clock,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Download,
  Layers,
  ArrowRight
} from "lucide-react";
import MetricCard from "./MetricCard";

export default function DayAheadView({
  decisionData,
  decisionDate,
  onDateChange,
  gateClosure,
  onGateClosureChange,
  loading
}) {
  const [viewMode, setViewMode] = useState("hourly"); // "hourly" or "half-hourly"

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: "60px", textAlign: "center" }}>
        <div style={{ display: "inline-block", width: "40px", height: "40px", border: "3px solid rgba(0,229,255,0.2)", borderTopColor: "#00e5ff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ marginTop: "16px", color: "var(--text-secondary)" }}>Loading Day-Ahead market forecasts and actuals...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const metrics = decisionData?.metrics || {};
  const hourlyData = decisionData?.hourly_comparison || [];
  const halfHourlyData = decisionData?.half_hourly_comparison || [];

  const chartData = viewMode === "hourly" ? hourlyData : halfHourlyData;

  const exportCSV = () => {
    if (!hourlyData.length) return;
    const headers = ["Hour", "StartTime", "Forecast_MW", "Actual_MW", "Error_MW", "AbsError_MW"];
    const rows = hourlyData.map(h => [
      h.hour,
      h.start_time,
      h.forecast_mw ?? "",
      h.actual_mw ?? "",
      h.error_mw ?? "",
      h.abs_error_mw ?? ""
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `wind_day_ahead_${decisionData?.decision_date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // January 2026 decision days array
  const janDays = Array.from({ length: 31 }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    return `2026-01-${day}`;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* Control Bar: Decision Date & Gate Closure */}
      <div className="glass-card" style={{ padding: "18px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            {/* Decision Date selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Calendar size={18} color="var(--cyan-accent)" />
              <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                Decision Date (D-1):
              </label>
              <select
                className="input-field"
                value={decisionDate}
                onChange={(e) => onDateChange(e.target.value)}
                style={{ cursor: "pointer", fontWeight: "600" }}
              >
                {janDays.map((d) => (
                  <option key={d} value={d} style={{ background: "#121826", color: "#fff" }}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Gate Closure selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={18} color="var(--amber-accent)" />
              <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                Auction Gate Closure:
              </label>
              <select
                className="input-field"
                value={gateClosure}
                onChange={(e) => onGateClosureChange(e.target.value)}
                style={{ cursor: "pointer" }}
              >
                <option value="11:00:00" style={{ background: "#121826" }}>11:00 GMT (EPEX/N2EX Auction Default)</option>
                <option value="12:00:00" style={{ background: "#121826" }}>12:00 GMT (Pan-European Day-Ahead)</option>
                <option value="09:30:00" style={{ background: "#121826" }}>09:30 GMT (Early Morning Run)</option>
                <option value="07:30:00" style={{ background: "#121826" }}>07:30 GMT (Pre-Morning Briefing)</option>
              </select>
            </div>
          </div>

          {/* Delivery Target Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              background: "rgba(0, 229, 255, 0.08)",
              border: "1px solid rgba(0, 229, 255, 0.2)",
              padding: "6px 14px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.85rem"
            }}>
              <span style={{ color: "var(--text-secondary)" }}>Target Delivery Day (D):</span>
              <strong style={{ color: "var(--cyan-accent)", fontFamily: "var(--font-mono)" }}>
                {decisionData?.delivery_date}
              </strong>
            </div>

            <button onClick={exportCSV} className="btn btn-secondary" title="Export to CSV">
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
        <MetricCard
          title="Mean Absolute Error (MAE)"
          value={metrics.mae_mw}
          unit="MW"
          subtitle="Average deviation magnitude"
          icon={TrendingDown}
          badgeText={`WAPE: ${metrics.wape_pct}%`}
          badgeColor="cyan"
          highlight
        />

        <MetricCard
          title="Root Mean Sq Error (RMSE)"
          value={metrics.rmse_mw}
          unit="MW"
          subtitle="Heavy penalty on ramp spikes"
          icon={AlertTriangle}
          badgeText="Quadratic"
          badgeColor="purple"
        />

        <MetricCard
          title="Forecast Bias (Mean Error)"
          value={metrics.bias_mw}
          unit="MW"
          subtitle={metrics.bias_mw > 0 ? "Systematic Over-forecast (Deficit Risk)" : "Systematic Under-forecast (Spill Risk)"}
          icon={metrics.bias_mw > 0 ? TrendingUp : TrendingDown}
          badgeText={metrics.bias_mw > 0 ? "Over-forecast" : "Under-forecast"}
          badgeColor={metrics.bias_mw > 0 ? "rose" : "emerald"}
          highlight
        />

        <MetricCard
          title="P90 Risk Buffer"
          value={metrics.p90_error_mw}
          unit="MW"
          subtitle="90% coverage safety margin"
          icon={TrendingUp}
          badgeText="90th Percentile"
          badgeColor="amber"
          highlight
        />

        <MetricCard
          title="Max Over-Forecast Swing"
          value={metrics.max_over_forecast_mw}
          unit="MW"
          subtitle="Worst hourly deficit scenario"
          icon={AlertTriangle}
          badgeText="Balancing Cashout Risk"
          badgeColor="rose"
        />
      </div>

      {/* Main Interactive Chart: Gate Closure Forecast vs Outturn */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff" }}>
              Day-Ahead Forecast vs Actual Generation Outturn
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Forecast locked at {decisionData?.gate_closure} GMT on {decisionData?.decision_date} (D-1) for delivery on {decisionData?.delivery_date} (D)
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", borderRadius: "8px", padding: "3px" }}>
              <button
                onClick={() => setViewMode("hourly")}
                style={{
                  padding: "5px 12px",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  background: viewMode === "hourly" ? "var(--cyan-accent)" : "transparent",
                  color: viewMode === "hourly" ? "#04101e" : "var(--text-secondary)"
                }}
              >
                Hourly (24H)
              </button>
              <button
                onClick={() => setViewMode("half-hourly")}
                style={{
                  padding: "5px 12px",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  background: viewMode === "half-hourly" ? "var(--cyan-accent)" : "transparent",
                  color: viewMode === "half-hourly" ? "#04101e" : "var(--text-secondary)"
                }}
              >
                Settlement Periods (SP 1-48)
              </button>
            </div>
          </div>
        </div>

        <div style={{ width: "100%", height: "380px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00e5ff" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="time_label"
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                tickFormatter={(val) => `${val.toLocaleString()} MW`}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(18, 24, 38, 0.95)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
                }}
                formatter={(value, name) => [`${Number(value).toLocaleString()} MW`, name]}
              />
              <Legend verticalAlign="top" height={36} />
              
              <Area
                type="monotone"
                dataKey="actual_mw"
                name="Actual Outturn (FUELHH)"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#actualGrad)"
              />
              <Line
                type="monotone"
                dataKey="forecast_mw"
                name="Day-Ahead Forecast (WINDFOR)"
                stroke="#00e5ff"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: "#00e5ff" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly Forecast Error (Imbalance Exposure) Bar Chart */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff" }}>
            Hourly Forecast Error (Imbalance Volume Risk)
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Positive (Red): Over-forecast — Utility under-buys thermal power & faces real-time deficit. 
            Negative (Green): Under-forecast — Utility over-buys thermal power.
          </p>
        </div>

        <div style={{ width: "100%", height: "260px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="time_label" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} tickFormatter={(val) => `${val} MW`} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
              <Tooltip
                contentStyle={{
                  background: "rgba(18, 24, 38, 0.95)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px"
                }}
                formatter={(val) => [`${Number(val).toLocaleString()} MW`, "Forecast Error (Forecast - Actual)"]}
              />
              <Bar
                dataKey="error_mw"
                name="Error (MW)"
                shape={(props) => {
                  const { fill, x, y, width, height, value } = props;
                  const color = value > 0 ? "#f43f5e" : "#10b981";
                  return <rect x={x} y={y} width={width} height={height} fill={color} rx={3} />;
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Settlement Periods & Hourly Breakdown Table */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "14px" }}>
          Delivery Schedule Breakdown ({viewMode === "hourly" ? "24 Hourly Blocks" : "48 Settlement Periods"})
        </h3>
        <div style={{ overflowX: "auto", maxHeight: "360px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                <th style={{ padding: "10px" }}>{viewMode === "hourly" ? "Hour" : "SP"}</th>
                <th style={{ padding: "10px" }}>Target Time (UTC)</th>
                <th style={{ padding: "10px" }}>Forecast (MW)</th>
                <th style={{ padding: "10px" }}>Actual Outturn (MW)</th>
                <th style={{ padding: "10px" }}>Forecast Error (MW)</th>
                <th style={{ padding: "10px" }}>Absolute Error (MW)</th>
                <th style={{ padding: "10px" }}>Market Imbalance Implication</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, idx) => {
                const err = row.error_mw;
                return (
                  <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "10px", fontWeight: "600", fontFamily: "var(--font-mono)" }}>
                      {viewMode === "hourly" ? `H${row.hour}` : `SP ${row.settlement_period}`}
                    </td>
                    <td style={{ padding: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      {row.time_label}
                    </td>
                    <td style={{ padding: "10px", color: "var(--cyan-accent)", fontWeight: "600", fontFamily: "var(--font-mono)" }}>
                      {row.forecast_mw !== null ? `${row.forecast_mw.toLocaleString()} MW` : "--"}
                    </td>
                    <td style={{ padding: "10px", color: "var(--emerald-accent)", fontWeight: "600", fontFamily: "var(--font-mono)" }}>
                      {row.actual_mw !== null ? `${row.actual_mw.toLocaleString()} MW` : "--"}
                    </td>
                    <td style={{
                      padding: "10px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: "700",
                      color: err > 0 ? "var(--rose-accent)" : err < 0 ? "var(--emerald-accent)" : "var(--text-muted)"
                    }}>
                      {err !== null ? `${err > 0 ? "+" : ""}${err.toLocaleString()} MW` : "--"}
                    </td>
                    <td style={{ padding: "10px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                      {row.abs_error_mw !== undefined ? `${row.abs_error_mw.toLocaleString()} MW` : err !== null ? `${Math.abs(err).toLocaleString()} MW` : "--"}
                    </td>
                    <td style={{ padding: "10px" }}>
                      {err > 500 ? (
                        <span className="badge badge-rose" style={{ fontSize: "0.7rem" }}>Shortfall Exposure (SBP)</span>
                      ) : err < -500 ? (
                        <span className="badge badge-emerald" style={{ fontSize: "0.7rem" }}>Surplus Spill (SSP)</span>
                      ) : (
                        <span className="badge badge-cyan" style={{ fontSize: "0.7rem" }}>Balanced</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
