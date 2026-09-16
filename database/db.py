import os
import math
from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bioplan.db")

# Define haversine function for SQLite fallback spatial queries
def haversine_distance(lat1, lon1, lat2, lon2):
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 999999.0  # Safe large distance
    
    # Radius of the Earth in km
    R = 6371.0
    
    lat1, lon1, lat2, lon2 = map(math.radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

# Register custom sqlite function on connect event
@event.listens_for(engine, "connect")
def register_sqlite_functions(dbapi_connection, connection_record):
    if DATABASE_URL.startswith("sqlite") or type(dbapi_connection).__name__ == "Connection":
        try:
            dbapi_connection.create_function("haversine", 4, haversine_distance)
        except Exception:
            # In case the sqlite driver doesn't support create_function or it's not sqlite
            pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
