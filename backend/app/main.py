import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import database engine to initialize tables on startup
from database.db import engine
from database.models import Base

# Import routers
from backend.app.api import auth, crops, farms, buyers, gis, matching, predictions

load_dotenv()

# Initialize database tables on startup
print("Initializing database schema...")
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BioPlan AI API",
    description="Agricultural biomass availability planning and buyer matching API.",
    version="1.0.0"
)

# CORS configurations
cors_origins_str = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000")
origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach routers
app.include_router(auth.router)
app.include_router(crops.router)
app.include_router(farms.router)
app.include_router(buyers.router)
app.include_router(gis.router)
app.include_router(matching.router)
app.include_router(predictions.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to BioPlan AI API. Visit /docs for documentation."
    }

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=True)
