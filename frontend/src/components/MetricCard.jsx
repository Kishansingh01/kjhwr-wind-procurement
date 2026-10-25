import React from "react";

export default function MetricCard({ title, value, unit, subtitle, icon: Icon, badgeText, badgeColor = "cyan", highlight }) {
  const getBadgeStyle = () => {
    switch (badgeColor) {
      case "emerald":
        return { bg: "rgba(16, 185, 129, 0.12)", text: "#10b981", border: "rgba(16, 185, 129, 0.3)" };
      case "amber":
        return { bg: "rgba(245, 158, 11, 0.12)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" };
      case "rose":
        return { bg: "rgba(244, 63, 94, 0.12)", text: "#f43f5e", border: "rgba(244, 63, 94, 0.3)" };
      case "purple":
        return { bg: "rgba(168, 85, 247, 0.12)", text: "#a855f7", border: "rgba(168, 85, 247, 0.3)" };
      default:
        return { bg: "rgba(0, 229, 255, 0.12)", text: "#00e5ff", border: "rgba(0, 229, 255, 0.3)" };
    }
  };

  const badgeStyle = getBadgeStyle();

  return (
    <div
      className="glass-card"
      style={{
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
        borderLeft: highlight ? `4px solid ${badgeStyle.text}` : undefined
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {title}
        </span>
        {Icon && (
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: badgeStyle.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${badgeStyle.border}`
          }}>
            <Icon size={16} color={badgeStyle.text} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "6px", margin: "4px 0" }}>
        <span style={{ fontSize: "1.75rem", fontWeight: "800", color: "#ffffff", fontFamily: "var(--font-mono)" }}>
          {value !== null && value !== undefined ? value.toLocaleString() : "--"}
        </span>
        {unit && (
          <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-muted)" }}>
            {unit}
          </span>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "0.75rem" }}>
        <span style={{ color: "var(--text-secondary)" }}>{subtitle}</span>
        {badgeText && (
          <span style={{
            fontSize: "0.7rem",
            fontWeight: "700",
            padding: "2px 8px",
            borderRadius: "12px",
            background: badgeStyle.bg,
            color: badgeStyle.text,
            border: `1px solid ${badgeStyle.border}`
          }}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
}
