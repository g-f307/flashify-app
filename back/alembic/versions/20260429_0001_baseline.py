"""baseline inicial do banco

Revision ID: 20260429_0001
Revises:
Create Date: 2026-04-29 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "20260429_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


documentstatus = postgresql.ENUM(
    "PROCESSING",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    name="documentstatus",
    create_type=False,
)
flashcardtype = postgresql.ENUM(
    "CONCEPT",
    "CODE",
    "DIAGRAM",
    "EXAMPLE",
    "COMPARISON",
    name="flashcardtype",
    create_type=False,
)
authprovider = postgresql.ENUM(
    "LOCAL",
    "GOOGLE",
    name="authprovider",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    documentstatus.create(bind, checkfirst=True)
    flashcardtype.create(bind, checkfirst=True)
    authprovider.create(bind, checkfirst=True)

    op.create_table(
        "user",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("provider", authprovider, nullable=False),
        sa.Column("profile_picture_url", sa.String(), nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("inactivity_email_sent", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("daily_generation_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("last_generation_reset", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_email"), "user", ["email"], unique=True)
    op.create_index(op.f("ix_user_username"), "user", ["username"], unique=True)

    op.create_table(
        "folder",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_folder_name"), "folder", ["name"], unique=False)

    op.create_table(
        "document",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("status", documentstatus, nullable=False),
        sa.Column("generates_flashcards", sa.Boolean(), nullable=False),
        sa.Column("generates_quizzes", sa.Boolean(), nullable=False),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("processing_progress", sa.Float(), nullable=False),
        sa.Column("current_step", sa.String(), nullable=True),
        sa.Column("can_cancel", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("srs_enabled", sa.Boolean(), nullable=False),
        sa.Column(
            "studied_flashcard_ids",
            postgresql.ARRAY(sa.Integer()),
            server_default=sa.text("'{}'"),
            nullable=False,
        ),
        sa.Column("guided_study_cache", sa.JSON(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("folder_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["folder_id"], ["folder.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "flashcard",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("front", sa.String(), nullable=False),
        sa.Column("back", sa.Text(), nullable=False),
        sa.Column("type", flashcardtype, nullable=False),
        sa.Column("ease_factor", sa.Float(), nullable=False),
        sa.Column("interval_days", sa.Integer(), nullable=False),
        sa.Column("repetitions", sa.Integer(), nullable=False),
        sa.Column("next_review", sa.DateTime(timezone=True), nullable=True),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["document.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "quiz",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["document.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "flashcardconversation",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_message", sa.Text(), nullable=False),
        sa.Column("assistant_response", sa.Text(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=True),
        sa.Column("flashcard_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["flashcard_id"], ["flashcard.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "studylog",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("studied_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("accuracy", sa.Float(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("flashcard_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["flashcard_id"], ["flashcard.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "guidedstudysession",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("completed_step_ids", sa.JSON(), server_default=sa.text("'[]'"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_accessed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["document_id"], ["document.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_guidedstudysession_document_id"), "guidedstudysession", ["document_id"], unique=False)
    op.create_index(op.f("ix_guidedstudysession_user_id"), "guidedstudysession", ["user_id"], unique=False)

    op.create_table(
        "question",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("text", sa.String(), nullable=False),
        sa.Column("ease_factor", sa.Float(), nullable=False),
        sa.Column("interval_days", sa.Integer(), nullable=False),
        sa.Column("repetitions", sa.Integer(), nullable=False),
        sa.Column("next_review", sa.DateTime(timezone=True), nullable=True),
        sa.Column("quiz_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["quiz_id"], ["quiz.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "quizattempt",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("correct_answers", sa.Integer(), nullable=False),
        sa.Column("total_questions", sa.Integer(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("quiz_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["quiz_id"], ["quiz.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "answer",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("text", sa.String(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("explanation", sa.String(), nullable=True),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["question.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("answer")
    op.drop_table("quizattempt")
    op.drop_table("question")
    op.drop_index(op.f("ix_guidedstudysession_user_id"), table_name="guidedstudysession")
    op.drop_index(op.f("ix_guidedstudysession_document_id"), table_name="guidedstudysession")
    op.drop_table("guidedstudysession")
    op.drop_table("studylog")
    op.drop_table("flashcardconversation")
    op.drop_table("quiz")
    op.drop_table("flashcard")
    op.drop_table("document")
    op.drop_index(op.f("ix_folder_name"), table_name="folder")
    op.drop_table("folder")
    op.drop_index(op.f("ix_user_username"), table_name="user")
    op.drop_index(op.f("ix_user_email"), table_name="user")
    op.drop_table("user")

    bind = op.get_bind()
    authprovider.drop(bind, checkfirst=True)
    flashcardtype.drop(bind, checkfirst=True)
    documentstatus.drop(bind, checkfirst=True)
