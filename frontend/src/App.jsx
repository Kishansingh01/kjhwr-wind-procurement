import React, { useState, useEffect } from "react";
import {
  Calendar,
  Flame,
  BarChart2,
  GitBranch,
  RefreshCw,
  Clock,
  Layers,
  ShieldCheck,
  HelpCircle
} from "lucide-react";
import Header from "./components/Header";
import DayAheadView from "./components/DayAheadView";
import ProcurementCalculatorView from "./components/ProcurementCalculatorView";
import AccuracyEvaluationView from "./components/AccuracyEvaluationView";
import ForecastEvolutionView from "./components/ForecastEvolutionView";
import PitchModal from "./components/PitchModal";
import { fetchDayAheadDecision, fetchSystemStatus, triggerLiveSync } from "./api";

export default function App() {
  const [activeTab, setActiveTab] = useState("day-ahead"); // "day-ahead", "procurement", "accuracy", "evolution"
  const [decisionDate, setDecisionDate] = useState("2026-01-15");
  const [gateClosure, setGateClosure] = useState("11:00:00");
  
  const [decisionData, setDecisionData] = useState(null);
  const [loadingDecision, setLoadingDecision] = useState(true);
  const [systemStatus, setSystemStatus] = useState(null);
  const [isPitchModalOpen, setIsPitchModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Load system status (database count of actuals and forecasts)
  useEffect(() => {
    fetchSystemStatus().then(setSystemStatus).catch(console.error);
  }, []);

  // Load decision data whenever decisionDate or gateClosure changes
  useEffect(() => {
    let mounted = true;
    setLoadingDecision(true);
    fetchDayAheadDecision(decisionDate, gateClosure)
      .then((data) => {
        if (mounted) {
          setDecisionData(data);
          setLoadingDecision(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (mounted) setLoadingDecision(false);
      });
    return () => { mounted = false; };
  }, [decisionDate, gateClosure]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await triggerLiveSync();
      setTimeout(async () => {
        const stat = await fetchSystemStatus();
        setSystemStatus(stat);
        setSyncing(false);
      }, 3000);
    } catch (e) {
      console.error(e);
      setSyncing(false);
    }
  };

  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "20px 24px" }}>
      
      {/* Header */}
      <Header
        systemStatus={systemStatus}
        onOpenPitchModal={() => setIsPitchModalOpen(true)}
      />

      {/* Main Tab Navigation Bar */}
      <div className="glass-card" style={{ padding: "0 16px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={() => setActiveTab("day-ahead")}
            className={`tab-btn ${activeTab === "day-ahead" ? "active" : ""}`}
          >
            <Calendar size={16} />
            <span>Day-Ahead Decision Desk</span>
          </button>

          <button
            onClick={() => setActiveTab("procurement")}
            className={`tab-btn ${activeTab === "procurement" ? "active" : ""}`}
          >
            <Flame size={16} />
            <span>Thermal Procurement & Risk Buffer</span>
          </button>

          <button
            onClick={() => setActiveTab("accuracy")}
            className={`tab-btn ${activeTab === "accuracy" ? "active" : ""}`}
          >
            <BarChart2 size={16} />
            <span>Quantified Accuracy & Error Analysis</span>
          </button>

          <button
            onClick={() => setActiveTab("evolution")}
            className={`tab-btn ${activeTab === "evolution" ? "active" : ""}`}
          >
            <GitBranch size={16} />
            <span>Forecast Evolution ("Fan Chart")</span>
          </button>
        </div>

        {/* Live Status indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0" }}>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn btn-secondary"
            style={{ fontSize: "0.75rem", padding: "5px 10px" }}
            title="Trigger live check against Elexon BMRS API streams"
          >
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
            <span>{syncing ? "Syncing..." : "Sync Elexon Stream"}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <main>
        {activeTab === "day-ahead" && (
          <DayAheadView
            decisionData={decisionData}
            decisionDate={decisionDate}
            onDateChange={setDecisionDate}
            gateClosure={gateClosure}
            onGateClosureChange={setGateClosure}
            loading={loadingDecision}
          />
        )}

        {activeTab === "procurement" && (
          <ProcurementCalculatorView
            decisionDate={decisionDate}
            gateClosure={gateClosure}
          />
        )}

        {activeTab === "accuracy" && (
          <AccuracyEvaluationView
            gateClosure={gateClosure}
          />
        )}

        {activeTab === "evolution" && (
          <ForecastEvolutionView
            deliveryDate={decisionData?.delivery_date || "2026-01-16"}
            onDeliveryDateChange={(d) => {
              // Convert delivery date back to decision date
              const dt = new Date(d);
              dt.setDate(dt.getDate() - 1);
              setDecisionDate(dt.toISOString().slice(0, 10));
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: "40px", padding: "20px 0", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)", fontSize: "0.8rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <span>UK Wholesale Electricity Market • Day-Ahead Renewable Procurement Decision Platform</span>
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          <span>Data: Elexon BMRS (FUELHH & WINDFOR)</span>
          <span>Target Window: January 2026</span>
          <span style={{ color: "var(--cyan-accent)" }}>v1.0.0 Production Ready</span>
        </div>
      </footer>

      {/* Presentation Pitch & Tech Lead Guide Modal */}
      <PitchModal
        isOpen={isPitchModalOpen}
        onClose={() => setIsPitchModalOpen(false)}
      />

    </div>
  );
}
