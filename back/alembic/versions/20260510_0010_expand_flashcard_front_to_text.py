"""expand flashcard front to text

Revision ID: 20260510_0010
Revises: 20260509_0009
Create Date: 2026-05-10 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260510_0010"
down_revision = "20260509_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "flashcard",
        "front",
        existing_type=sa.String(),
        type_=sa.Text(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "flashcard",
        "front",
        existing_type=sa.Text(),
        type_=sa.String(),
        existing_nullable=False,
    )
