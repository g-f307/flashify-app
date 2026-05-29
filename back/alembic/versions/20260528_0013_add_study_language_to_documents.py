"""add study language to documents and shared decks

Revision ID: 20260528_0013
Revises: 20260525_0012
Create Date: 2026-05-28 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260528_0013"
down_revision = "20260525_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("document", sa.Column("study_language", sa.String(), nullable=True))
    op.add_column("shareddeck", sa.Column("study_language", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("shareddeck", "study_language")
    op.drop_column("document", "study_language")
