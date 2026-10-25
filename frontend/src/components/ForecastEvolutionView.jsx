import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";
import { GitBranch, Clock, Calendar, CheckCircle2 } from "lucide-react";
import { fetchForecastEvolution } from "../api";

export default function ForecastEvolutionView({ deliveryDate, onDeliveryDateChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchForecastEvolution(deliveryDate)
      .then((res) => {
        if (mounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [deliveryDate]);

  // Harmonize vintages into time-series chart rows
  const vintages = data?.vintages || [];
  const actuals = data?.actuals || [];

  const timeMap = {};
  for (let h = 0; h < 24; h++) {
    const hStr = `${String(h).padStart(2, "0")}:00`;
    const fullSt = `${deliveryDate}T${hStr}:00Z`;
    timeMap[fullSt] = { time_label: hStr, start_time: fullSt };
  }

  // Populate actuals
  actuals.forEach((a) => {
    if (timeMap[a.start_time]) {
      timeMap[a.start_time]["Actual"] = a.generation_mw;
    }
  });

  // Populate each vintage run
  const vintageKeys = [];
  const vintageColors = ["#6366f1", "#06b6d4", "#00e5ff", "#f59e0b", "#ec4899", "#8b5cf6"];

  vintages.forEach((v, idx) => {
    const ptLabel = `Run: ${v.publish_time.slice(5, 16).replace("T", " ")}Z`;
    vintageKeys.push({ key: `v_${idx}`, label: ptLabel, color: vintageColors[idx % vintageColors.length] });
    v.data.forEach((item) => {
      if (timeMap[item.start_time]) {
        timeMap[item.start_time][`v_${idx}`] = item.generation_mw;
      }
    });
  });

  const chartSeries = Object.values(timeMap).sort((a, b) => a.start_time.localeCompare(b.start_time));

  // January 2026 delivery days (Jan 2 to Feb 1)
  const deliveryDays = Array.from({ length: 31 }, (_, i) => {
    const dt = new Date(2026, 0, i + 2);
    return dt.toISOString().slice(0, 10);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* Control Banner */}
      <div className="glass-card" style={{ padding: "18px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <GitBranch size={20} color="var(--purple-accent)" />
              <h2 style={{ fontSize: "1.15rem", fontWeight: "700" }}>
                Forecast Evolution & Vintage Tracking ("Fan Chart")
              </h2>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Observe how the wind generation forecast updated as weather models digested satellite data closer to real-time.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Calendar size={16} color="var(--cyan-accent)" />
            <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>
              Target Delivery Date:
            </label>
            <select
              className="input-field"
              value={deliveryDate}
              onChange={(e) => onDeliveryDateChange(e.target.value)}
              style={{ cursor: "pointer", fontWeight: "600" }}
            >
              {deliveryDays.map((d) => (
                <option key={d} value={d} style={{ background: "#121826" }}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: "60px", textAlign: "center" }}>
          <div style={{ display: "inline-block", width: "40px", height: "40px", border: "3px solid rgba(168,85,247,0.2)", borderTopColor: "#a855f7", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <p style={{ marginTop: "16px", color: "var(--text-secondary)" }}>Extracting forecast vintages from Elexon BMRS...</p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: "24px" }}>
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700" }}>
              Evolution Across {data?.publish_times_count} Forecast Runs for Delivery Day {deliveryDate}
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Bold Green: Actual Generation Outturn (FUELHH). Colored Lines: Forecast runs published at different horizons.
            </p>
          </div>

          <div style={{ width: "100%", height: "420px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartSeries} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="time_label" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} tickFormatter={(val) => `${val.toLocaleString()} MW`} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(18, 24, 38, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "8px"
                  }}
                  formatter={(val, name) => [`${Number(val).toLocaleString()} MW`, name]}
                />
                <Legend verticalAlign="top" height={44} />

                {/* Actual Outturn Line */}
                <Line
                  type="monotone"
                  dataKey="Actual"
                  name="Final Actual Outturn"
                  stroke="#10b981"
                  strokeWidth={3.5}
                  dot={{ r: 4, fill: "#10b981" }}
                />

                {/* Forecast Vintage Lines */}
                {vintageKeys.map((v) => (
                  <Line
                    key={v.key}
                    type="monotone"
                    dataKey={v.key}
                    name={v.label}
                    stroke={v.color}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}
