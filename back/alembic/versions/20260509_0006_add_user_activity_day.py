"""add user activity day table

Revision ID: 20260509_0006
Revises: 20260507_0005
Create Date: 2026-05-09 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260509_0006"
down_revision = "20260507_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "useractivityday",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("activity_date", sa.Date(), nullable=False),
        sa.Column("login_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("study_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("quiz_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("event_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("guided_study_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("estimated_study_minutes", sa.Integer(), server_default="0", nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_useractivityday_user_id"), "useractivityday", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_useractivityday_activity_date"), "useractivityday", ["activity_date"], unique=False
    )
    op.create_index(
        "ix_useractivityday_user_date",
        "useractivityday",
        ["user_id", "activity_date"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_useractivityday_user_date", table_name="useractivityday")
    op.drop_index(op.f("ix_useractivityday_activity_date"), table_name="useractivityday")
    op.drop_index(op.f("ix_useractivityday_user_id"), table_name="useractivityday")
    op.drop_table("useractivityday")
