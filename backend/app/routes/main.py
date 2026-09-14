from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import health
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from app.services.vision_service import vision_service
# backend/app/main.py

from fastapi import FastAPI
from app.routes import predict  # or your respective routes file

app = FastAPI(title="Pet & Livestock Disease Analysis API")

app.include_router(predict.router)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Backend AI/ML & Early Warning Decision-Support API for "
        "SIH Problem Statement 128 (Livestock Disease Early Detection & Prevention)."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for React Frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if settings.cors_origins else ["*"],
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(predict.router)


@app.get("/", include_in_schema=False)
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health"
    }
@app.post("/api/v1/predict")
async def predict_disease(
    file: UploadFile = File(...),
    category: str = Form(...)  # Expected values: "pet" or "cow"
):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    try:
        image_bytes = await file.read()
        prediction = vision_service.predict(image_bytes, animal_type=category)
        return {
            "success": True,
            "data": prediction
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")