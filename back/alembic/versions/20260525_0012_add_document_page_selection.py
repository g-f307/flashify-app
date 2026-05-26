"""add document page selection

Revision ID: 20260525_0012
Revises: 20260520_0011
Create Date: 2026-05-25 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260525_0012"
down_revision = "20260520_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("document", sa.Column("page_selection_raw", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("document", "page_selection_raw")
