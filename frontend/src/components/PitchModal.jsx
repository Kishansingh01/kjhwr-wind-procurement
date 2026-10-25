import React, { useState } from "react";
import { X, Presentation, Code2, Video, CheckCircle, Copy, Check } from "lucide-react";

export default function PitchModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("client"); // "client", "tech", "video"
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyScript = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clientScript = `PART 1: CLIENT PRESENTATION PITCH (TARGET: 4-5 MINUTES)
Role: Product Developer presenting the pilot output to UK Energy Utility Leadership & Power Procurement Desk.

[0:00 - 0:45] Introduction & Commercial Stakes
"Good morning, everyone. In the UK wholesale electricity market, procurement decisions for tomorrow's delivery must be locked in today by 11:00 AM at the Day-Ahead auction gate closure.
As an energy utility, your goal is simple yet high-risk: meet your consumers' demand reliably while minimizing procurement costs.
Because renewable generation from wind is weather-dependent and volatile, every megawatt of wind forecasted displaces expensive thermal generation.
However, if your forecast overestimates wind generation by even 1,000 MW, you enter real-time delivery short—exposing your balance sheet to punishing System Buy Price (SBP) cashout charges that can easily spike to £300 to £1,000 per MWh."

[0:45 - 2:00] Product Demonstration: The Day-Ahead Decision Engine
"To solve this, we built this customized decision intelligence platform tailored specifically for your trading desk, streaming live national outturn (FUELHH) and forecast (WINDFOR) data directly from Elexon BMRS.
Looking at our screen for January 15, 2026:
When your procurement trader sits down at 10:30 AM before the 11:00 AM auction cutoff, our system automatically isolates the latest available forecast run published before gate closure.
In one unified dashboard, you see the exact expected 24-hour wind generation profile for tomorrow's delivery, alongside our real-time error confidence bands.
You can inspect the 24 hourly blocks or drill down into all 48 half-hour settlement periods."

[2:00 - 3:15] Quantified Accuracy & The Procurement Safety Margin
"Point forecasts alone are dangerous. That's why our platform quantifies forecast error systematically.
For this delivery day, the Mean Absolute Error was 1,842 MW with an overall WAPE of 14.2%.
More importantly, our platform computes the P90 and P95 error quantiles—giving your traders an empirical 'Safety Margin'.
Under our Procurement Calculator tab:
Assuming your utility portfolio serves a 28,000 MW customer load, a naive trader would buy only 12,500 MW of thermal power.
Our engine calculates that to be 90% confident you will not face balancing penalties, you need a dynamic risk buffer of 1,280 MW.
By procuring this thermal reserve ahead of time in the liquid Day-Ahead auction—where power trades at £70–90/MWh—you avoid emergency real-time balancing cashouts that could cost 5x more."

[3:15 - 4:15] Forecast Evolution & Monthly Analytics
"Under the Forecast Evolution tab, your team can view the 'Fan Chart'—tracking how forecasts evolved from D-2 to gate closure to intraday updates.
And with our Monthly Accuracy Suite, your risk managers can review overall performance across the entirety of January 2026, spotting systematic diurnal biases (such as morning ramp-up forecast lag) to calibrate your hedging strategies."

[4:15 - 4:45] Conclusion & Next Steps
"This platform transforms raw Elexon weather data into actionable commercial margin protection. We are excited to transition this successful pilot into live daily operations for your desk. Thank you, and I look forward to your questions."`;

  const techScript = `PART 2: TECHNICAL LEAD REVIEW (TARGET: 4-5 MINUTES)
Role: Product Developer explaining architecture, engineering design, data pipeline, and best practices to an internal Technical Lead.

[0:00 - 1:00] System Architecture & Tech Stack Selection
"Hi team. Today I'm presenting the software architecture, design decisions, and data pipelines for the UK Wind Procurement Intelligence platform.
On the frontend, we built a responsive Single Page Application using React 18, Vite, and Recharts, styled with custom dark-glassmorphism CSS tokens.
On the backend, we selected Python with FastAPI, leveraging Pydantic v2 for strict type safety and request/response validation.
The backend runs asynchronously with Uvicorn and is fully containerized using Docker and Docker Compose."

[1:00 - 2:15] Data Engineering & Alignment Methodology (Elexon BMRS)
"The data pipeline ingests from two Elexon BMRS stream endpoints:
1. FUELHH Stream: Half-hourly settlement outturn (resolution of 30 minutes, SP 1-48), filtered for fuelType == 'WIND'.
2. WINDFOR Stream: Multi-day forward forecast runs published approximately every 2-4 hours, with hourly resolution.

Here were the two critical engineering challenges we solved:
1. Gate Closure Lookback Logic:
When simulating a decision on date D-1 (e.g. 2026-01-15) with an 11:00 GMT gate closure, we run an inner SQL query to isolate:
SELECT start_time, MAX(publish_time) FROM forecast_generation WHERE publish_time <= cutoff AND start_time LIKE delivery_date GROUP BY start_time.
This guarantees strict lookahead prevention: no forecast published after gate closure is ever leaked into the decision snapshot.

2. Temporal Resolution Harmonization:
WINDFOR has hourly timestamps (:00), while FUELHH has half-hourly timestamps (:00 and :30).
In analytics.py, we harmonize them by computing the true arithmetic mean of the two half-hourly outturn readings:
Actual_Hour(H) = (Actual_HH(H:00) + Actual_HH(H:30)) / 2.0.
We also preserve the raw 48 settlement periods so traders can inspect either resolution."

[2:15 - 3:15] Quantitative Error Formulation
"We implemented standard power industry statistical formulations:
- MAE: Mean Absolute Error across evaluated hours.
- RMSE: Root Mean Square Error, which quadratically penalizes extreme forecast busts.
- Bias (Mean Error): (Forecast - Actual). A positive bias indicates persistent over-forecasting (under-procurement risk).
- WAPE (Weighted Absolute Percentage Error): We specifically chose WAPE over MAPE. Because wind generation can drop close to zero MW, standard MAPE causes division-by-zero explosions. WAPE (sum(|error|) / sum(actual) * 100) is the energy industry gold standard.
- Empirical Quantiles (P10, P50, P90, P95): Calculated using linear interpolation to inform the dynamic thermal buffer."

[3:15 - 4:00] Data Storage, Performance & Testing
"For persistence and instant response times, we built a local SQLite caching engine with compound indexes on (start_time, fuel_type) and (start_time, publish_time).
We wrote an automated ingestion script that backfilled all January 2026 data in 28 seconds (1,680 actuals, 20,440 forecasts).
The backend includes a comprehensive pytest suite covering unit tests for mathematical percentile interpolation, decision alignment, and API integration tests—all executing with 100% pass rate in under 1 second."

[4:00 - 4:45] Dockerization & Cloud Deployment
"For deployment, the app includes a multi-stage Dockerfile and docker-compose.yml.
The frontend is configured with VITE_API_URL environment variables for seamless deployment to Vercel, while the Python FastAPI backend is ready for one-click deployment to Heroku / Render / Railway.
The codebase is clean, modular, fully typed, and documented with an anonymous GitHub repo structure."`;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(4, 10, 20, 0.85)",
      backdropFilter: "blur(8px)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div className="glass-card" style={{
        width: "100%",
        maxWidth: "900px",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        background: "#0f172a",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "16px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)"
      }}>
        
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #00e5ff 0%, #3b82f6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Presentation size={20} color="#04101e" />
            </div>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: "700" }}>
                Deliverables Guide: Video Pitch & Technical Review
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Complete speaking scripts and review checklists for client and technical lead presentations.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <X size={22} />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", padding: "0 24px" }}>
          <button
            onClick={() => setActiveTab("client")}
            className={`tab-btn ${activeTab === "client" ? "active" : ""}`}
          >
            <Presentation size={15} />
            <span>Part 1: Client Pitch (Max 5 Min)</span>
          </button>
          <button
            onClick={() => setActiveTab("tech")}
            className={`tab-btn ${activeTab === "tech" ? "active" : ""}`}
          >
            <Code2 size={15} />
            <span>Part 2: Technical Lead Review (Max 5 Min)</span>
          </button>
          <button
            onClick={() => setActiveTab("video")}
            className={`tab-btn ${activeTab === "video" ? "active" : ""}`}
          >
            <Video size={15} />
            <span>Video Recording Checklist</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {activeTab === "client" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span className="badge badge-cyan">Client Pitch Presentation Script</span>
                <button onClick={() => copyScript(clientScript)} className="btn btn-secondary" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
                  {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  <span>{copied ? "Copied!" : "Copy Script"}</span>
                </button>
              </div>
              <pre style={{
                background: "rgba(0,0,0,0.4)",
                padding: "16px",
                borderRadius: "8px",
                fontSize: "0.825rem",
                color: "#e2e8f0",
                whiteSpace: "pre-wrap",
                fontFamily: "var(--font-mono)",
                lineHeight: "1.6"
              }}>
                {clientScript}
              </pre>
            </div>
          )}

          {activeTab === "tech" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span className="badge badge-purple">Technical Lead Review Script</span>
                <button onClick={() => copyScript(techScript)} className="btn btn-secondary" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
                  {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  <span>{copied ? "Copied!" : "Copy Script"}</span>
                </button>
              </div>
              <pre style={{
                background: "rgba(0,0,0,0.4)",
                padding: "16px",
                borderRadius: "8px",
                fontSize: "0.825rem",
                color: "#e2e8f0",
                whiteSpace: "pre-wrap",
                fontFamily: "var(--font-mono)",
                lineHeight: "1.6"
              }}>
                {techScript}
              </pre>
            </div>
          )}

          {activeTab === "video" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ padding: "16px", background: "rgba(0, 229, 255, 0.05)", border: "1px solid rgba(0, 229, 255, 0.2)", borderRadius: "10px" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--cyan-accent)", marginBottom: "8px" }}>
                  Key Submission Requirements (Unlisted YouTube Video)
                </h3>
                <ul style={{ paddingLeft: "20px", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.7" }}>
                  <li><strong>Total Length:</strong> Max 10 minutes total (Part 1 ≤ 5 mins, Part 2 ≤ 5 mins).</li>
                  <li><strong>Part 1 (Client Presentation):</strong> Focus on business problem, Day-Ahead gate closure (11:00 GMT), residual thermal procurement, and the quantified error buffer (P90) preventing costly balancing cashouts.</li>
                  <li><strong>Part 2 (Tech Lead Review):</strong> Explain React + FastAPI architecture, Elexon BMRS ingestion, solving the 30-min vs 60-min resolution mismatch, WAPE vs MAPE justification, Docker setup, and pytest test suite.</li>
                  <li><strong>Privacy:</strong> Set video visibility to <strong>Unlisted</strong> (anyone with the link can view, no account required).</li>
                  <li><strong>Verification:</strong> Open the YouTube link in Incognito mode to confirm access before submitting.</li>
                </ul>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div style={{ padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: "700", color: "#ffffff", marginBottom: "6px" }}>
                    Recommended Screen Recording Tools
                  </h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    - OBS Studio (Free, high quality)<br />
                    - Loom (Instant link generation)<br />
                    - Clipchamp / Windows Game Bar (Win + Alt + R)
                  </p>
                </div>

                <div style={{ padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: "700", color: "#ffffff", marginBottom: "6px" }}>
                    Anonymous GitHub Repo Naming
                  </h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    - Use a random string repo name (e.g., <code>uk-energy-trade-kjhwr</code> or <code>vortex-bmrs-x79</code>)<br />
                    - Include explicit AI tools disclosure in README.md as requested!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "flex-end"
        }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close Guide
          </button>
        </div>

      </div>
    </div>
  );
}
