import math
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from .database import get_connection

def calculate_percentile(values: List[float], percentile: float) -> float:
    """Calculate the p-th percentile of a list of numbers using linear interpolation."""
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    k = (len(sorted_vals) - 1) * (percentile / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return float(sorted_vals[int(k)])
    d0 = sorted_vals[int(f)] * (c - k)
    d1 = sorted_vals[int(c)] * (k - f)
    return float(d0 + d1)

def get_day_ahead_decision(decision_date_str: str, gate_closure_time: str = "11:00:00") -> Dict[str, Any]:
    """
    Simulate the Day-Ahead decision workflow:
    - Decision is made on `decision_date_str` (e.g. '2026-01-15')
    - Gate closure is at `gate_closure_time` (e.g. '11:00:00' GMT)
    - Delivery day is decision_date + 1 day (e.g. '2026-01-16')
    """
    decision_dt = datetime.strptime(decision_date_str, "%Y-%m-%d")
    delivery_dt = decision_dt + timedelta(days=1)
    delivery_date_str = delivery_dt.strftime("%Y-%m-%d")
    
    cutoff_publish_time = f"{decision_date_str}T{gate_closure_time}Z"
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Fetch the latest forecasts published at or before gate closure for the delivery day
    # We select max(publish_time) for each start_time where publish_time <= cutoff
    cursor.execute("""
        SELECT f.start_time, f.publish_time, f.generation
        FROM forecast_generation f
        INNER JOIN (
            SELECT start_time, MAX(publish_time) as max_pub
            FROM forecast_generation
            WHERE publish_time <= ? AND start_time LIKE ?
            GROUP BY start_time
        ) latest ON f.start_time = latest.start_time AND f.publish_time = latest.max_pub
        ORDER BY f.start_time ASC
    """, (cutoff_publish_time, f"{delivery_date_str}%"))
    
    forecast_rows = cursor.fetchall()
    forecast_dict = {row["start_time"]: {"forecast_mw": row["generation"], "publish_time": row["publish_time"]} for row in forecast_rows}
    
    # 2. Fetch actual generation for the delivery day
    cursor.execute("""
        SELECT start_time, settlement_period, generation
        FROM actual_generation
        WHERE start_time LIKE ? AND fuel_type = 'WIND'
        ORDER BY start_time ASC
    """, (f"{delivery_date_str}%",))
    
    actual_rows = cursor.fetchall()
    actual_half_hours = {row["start_time"]: {"actual_mw": row["generation"], "sp": row["settlement_period"]} for row in actual_rows}
    
    # 3. Aggregate actuals to hourly resolution to align with hourly WINDFOR forecasts
    # Also support half-hourly interpolated view
    hourly_data = []
    half_hourly_data = []
    
    errors = []
    
    for hour in range(24):
        h_str = f"{hour:02d}"
        st_h00 = f"{delivery_date_str}T{h_str}:00:00Z"
        st_h30 = f"{delivery_date_str}T{h_str}:30:00Z"
        
        act_00 = actual_half_hours.get(st_h00, {}).get("actual_mw")
        act_30 = actual_half_hours.get(st_h30, {}).get("actual_mw")
        
        # Calculate hourly actual average
        if act_00 is not None and act_30 is not None:
            hourly_actual = (act_00 + act_30) / 2.0
        elif act_00 is not None:
            hourly_actual = act_00
        elif act_30 is not None:
            hourly_actual = act_30
        else:
            hourly_actual = None
            
        fc_entry = forecast_dict.get(st_h00)
        fc_mw = fc_entry["forecast_mw"] if fc_entry else None
        pub_time = fc_entry["publish_time"] if fc_entry else None
        
        error = None
        abs_error = None
        pct_error = None
        
        if fc_mw is not None and hourly_actual is not None:
            error = fc_mw - hourly_actual  # Positive: Over-forecast, Negative: Under-forecast
            abs_error = abs(error)
            pct_error = (abs_error / hourly_actual * 100.0) if hourly_actual > 0 else 0.0
            errors.append({
                "error": error,
                "abs_error": abs_error,
                "actual": hourly_actual,
                "forecast": fc_mw,
                "hour": hour
            })
            
        hourly_data.append({
            "hour": hour,
            "time_label": f"{h_str}:00",
            "start_time": st_h00,
            "forecast_mw": round(fc_mw, 1) if fc_mw is not None else None,
            "actual_mw": round(hourly_actual, 1) if hourly_actual is not None else None,
            "error_mw": round(error, 1) if error is not None else None,
            "abs_error_mw": round(abs_error, 1) if abs_error is not None else None,
            "publish_time": pub_time
        })
        
        # Half-hourly view for trading desk
        for sp_suffix, act_val in [("00", act_00), ("30", act_30)]:
            st_sp = f"{delivery_date_str}T{h_str}:{sp_suffix}:00Z"
            sp_num = actual_half_hours.get(st_sp, {}).get("sp", hour * 2 + (1 if sp_suffix == "00" else 2))
            half_hourly_data.append({
                "settlement_period": sp_num,
                "start_time": st_sp,
                "time_label": f"{h_str}:{sp_suffix}",
                "forecast_mw": round(fc_mw, 1) if fc_mw is not None else None,
                "actual_mw": round(act_val, 1) if act_val is not None else None,
                "error_mw": round(fc_mw - act_val, 1) if (fc_mw is not None and act_val is not None) else None
            })

    conn.close()
    
    # Calculate Quantitative Accuracy Metrics
    err_vals = [e["error"] for e in errors]
    abs_err_vals = [e["abs_error"] for e in errors]
    total_actual = sum(e["actual"] for e in errors)
    total_abs_err = sum(abs_err_vals)
    
    n = len(errors)
    if n > 0:
        mae = total_abs_err / n
        rmse = math.sqrt(sum(e["error"] ** 2 for e in errors) / n)
        bias = sum(err_vals) / n
        wape = (total_abs_err / total_actual * 100.0) if total_actual > 0 else 0.0
        p10 = calculate_percentile(err_vals, 10)
        p50 = calculate_percentile(err_vals, 50)
        p90 = calculate_percentile(err_vals, 90)
        p95 = calculate_percentile(err_vals, 95)
        max_over = max(err_vals)
        max_under = min(err_vals)
    else:
        mae = rmse = bias = wape = p10 = p50 = p90 = p95 = max_over = max_under = 0.0
        
    metrics = {
        "sample_count": n,
        "mae_mw": round(mae, 1),
        "rmse_mw": round(rmse, 1),
        "bias_mw": round(bias, 1),
        "wape_pct": round(wape, 2),
        "p10_error_mw": round(p10, 1),
        "p50_error_mw": round(p50, 1),
        "p90_error_mw": round(p90, 1),
        "p95_error_mw": round(p95, 1),
        "max_over_forecast_mw": round(max_over, 1),
        "max_under_forecast_mw": round(max_under, 1),
        # Recommended thermal procurement reserve to cover 90% risk of wind shortfall:
        "recommended_p90_reserve_mw": max(0.0, round(p90, 1)),
        "recommended_p95_reserve_mw": max(0.0, round(p95, 1))
    }
    
    return {
        "decision_date": decision_date_str,
        "gate_closure": gate_closure_time,
        "cutoff_publish_time": cutoff_publish_time,
        "delivery_date": delivery_date_str,
        "metrics": metrics,
        "hourly_comparison": hourly_data,
        "half_hourly_comparison": half_hourly_data
    }

def get_monthly_evaluation(year: int = 2026, month: int = 1, gate_closure_time: str = "11:00:00") -> Dict[str, Any]:
    """
    Evaluate accuracy across all purchase decisions made in the entire month.
    Covers day-ahead decisions made from Jan 1 through Jan 31.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # Range of decision dates: 2026-01-01 to 2026-01-31
    # Delivery dates: 2026-01-02 to 2026-02-01
    all_errors = []
    daily_summaries = []
    hourly_error_buckets = {h: [] for h in range(24)}
    
    days_in_month = 31
    for day in range(1, days_in_month + 1):
        decision_date_str = f"{year:04d}-{month:02d}-{day:02d}"
        res = get_day_ahead_decision(decision_date_str, gate_closure_time)
        m = res["metrics"]
        if m["sample_count"] > 0:
            daily_summaries.append({
                "decision_date": decision_date_str,
                "delivery_date": res["delivery_date"],
                "mae_mw": m["mae_mw"],
                "rmse_mw": m["rmse_mw"],
                "bias_mw": m["bias_mw"],
                "wape_pct": m["wape_pct"],
                "p90_error_mw": m["p90_error_mw"],
                "sample_count": m["sample_count"]
            })
            for h_row in res["hourly_comparison"]:
                if h_row["error_mw"] is not None:
                    all_errors.append(h_row["error_mw"])
                    hourly_error_buckets[h_row["hour"]].append(h_row["error_mw"])
                    
    conn.close()
    
    # Overall monthly metrics
    n = len(all_errors)
    if n > 0:
        abs_errs = [abs(e) for e in all_errors]
        overall_mae = sum(abs_errs) / n
        overall_rmse = math.sqrt(sum(e ** 2 for e in all_errors) / n)
        overall_bias = sum(all_errors) / n
        p10 = calculate_percentile(all_errors, 10)
        p50 = calculate_percentile(all_errors, 50)
        p90 = calculate_percentile(all_errors, 90)
        p95 = calculate_percentile(all_errors, 95)
    else:
        overall_mae = overall_rmse = overall_bias = p10 = p50 = p90 = p95 = 0.0
        
    # Hourly error profile across the 24 hours of the day
    hourly_profile = []
    for h in range(24):
        errs = hourly_error_buckets[h]
        if errs:
            hourly_profile.append({
                "hour": h,
                "time_label": f"{h:02d}:00",
                "mae_mw": round(sum(abs(e) for e in errs) / len(errs), 1),
                "bias_mw": round(sum(errs) / len(errs), 1),
                "rmse_mw": round(math.sqrt(sum(e**2 for e in errs) / len(errs)), 1),
                "p90_mw": round(calculate_percentile(errs, 90), 1),
                "sample_count": len(errs)
            })
            
    # Histogram distribution for visual charting
    histogram = []
    if all_errors:
        min_e = math.floor(min(all_errors) / 500) * 500
        max_e = math.ceil(max(all_errors) / 500) * 500
        bucket_size = 500
        curr = min_e
        while curr <= max_e:
            count = sum(1 for e in all_errors if curr <= e < curr + bucket_size)
            histogram.append({
                "bin_start": curr,
                "bin_end": curr + bucket_size,
                "bin_label": f"{curr} to {curr+bucket_size}",
                "count": count
            })
            curr += bucket_size

    return {
        "year": year,
        "month": month,
        "gate_closure": gate_closure_time,
        "total_evaluations": n,
        "metrics": {
            "overall_mae_mw": round(overall_mae, 1),
            "overall_rmse_mw": round(overall_rmse, 1),
            "overall_bias_mw": round(overall_bias, 1),
            "p10_error_mw": round(p10, 1),
            "p50_error_mw": round(p50, 1),
            "p90_error_mw": round(p90, 1),
            "p95_error_mw": round(p95, 1)
        },
        "daily_summaries": daily_summaries,
        "hourly_profile": hourly_profile,
        "error_distribution": histogram
    }

def get_forecast_evolution(delivery_date_str: str) -> Dict[str, Any]:
    """
    Analyze the evolution (forecast vintage / fan chart) for a target delivery day
    as published across different lead times:
    - 48 hours ahead (D-2)
    - 24 hours ahead (D-1 11:00 Day-Ahead Gate Closure)
    - 12 hours ahead (D-1 evening)
    - 4 hours ahead (Intraday)
    - Latest available before delivery
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT DISTINCT publish_time 
        FROM forecast_generation
        WHERE start_time LIKE ?
        ORDER BY publish_time ASC
    """, (f"{delivery_date_str}%",))
    
    publish_times = [row["publish_time"] for row in cursor.fetchall()]
    
    # Fetch actual generation for comparison
    cursor.execute("""
        SELECT start_time, generation
        FROM actual_generation
        WHERE start_time LIKE ? AND fuel_type = 'WIND'
        ORDER BY start_time ASC
    """, (f"{delivery_date_str}%",))
    actual_rows = cursor.fetchall()
    actual_dict = {r["start_time"]: r["generation"] for r in actual_rows}
    
    # For each publish time, get the forecasted series for the day
    runs = []
    # Sample up to 6 distinct vintages spanning the forecast lifecycle
    selected_pub_times = []
    if len(publish_times) <= 6:
        selected_pub_times = publish_times
    else:
        step = max(1, len(publish_times) // 5)
        indices = list(range(0, len(publish_times), step))
        if len(publish_times) - 1 not in indices:
            indices.append(len(publish_times) - 1)
        selected_pub_times = [publish_times[i] for i in indices]
        
    for pt in selected_pub_times:
        cursor.execute("""
            SELECT start_time, generation
            FROM forecast_generation
            WHERE publish_time = ? AND start_time LIKE ?
            ORDER BY start_time ASC
        """, (pt, f"{delivery_date_str}%"))
        rows = cursor.fetchall()
        runs.append({
            "publish_time": pt,
            "data": [{"start_time": r["start_time"], "generation_mw": r["generation"]} for r in rows]
        })
        
    conn.close()
    
    return {
        "delivery_date": delivery_date_str,
        "publish_times_count": len(publish_times),
        "vintages": runs,
        "actuals": [{"start_time": st, "generation_mw": mw} for st, mw in sorted(actual_dict.items())]
    }
