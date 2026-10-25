import pytest
from app.analytics import calculate_percentile

def test_calculate_percentile():
    vals = [10.0, 20.0, 30.0, 40.0, 50.0]
    assert calculate_percentile(vals, 50) == 30.0
    assert calculate_percentile(vals, 0) == 10.0
    assert calculate_percentile(vals, 100) == 50.0
    
    # Empty list
    assert calculate_percentile([], 50) == 0.0

def test_percentile_interpolation():
    vals = [0.0, 100.0]
    assert calculate_percentile(vals, 25) == 25.0
    assert calculate_percentile(vals, 75) == 75.0
    assert calculate_percentile(vals, 90) == 90.0
