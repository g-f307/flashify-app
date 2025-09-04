# app/main.py
# app/main.py
from fastapi import FastAPI
from sqlmodel import SQLModel
from .database import engine 
from .routers import auth
from .routers import folders
from .routers import documents

# Importe o modelo para que ele seja registrado pelo SQLModel
from . import models

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

app = FastAPI(title="Flashify API")

app.include_router(auth.router)
app.include_router(folders.router)
app.include_router(documents.router)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.get("/")
def read_root():
    return {"message": "Bem-vindo à API do Flashify!"}