"""add started_at to studylog and quizattempt

Revision ID: 20260509_0008
Revises: 20260509_0007
Create Date: 2026-05-09 17:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260509_0008"
down_revision = "20260509_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "studylog",
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "quizattempt",
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.execute("UPDATE studylog SET started_at = studied_at WHERE started_at IS NULL")
    op.execute("UPDATE quizattempt SET started_at = completed_at WHERE started_at IS NULL")

    op.alter_column("studylog", "started_at", nullable=False)
    op.alter_column("quizattempt", "started_at", nullable=False)


def downgrade() -> None:
    op.drop_column("quizattempt", "started_at")
    op.drop_column("studylog", "started_at")
