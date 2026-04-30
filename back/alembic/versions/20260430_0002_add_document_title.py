"""add document title

Revision ID: 20260430_0002
Revises: 20260429_0001
Create Date: 2026-04-30 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260430_0002"
down_revision = "20260429_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("document", sa.Column("title", sa.String(), nullable=True))

    op.execute(
        """
        UPDATE document
        SET title = CASE
            WHEN file_path LIKE '%/%' THEN
                trim(
                    replace(
                        regexp_replace(
                            regexp_replace(
                                regexp_replace(file_path, '^.*/', ''),
                                '\\.[^.]+$',
                                ''
                            ),
                            '^\\d+_',
                            ''
                        ),
                        '_',
                        ' '
                    )
                )
            ELSE file_path
        END
        WHERE title IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column("document", "title")
