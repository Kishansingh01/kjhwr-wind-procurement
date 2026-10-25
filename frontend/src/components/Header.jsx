import React from "react";
import { Wind, Activity, Zap, Clock, ShieldCheck, Presentation } from "lucide-react";

export default function Header({ systemStatus, onOpenPitchModal }) {
  const actualCount = systemStatus?.actuals?.record_count || 0;
  const forecastCount = systemStatus?.forecasts?.record_count || 0;

  return (
    <header className="glass-card" style={{ padding: "16px 24px", marginBottom: "20px", borderRadius: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        
        {/* Brand & Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #00e5ff 0%, #3b82f6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(0, 229, 255, 0.4)"
          }}>
            <Wind size={26} color="#04101e" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontSize: "1.35rem", fontWeight: "800", letterSpacing: "-0.02em", color: "#ffffff" }}>
                UK Wind Day-Ahead Procurement Intelligence
              </h1>
              <span className="badge badge-cyan">Elexon BMRS Live</span>
            </div>
            <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              National Renewable Generation Forecasting & Quantified Accuracy Risk Suite • Decision Window: January 2026
            </p>
          </div>
        </div>

        {/* Status badges & Pitch button */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div className="badge badge-emerald" title="30-min settlement actual generation outturn">
            <Activity size={13} />
            <span>FUELHH Actuals: {actualCount.toLocaleString()}</span>
          </div>

          <div className="badge badge-purple" title="Wind generation forecast runs">
            <Zap size={13} />
            <span>WINDFOR Forecasts: {forecastCount.toLocaleString()}</span>
          </div>

          <div className="badge badge-amber" title="UK wholesale Day-Ahead auction gate closure">
            <Clock size={13} />
            <span>Auction Gate: 11:00 GMT</span>
          </div>

          <button
            onClick={onOpenPitchModal}
            className="btn btn-primary"
            style={{ fontSize: "0.8rem", padding: "8px 14px" }}
          >
            <Presentation size={15} />
            <span>Pitch & Tech Review Guide</span>
          </button>
        </div>

      </div>
    </header>
  );
}
