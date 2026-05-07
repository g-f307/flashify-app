"""add product events and user tracking fields

Revision ID: 20260506_0003
Revises: 20260430_0002
Create Date: 2026-05-06 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260506_0003"
down_revision = "20260430_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user", sa.Column("utm_source", sa.String(), nullable=True))
    op.add_column("user", sa.Column("utm_medium", sa.String(), nullable=True))
    op.add_column("user", sa.Column("utm_campaign", sa.String(), nullable=True))
    op.add_column("user", sa.Column("utm_content", sa.String(), nullable=True))
    op.add_column("user", sa.Column("utm_term", sa.String(), nullable=True))
    op.add_column("user", sa.Column("referrer", sa.String(), nullable=True))
    op.add_column("user", sa.Column("landing_page", sa.String(), nullable=True))
    op.add_column("user", sa.Column("first_touch_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("user", sa.Column("is_team", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("user", sa.Column("is_test_user", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("user", sa.Column("is_blocked", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("user", sa.Column("lifecycle_stage", sa.String(), nullable=True))

    op.create_table(
        "productevent",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_name", sa.String(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("properties", sa.JSON(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("document_id", sa.Integer(), nullable=True),
        sa.Column("quiz_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["document_id"], ["document.id"]),
        sa.ForeignKeyConstraint(["quiz_id"], ["quiz.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(op.f("ix_productevent_event_name"), "productevent", ["event_name"], unique=False)
    op.create_index(op.f("ix_productevent_user_id"), "productevent", ["user_id"], unique=False)
    op.create_index(op.f("ix_productevent_document_id"), "productevent", ["document_id"], unique=False)
    op.create_index(op.f("ix_productevent_quiz_id"), "productevent", ["quiz_id"], unique=False)

    op.create_index("ix_user_created_at", "user", ["created_at"], unique=False)
    op.create_index("ix_user_last_login_at", "user", ["last_login_at"], unique=False)
    op.create_index("ix_document_user_id", "document", ["user_id"], unique=False)
    op.create_index("ix_document_created_at", "document", ["created_at"], unique=False)
    op.create_index("ix_document_status", "document", ["status"], unique=False)
    op.create_index("ix_studylog_user_id", "studylog", ["user_id"], unique=False)
    op.create_index("ix_studylog_studied_at", "studylog", ["studied_at"], unique=False)
    op.create_index("ix_quizattempt_user_id", "quizattempt", ["user_id"], unique=False)
    op.create_index("ix_quizattempt_completed_at", "quizattempt", ["completed_at"], unique=False)

    op.alter_column("user", "is_team", server_default=None)
    op.alter_column("user", "is_test_user", server_default=None)
    op.alter_column("user", "is_blocked", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_quizattempt_completed_at", table_name="quizattempt")
    op.drop_index("ix_quizattempt_user_id", table_name="quizattempt")
    op.drop_index("ix_studylog_studied_at", table_name="studylog")
    op.drop_index("ix_studylog_user_id", table_name="studylog")
    op.drop_index("ix_document_status", table_name="document")
    op.drop_index("ix_document_created_at", table_name="document")
    op.drop_index("ix_document_user_id", table_name="document")
    op.drop_index("ix_user_last_login_at", table_name="user")
    op.drop_index("ix_user_created_at", table_name="user")

    op.drop_index(op.f("ix_productevent_quiz_id"), table_name="productevent")
    op.drop_index(op.f("ix_productevent_document_id"), table_name="productevent")
    op.drop_index(op.f("ix_productevent_user_id"), table_name="productevent")
    op.drop_index(op.f("ix_productevent_event_name"), table_name="productevent")
    op.drop_table("productevent")

    op.drop_column("user", "lifecycle_stage")
    op.drop_column("user", "is_blocked")
    op.drop_column("user", "is_test_user")
    op.drop_column("user", "is_team")
    op.drop_column("user", "first_touch_at")
    op.drop_column("user", "landing_page")
    op.drop_column("user", "referrer")
    op.drop_column("user", "utm_term")
    op.drop_column("user", "utm_content")
    op.drop_column("user", "utm_campaign")
    op.drop_column("user", "utm_medium")
    op.drop_column("user", "utm_source")
