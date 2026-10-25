import sys
import os

# Add backend directory to sys.path for Vercel Serverless Function
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Set database path to backend/elexon_wind.db
os.environ["DB_PATH"] = os.path.join(backend_dir, "elexon_wind.db")

from app.main import app
