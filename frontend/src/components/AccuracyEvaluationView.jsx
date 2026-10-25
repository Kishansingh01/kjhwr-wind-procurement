import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from "recharts";
import {
  TrendingDown,
  Activity,
  BarChart2,
  Calendar,
  Layers,
  ShieldAlert
} from "lucide-react";
import MetricCard from "./MetricCard";
import { fetchMonthlyAccuracy } from "../api";

export default function AccuracyEvaluationView({ gateClosure }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchMonthlyAccuracy(2026, 1, gateClosure)
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
  }, [gateClosure]);

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: "60px", textAlign: "center" }}>
        <div style={{ display: "inline-block", width: "40px", height: "40px", border: "3px solid rgba(0,229,255,0.2)", borderTopColor: "#00e5ff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ marginTop: "16px", color: "var(--text-secondary)" }}>Computing quantitative accuracy metrics across all January 2026 decisions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ padding: "30px", borderLeft: "4px solid var(--rose-accent)" }}>
        <h3 style={{ color: "var(--rose-accent)" }}>Error Loading Accuracy Data</h3>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px" }}>{error}</p>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const dailySummaries = data?.daily_summaries || [];
  const hourlyProfile = data?.hourly_profile || [];
  const distribution = data?.error_distribution || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* Overview Banner */}
      <div className="glass-card" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#ffffff" }}>
              January 2026 Monthly Quantitative Forecast Evaluation
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Benchmarked across all 31 Day-Ahead gate closure decisions made in January 2026 ({data?.total_evaluations} hourly outturn comparisons)
            </p>
          </div>
          <div className="badge badge-cyan" style={{ fontSize: "0.8rem", padding: "6px 12px" }}>
            <span>Elexon BMRS WINDFOR vs FUELHH</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
        <MetricCard
          title="Monthly Overall MAE"
          value={metrics.overall_mae_mw}
          unit="MW"
          subtitle="Mean Absolute Error across month"
          icon={TrendingDown}
          badgeText="Month Benchmark"
          badgeColor="cyan"
          highlight
        />

        <MetricCard
          title="Monthly Overall RMSE"
          value={metrics.overall_rmse_mw}
          unit="MW"
          subtitle="Variance & extreme ramp penalty"
          icon={Activity}
          badgeText="Root Mean Sq"
          badgeColor="purple"
        />

        <MetricCard
          title="Overall Forecast Bias"
          value={metrics.overall_bias_mw}
          unit="MW"
          subtitle={metrics.overall_bias_mw > 0 ? "Net Over-forecast tendency" : "Net Under-forecast tendency"}
          icon={BarChart2}
          badgeText={metrics.overall_bias_mw > 0 ? "Over-Forecast" : "Under-Forecast"}
          badgeColor={metrics.overall_bias_mw > 0 ? "rose" : "emerald"}
          highlight
        />

        <MetricCard
          title="P90 Risk Percentile"
          value={metrics.p90_error_mw}
          unit="MW"
          subtitle="90% of hours error is below this"
          icon={ShieldAlert}
          badgeText="90% Quantile"
          badgeColor="amber"
          highlight
        />

        <MetricCard
          title="P95 Risk Percentile"
          value={metrics.p95_error_mw}
          unit="MW"
          subtitle="95% conservative risk buffer"
          icon={ShieldAlert}
          badgeText="95% Quantile"
          badgeColor="rose"
        />
      </div>

      {/* Daily Error Trend across January 2026 */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: "700" }}>
            Daily MAE & RMSE Trend Across January 2026 Decisions
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Tracking forecast volatility day-by-day. High spikes correspond to Atlantic storm fronts passing over Great Britain.
          </p>
        </div>

        <div style={{ width: "100%", height: "320px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dailySummaries} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="decision_date" stroke="var(--text-muted)" fontSize={11} tickFormatter={(d) => d.slice(5)} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(val) => `${val} MW`} />
              <Tooltip
                contentStyle={{
                  background: "rgba(18, 24, 38, 0.95)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px"
                }}
                formatter={(val, name) => [`${Number(val).toLocaleString()} MW`, name]}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="mae_mw" name="Daily MAE (MW)" fill="#00e5ff" opacity={0.8} rx={4} />
              <Line type="monotone" dataKey="rmse_mw" name="Daily RMSE (MW)" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="p90_error_mw" name="P90 Risk Buffer (MW)" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly Error Profile across 24 Hours */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px" }}>
        
        {/* Hourly Diurnal Error Profile */}
        <div className="glass-card" style={{ padding: "24px" }}>
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700" }}>
              Diurnal Error Profile (Hours 00:00 to 23:00)
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Average MAE and Bias by time of day, pinpointing morning ramp and evening peak risk.
            </p>
          </div>

          <div style={{ width: "100%", height: "280px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hourlyProfile} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="time_label" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(val) => `${val} MW`} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(18, 24, 38, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "8px"
                  }}
                  formatter={(val, name) => [`${Number(val).toLocaleString()} MW`, name]}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="mae_mw" name="Hourly MAE (MW)" fill="#10b981" opacity={0.75} rx={3} />
                <Line type="monotone" dataKey="bias_mw" name="Hourly Bias (MW)" stroke="#f43f5e" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Forecast Error Distribution Histogram */}
        <div className="glass-card" style={{ padding: "24px" }}>
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700" }}>
              Forecast Error Distribution & Quantiles
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Empirical probability density of error in MW (P10, Median P50, P90 lines marked).
            </p>
          </div>

          <div style={{ width: "100%", height: "280px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={distribution} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="bin_label" stroke="var(--text-muted)" fontSize={10} angle={-30} textAnchor="end" height={50} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(18, 24, 38, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "8px"
                  }}
                  formatter={(val) => [`${val} occurrences`, "Frequency"]}
                />
                <Bar dataKey="count" name="Frequency Count" fill="#3b82f6" rx={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
