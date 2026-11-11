import os
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .ai.errors import AIError

from .routers import auth
from .routers import folders
from .routers import documents
from .routers import flashcards
from .routers import progress
from .routers import quizzes
from .routers import stats
from .routers import analytics
from .routers import study_feedback

frontend_url = os.getenv("FRONTEND_URL", "http://flashify.cloud")

app = FastAPI(title="Flashify API")

@app.exception_handler(AIError)
async def ai_error_handler(request, exc):
    logging.getLogger(__name__).warning("ai_request_failed error=%s", type(exc).__name__)
    return JSONResponse(status_code=500, content={"detail": "A IA não conseguiu concluir a geração. Tente novamente mais tarde."})


# Configure CORS
origins = [
    "http://localhost:3000",  # Next.js default port
    "http://localhost:4000",  # Our frontend port
    "http://frontend:3000",   # Docker internal
    "http://127.0.0.1:3000",
    "http://127.0.0.1:4000",
    "https://flashify.cloud",
    "https://www.flashify.cloud", 
    "frontend_url"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(folders.router)
app.include_router(documents.router)
app.include_router(flashcards.router)
app.include_router(progress.router)
app.include_router(quizzes.router)
app.include_router(stats.router)
app.include_router(analytics.router)
app.include_router(study_feedback.router)

@app.get("/")
def read_root():
    return {"message": "Bem-vindo à API do Flashify!"}
