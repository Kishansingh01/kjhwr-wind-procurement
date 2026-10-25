# UK Wind Day-Ahead Procurement & Forecast Error Intelligence Platform

> **Tailored Decision Support Suite for UK Wholesale Electricity Market Traders & Energy Utilities**  
> *Data Source: Elexon BMRS Stream API (`FUELHH` Actuals & `WINDFOR` Forecasts)*  
> *Target Decision Window: January 2026*

---

## 1. Executive Summary & Problem Setting

In Great Britain (GB), wholesale power is procured on day-ahead power exchanges (EPEX SPOT and Nord Pool N2EX). The auction gate closure occurs daily at **11:00 AM GMT on Day $D-1$** for power delivery across the 24 hours (48 settlement periods) of **Day $D$**.

An energy utility serving consumer electricity demand must calculate its residual thermal buy requirement:
$$\text{Thermal Procurement}(t) = \text{Consumer Demand}(t) - \text{Wind Generation}(t)$$

Because wind power is weather-dependent and volatile:
1. **Over-forecasting Wind:** The utility under-procures thermal power day-ahead. During delivery, it faces an energy deficit and is penalized at the volatile **System Buy Price (SBP)** in the Balancing Mechanism.
2. **Under-forecasting Wind:** The utility over-buys expensive thermal power and is forced to spill or sell excess power at discounted **System Sell Prices (SSP)**.

This software product provides:
- **Decision Visibility:** Isolates the exact latest wind generation forecast visible at the **11:00 AM GMT Gate Closure** on Day $D-1$.
- **Quantified Forecast Error & Risk Buffers:** Computes MAE, RMSE, Bias, and empirical error quantiles (P10, P50, P90, P95) to calculate a dynamic **Procurement Safety Margin (MW)** that hedges balancing cashout risk.

---

## 2. System Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │               React Frontend                 │
                    │  (Vite + TypeScript/ES6 + Recharts + CSS)    │
                    │  - Day-Ahead Decision Desk (11:00 GMT Gate)  │
                    │  - Thermal Procurement & Risk Buffer Calc    │
                    │  - Quantified Accuracy & Diurnal Heatmaps    │
                    │  - Forecast Evolution ("Fan Chart")          │
                    └──────────────────────┬───────────────────────┘
                                           │ REST API (JSON)
                    ┌──────────────────────▼───────────────────────┐
                    │            Python Backend (FastAPI)          │
                    │  - Pydantic v2 Type Safety & Schema Models   │
                    │  - Gate Closure Lookback Engine              │
                    │  - Temporal Harmonization (HH vs Hourly)     │
                    │  - Statistical Percentile & Quantile Engine  │
                    └──────────────────────┬───────────────────────┘
                                           │
                    ┌──────────────────────▼───────────────────────┐
                    │        Data Caching & Ingestion Layer        │
                    │  - SQLite (elexon_wind.db with index lookup) │
                    │  - 1,680 FUELHH Actuals (Jan 2026)           │
                    │  - 20,440 WINDFOR Forecast Runs              │
                    │  - Live streaming sync from Elexon BMRS API  │
                    └──────────────────────────────────────────────┘
```

---

## 3. Directory & File Structure

```
├── docker-compose.yml              # One-command orchestration for backend and frontend
├── README.md                       # Comprehensive documentation & presentation guide
├── backend/
│   ├── Dockerfile                  # Python 3.12 slim container
│   ├── Procfile                    # Heroku deployment configuration
│   ├── requirements.txt            # Python dependencies (FastAPI, Uvicorn, Requests, Pytest)
│   ├── conftest.py                 # Pytest root path configuration
│   ├── ingest_january_2026.py      # Automated Elexon BMRS ingestion script
│   ├── elexon_wind.db              # Preloaded SQLite database (January 2026 datasets)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI application & REST endpoints
│   │   ├── database.py             # SQLite schema, indexing & insertion utilities
│   │   ├── analytics.py            # Mathematical error metrics & gate closure alignment
│   │   ├── elexon_client.py        # Elexon BMRS streaming API client
│   │   └── schemas.py              # Pydantic v2 request/response models
│   └── tests/
│       ├── test_analytics.py       # Unit tests for percentile interpolation & metrics
│       └── test_api.py             # API integration test suite
└── frontend/
    ├── Dockerfile                  # Multi-stage build (Node 22 + Nginx Alpine)
    ├── nginx.conf                  # Nginx reverse proxy configuration
    ├── package.json                # React 18, Vite, Recharts, Lucide-React
    ├── vercel.json                 # Vercel deployment routing configuration
    ├── index.html
    └── src/
        ├── App.jsx                 # Master application controller & tab navigation
        ├── index.css               # Dark-glassmorphism trading design system
        ├── api.js                  # Axios/Fetch client connecting to FastAPI backend
        └── components/
            ├── Header.jsx          # Header with live BMRS status & modal trigger
            ├── MetricCard.jsx      # Reusable KPI card with delta indicators
            ├── DayAheadView.jsx    # Primary 11:00 GMT Gate Closure decision desk
            ├── ProcurementCalculatorView.jsx # Thermal procurement & P90 reserve buffer
            ├── AccuracyEvaluationView.jsx    # Monthly MAE, RMSE, Diurnal error & Histogram
            ├── ForecastEvolutionView.jsx     # Forecast revision vintage tracking ("Fan Chart")
            └── PitchModal.jsx      # Video demo scripts & presentation guides
```

---

## 4. How to Start the Application

### Option A: Using Docker (Recommended)
Make sure Docker and Docker Compose are installed:
```bash
docker-compose up --build
```
- Frontend UI: `http://localhost:3000`
- Backend API Docs: `http://localhost:8000/docs`

---

### Option B: Running Locally (Development Mode)

#### 1. Backend Setup (Python 3.10+):
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt

# (Optional) Re-run data ingestion if elexon_wind.db is not present:
python ingest_january_2026.py

# Run test suite:
python -m pytest tests

# Start FastAPI server:
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup (Node.js 18+):
```bash
cd frontend
npm install
npm run dev
```
Open your browser to `http://localhost:5173`.

---

## 5. Deployment Guide

### Frontend Deployment (Vercel)
1. Fork or push the repo to GitHub.
2. In Vercel, import the repository and set the **Root Directory** to `frontend`.
3. Add the Environment Variable:
   - `VITE_API_URL`: Your deployed backend URL (e.g., `https://your-backend.herokuapp.com`).
4. Deploy! `vercel.json` handles Single Page Application routing automatically.

### Backend Deployment (Heroku / Render / Railway)
1. For Heroku, the included `backend/Procfile` specifies:
   `web: uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`
2. Deploy the `backend/` folder. Ensure the SQLite database `elexon_wind.db` is included in the build.
3. Access interactive Swagger documentation at `https://<your-app>.herokuapp.com/docs`.

---

## 6. Video Presentation Guide (10 Minutes Total)

The deliverables requirement specifies an unlisted YouTube video with two distinct 5-minute halves:

### Part 1: Client Pitch Presentation (≤ 5 mins)
- **Target Audience:** Commercial Director & Head of Power Trading at UK Energy Utility.
- **Narrative Arc:**
  1. **The Commercial Risk (0:00–1:00):** Why Day-Ahead wind forecast volatility exposes the utility to severe Balancing Mechanism cashout penalties (System Buy Price).
  2. **The Product Walkthrough (1:00–2:30):** Navigating the Day-Ahead Decision Desk for January 15, 2026. Demonstrating the 11:00 GMT Gate Closure forecast vs outturn and showing both hourly (24H) and settlement period (SP 1-48) resolutions.
  3. **The Thermal Procurement Buffer (2:30–4:00):** Using the Procurement Calculator with a 28,000 MW load. Demonstrating how adding the quantified **P90 risk margin (1,781 MW)** prevents deficit cashouts while locking in cheaper day-ahead wholesale rates.
  4. **Forecast Evolution & Monthly Review (4:00–5:00):** Showcasing the Fan Chart and diurnal ramp-rate errors across January 2026.

### Part 2: Technical Lead Review (≤ 5 mins)
- **Target Audience:** Internal Engineering Lead reviewing architecture, code, and methodology.
- **Narrative Arc:**
  1. **Architecture & Stack (0:00–1:00):** React 18 + Vite + Recharts frontend; Python 3.12 + FastAPI + Pydantic v2 backend; Docker containerization.
  2. **Data Pipeline & Lookback Integrity (1:00–2:30):**
     - Streaming ingestion from Elexon BMRS `FUELHH` (WIND) and `WINDFOR`.
     - Strict gate-closure lookback filter preventing lookahead bias: `publish_time <= gate_closure_cutoff`.
     - Harmonization of hourly `WINDFOR` forecasts against half-hourly `FUELHH` outturn:
       $$\text{Actual}_{\text{Hour}}(H) = \frac{\text{Actual}_{\text{HH}}(H:00) + \text{Actual}_{\text{HH}}(H:30)}{2}$$
  3. **Statistical Error Formulations (2:30–3:30):**
     - MAE, RMSE, and Bias.
     - Justification of **WAPE** over MAPE to prevent division-by-zero during low-wind periods.
     - Percentile calculations for empirical risk margins (P10, P50, P90, P95).
  4. **Testing, Performance & Deployment (3:30–5:00):**
     - 100% passing pytest suite in < 1 second.
     - SQLite indexing enabling < 10ms analytical query response times.
     - Multi-stage Docker build and Vercel/Heroku readiness.

*(Full speaking scripts can be viewed or copied directly from the "Pitch & Tech Review Guide" button in the application header).*

---

## 7. AI Tools Disclosure

As explicitly permitted in the assignment brief, AI assistance tools (Google Antigravity Agentic AI) were utilized during the development of this application for:
- Accelerating Elexon BMRS API exploratory parameter testing.
- Generating boilerplate Pydantic schemas and test suites.
- Assisting with dark-glassmorphism CSS styling tokens and SVG chart layouts.
All domain logic, mathematical formulations, architectural decisions, and code integrations were engineered and validated for accuracy against live UK grid data.
