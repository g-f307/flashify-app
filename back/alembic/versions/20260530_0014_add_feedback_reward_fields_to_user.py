"""add feedback reward fields to user

Revision ID: 20260530_0014
Revises: 20260528_0013
Create Date: 2026-05-30 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260530_0014"
down_revision = "20260528_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user", sa.Column("daily_bonus_generation_count", sa.Integer(), server_default=sa.text("0"), nullable=False))
    op.add_column("user", sa.Column("feedback_reward_offer_shown_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("user", sa.Column("feedback_reward_granted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("user", "feedback_reward_granted_at")
    op.drop_column("user", "feedback_reward_offer_shown_at")
    op.drop_column("user", "daily_bonus_generation_count")
