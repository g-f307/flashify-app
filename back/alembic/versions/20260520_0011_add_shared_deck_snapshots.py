"""add shared deck snapshots

Revision ID: 20260520_0011
Revises: 20260510_0010
Create Date: 2026-05-20 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260520_0011"
down_revision = "20260510_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "shareddeck",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("source_document_id", sa.Integer(), nullable=True),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("file_path", sa.String(), nullable=True),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("generates_flashcards", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("generates_quizzes", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("srs_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("feature_snapshot_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("flashcards_snapshot", sa.JSON(), nullable=False),
        sa.Column("quiz_snapshot", sa.JSON(), nullable=True),
        sa.Column("guided_study_snapshot", sa.JSON(), nullable=True),
        sa.Column("extra_features_snapshot", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["owner_user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_shareddeck_owner_user_id"), "shareddeck", ["owner_user_id"], unique=False)
    op.create_index(op.f("ix_shareddeck_source_document_id"), "shareddeck", ["source_document_id"], unique=False)
    op.create_index(op.f("ix_shareddeck_token"), "shareddeck", ["token"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_shareddeck_token"), table_name="shareddeck")
    op.drop_index(op.f("ix_shareddeck_source_document_id"), table_name="shareddeck")
    op.drop_index(op.f("ix_shareddeck_owner_user_id"), table_name="shareddeck")
    op.drop_table("shareddeck")
