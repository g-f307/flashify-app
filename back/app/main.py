# app/main.py
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel
from .database import engine 
from .routers import auth
from .routers import folders
from .routers import documents
from .routers import flashcards

# Importe o modelo para que ele seja registrado pelo SQLModel
from . import models

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

app = FastAPI(title="Flashify API")

# Configure CORS
origins = [
    "http://localhost:3000",  # Next.js default port
    "http://localhost:4000",  # Our frontend port
    "http://frontend:3000",   # Docker internal
    "http://127.0.0.1:3000",
    "http://127.0.0.1:4000",
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

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.get("/")
def read_root():
    return {"message": "Bem-vindo à API do Flashify!"}