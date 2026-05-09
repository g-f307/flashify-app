"""add guided_study_count and estimated_study_minutes to useractivityday

Revision ID: 20260509_0007
Revises: 20260509_0006
Create Date: 2026-05-09 15:35:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260509_0007"
down_revision = "20260509_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "useractivityday",
        sa.Column("guided_study_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "useractivityday",
        sa.Column("estimated_study_minutes", sa.Integer(), server_default="0", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("useractivityday", "estimated_study_minutes")
    op.drop_column("useractivityday", "guided_study_count")
