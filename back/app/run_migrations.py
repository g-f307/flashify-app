from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from .database import get_database_url

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ALEMBIC_INI_PATH = PROJECT_ROOT / "alembic.ini"
MIGRATION_LOCK_ID = 40855101


def run_migrations() -> None:
    database_url = get_database_url()
    engine = create_engine(database_url, future=True)

    with engine.connect() as connection:
        connection.execute(
            text("SELECT pg_advisory_lock(:lock_id)"),
            {"lock_id": MIGRATION_LOCK_ID},
        )

        try:
            table_names = set(inspect(connection).get_table_names())
            alembic_cfg = Config(str(ALEMBIC_INI_PATH))
            alembic_cfg.set_main_option("sqlalchemy.url", database_url)

            if table_names and "alembic_version" not in table_names:
                print("[alembic] Existing schema detected without version table. Stamping head.")
                command.stamp(alembic_cfg, "head")
            else:
                print("[alembic] Running upgrade head.")
                command.upgrade(alembic_cfg, "head")
        finally:
            connection.execute(
                text("SELECT pg_advisory_unlock(:lock_id)"),
                {"lock_id": MIGRATION_LOCK_ID},
            )


if __name__ == "__main__":
    run_migrations()
