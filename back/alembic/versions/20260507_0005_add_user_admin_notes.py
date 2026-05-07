"""add user admin notes

Revision ID: 20260507_0005
Revises: 20260507_0004
Create Date: 2026-05-07 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260507_0005"
down_revision = "20260507_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "useradminnote",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("author_user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["author_user_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_useradminnote_user_id"), "useradminnote", ["user_id"], unique=False)
    op.create_index(op.f("ix_useradminnote_author_user_id"), "useradminnote", ["author_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_useradminnote_author_user_id"), table_name="useradminnote")
    op.drop_index(op.f("ix_useradminnote_user_id"), table_name="useradminnote")
    op.drop_table("useradminnote")
