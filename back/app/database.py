# app/database.py
from os import getenv

from dotenv import load_dotenv
from sqlmodel import Session, create_engine

load_dotenv()


def get_database_url() -> str:
    database_url = getenv("DATABASE_URL")
    if database_url:
        return database_url

    db_user = getenv("DB_USER")
    db_password = getenv("DB_PASSWORD")
    db_host = getenv("DB_HOST")
    db_name = getenv("DB_NAME")

    missing = [
        key
        for key, value in {
            "DB_USER": db_user,
            "DB_PASSWORD": db_password,
            "DB_HOST": db_host,
            "DB_NAME": db_name,
        }.items()
        if not value
    ]
    if missing:
        missing_keys = ", ".join(missing)
        raise RuntimeError(f"Variaveis de ambiente ausentes para o banco: {missing_keys}")

    return f"postgresql://{db_user}:{db_password}@{db_host}/{db_name}"


DATABASE_URL = get_database_url()
engine = create_engine(DATABASE_URL)

def get_session():
    with Session(engine) as session:
        yield session
