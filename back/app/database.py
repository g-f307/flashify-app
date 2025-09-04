# app/database.py
import os
from sqlmodel import create_engine, Session
from dotenv import load_dotenv

load_dotenv() # Carrega as variáveis do arquivo .env

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL não foi definida no ambiente.")

engine = create_engine(DATABASE_URL, echo=True) # echo=True mostra os comandos SQL no terminal

def get_session():
    with Session(engine) as session:
        yield session