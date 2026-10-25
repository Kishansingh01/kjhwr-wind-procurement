import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";
import {
  ShieldCheck,
  Zap,
  Flame,
  TrendingUp,
  Sliders,
  DollarSign,
  AlertCircle
} from "lucide-react";
import MetricCard from "./MetricCard";
import { calculateProcurement } from "../api";

export default function ProcurementCalculatorView({ decisionDate, gateClosure }) {
  const [demandMw, setDemandMw] = useState(28000);
  const [confidenceLevel, setConfidenceLevel] = useState(90);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runCalculation = () => {
    setLoading(true);
    calculateProcurement(demandMw, confidenceLevel, decisionDate, gateClosure)
      .then((res) => {
        setResult(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    runCalculation();
  }, [demandMw, confidenceLevel, decisionDate, gateClosure]);

  const schedule = result?.hourly_schedule || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* Header & Explanation */}
      <div className="glass-card" style={{ padding: "22px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Flame size={20} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "700" }}>
              Day-Ahead Thermal Power Procurement & Dynamic Risk Buffer
            </h2>
            <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)" }}>
              Transforms quantified wind forecast error into an optimized Day-Ahead thermal procurement volume to protect against high System Buy Price (SBP) balancing cashouts.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="glass-card" style={{ padding: "20px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", alignItems: "center" }}>
          
          {/* Demand Input */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                Expected Consumer Demand:
              </label>
              <strong style={{ color: "var(--amber-accent)", fontFamily: "var(--font-mono)" }}>
                {demandMw.toLocaleString()} MW
              </strong>
            </div>
            <input
              type="range"
              min="10000"
              max="45000"
              step="500"
              value={demandMw}
              onChange={(e) => setDemandMw(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--amber-accent)", cursor: "pointer" }}
            />
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              {[15000, 25000, 32000, 38000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDemandMw(preset)}
                  className="btn btn-secondary"
                  style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                >
                  {preset / 1000} GW
                </button>
              ))}
            </div>
          </div>

          {/* Confidence Level Selector */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                Quantified Error Risk Margin (Coverage):
              </label>
              <strong style={{ color: "var(--cyan-accent)", fontFamily: "var(--font-mono)" }}>
                {confidenceLevel}% Confidence
              </strong>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              {[
                { label: "P50 (Median / Neutral)", val: 50 },
                { label: "P80 (Moderate Buffer)", val: 80 },
                { label: "P90 (Standard Safe)", val: 90 },
                { label: "P95 (High Protection)", val: 95 }
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setConfidenceLevel(opt.val)}
                  style={{
                    flex: 1,
                    padding: "8px 6px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    borderRadius: "8px",
                    border: "1px solid",
                    cursor: "pointer",
                    borderColor: confidenceLevel === opt.val ? "var(--cyan-accent)" : "var(--border-color)",
                    background: confidenceLevel === opt.val ? "rgba(0, 229, 255, 0.15)" : "rgba(0, 0, 0, 0.2)",
                    color: confidenceLevel === opt.val ? "var(--cyan-accent)" : "var(--text-secondary)"
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* KPI Cards for Thermal Procurement */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <MetricCard
          title="Unadjusted Day-Ahead Buy"
          value={result?.total_unadjusted_thermal_buy_mwh}
          unit="MWh"
          subtitle="Naive Procurement (Demand - Wind Forecast)"
          icon={Zap}
          badgeText="Unprotected"
          badgeColor="cyan"
        />

        <MetricCard
          title="Recommended Day-Ahead Buy"
          value={result?.total_recommended_thermal_procurement_mwh}
          unit="MWh"
          subtitle="Optimized with Quantified Risk Buffer"
          icon={Flame}
          badgeText={`${confidenceLevel}% Protected`}
          badgeColor="amber"
          highlight
        />

        <MetricCard
          title="Hedging Buffer Volume"
          value={result?.total_buffer_cost_hedging_mwh}
          unit="MWh"
          subtitle="Extra thermal reserve procured"
          icon={ShieldCheck}
          badgeText="Risk Cushion"
          badgeColor="purple"
          highlight
        />
      </div>

      {/* Interactive Procurement Stack Chart */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: "700" }}>
            24-Hour Procurement Stack for Delivery Day {result?.delivery_date}
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Visualizing Consumer Demand (Top Line), Wind Generation (Green), and Recommended Day-Ahead Thermal Buy (Orange).
          </p>
        </div>

        <div style={{ width: "100%", height: "380px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={schedule} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="thermalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="time_label" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k MW`} />
              <Tooltip
                contentStyle={{
                  background: "rgba(18, 24, 38, 0.95)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px"
                }}
                formatter={(val, name) => [`${Number(val).toLocaleString()} MW`, name]}
              />
              <Legend verticalAlign="top" height={36} />

              {/* Consumer Demand Target */}
              <Line
                type="monotone"
                dataKey="customer_demand_mw"
                name="Consumer Electricity Demand"
                stroke="#ffffff"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />

              {/* Recommended Thermal Procurement */}
              <Area
                type="monotone"
                dataKey="recommended_thermal_procurement_mw"
                name="Recommended Thermal Buy (with Buffer)"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#thermalGrad)"
              />

              {/* Wind Generation Forecast */}
              <Line
                type="monotone"
                dataKey="wind_forecast_mw"
                name="Wind Forecast at Gate Closure"
                stroke="#00e5ff"
                strokeWidth={2}
                dot={{ r: 3 }}
              />

              {/* Actual Wind Generation */}
              <Line
                type="monotone"
                dataKey="actual_wind_mw"
                name="Actual Wind Outturn"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Commercial Value Comparison Matrix */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <DollarSign size={18} color="var(--emerald-accent)" />
          <span>Financial Risk Mitigation Analysis: Naive vs Quantified Buffer Procurement</span>
        </h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div style={{ padding: "16px", background: "rgba(244, 63, 94, 0.06)", border: "1px solid rgba(244, 63, 94, 0.2)", borderRadius: "10px" }}>
            <h4 style={{ color: "var(--rose-accent)", fontSize: "0.9rem", fontWeight: "700", marginBottom: "6px" }}>
              Strategy A: Naive Point-Forecast Procurement
            </h4>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              The trader buys exactly <code>Demand - Wind Forecast</code>. When wind underperforms the forecast (50% of the time), the utility enters real-time delivery short and is forced to buy emergency balancing power at volatile System Buy Prices (often £200–£1,000+/MWh).
            </p>
          </div>

          <div style={{ padding: "16px", background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "10px" }}>
            <h4 style={{ color: "var(--emerald-accent)", fontSize: "0.9rem", fontWeight: "700", marginBottom: "6px" }}>
              Strategy B: Quantified Risk-Buffered Procurement (Recommended)
            </h4>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              The trader incorporates the quantified <strong>P{confidenceLevel} safety margin</strong> into the Day-Ahead auction. The utility eliminates 90%+ of balancing cashout spikes, stabilizing operating margins and ensuring compliance with UK grid commitments.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
