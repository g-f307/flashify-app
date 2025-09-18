# app/database.py
import os
from sqlmodel import create_engine, Session
from dotenv import load_dotenv
from os import getenv

load_dotenv() # Carrega as variáveis do arquivo .env

# 1. Carregamos cada variável de ambiente separadamente
DB_USER = getenv("DB_USER")
DB_PASSWORD = getenv("DB_PASSWORD")
DB_HOST = getenv("DB_HOST")
DB_NAME = getenv("DB_NAME")

# 2. Montamos a string de conexão no Python, o que é mais seguro
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"

# 3. Criamos a engine com a URL montada corretamente
engine = create_engine(DATABASE_URL)

def get_session():
    with Session(engine) as session:
        yield session