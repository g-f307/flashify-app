"""add user funnel milestones

Revision ID: 20260507_0004
Revises: 20260506_0003
Create Date: 2026-05-07 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260507_0004"
down_revision = "20260506_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user", sa.Column("first_login_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("user", sa.Column("first_deck_created_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("user", sa.Column("first_study_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("user", sa.Column("first_quiz_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("user", sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True))

    op.execute(
        """
        UPDATE "user" u
        SET first_login_at = u.last_login_at
        WHERE u.first_login_at IS NULL
          AND u.last_login_at IS NOT NULL
        """
    )

    op.execute(
        """
        UPDATE "user" u
        SET first_deck_created_at = deck_data.first_deck_created_at
        FROM (
            SELECT user_id, MIN(created_at) AS first_deck_created_at
            FROM document
            GROUP BY user_id
        ) AS deck_data
        WHERE u.id = deck_data.user_id
          AND u.first_deck_created_at IS NULL
        """
    )

    op.execute(
        """
        UPDATE "user" u
        SET first_study_at = study_data.first_study_at
        FROM (
            SELECT user_id, MIN(studied_at) AS first_study_at
            FROM studylog
            GROUP BY user_id
        ) AS study_data
        WHERE u.id = study_data.user_id
          AND u.first_study_at IS NULL
        """
    )

    op.execute(
        """
        UPDATE "user" u
        SET first_quiz_at = quiz_data.first_quiz_at
        FROM (
            SELECT user_id, MIN(completed_at) AS first_quiz_at
            FROM quizattempt
            GROUP BY user_id
        ) AS quiz_data
        WHERE u.id = quiz_data.user_id
          AND u.first_quiz_at IS NULL
        """
    )

    op.execute(
        """
        UPDATE "user"
        SET activated_at = COALESCE(first_study_at, first_quiz_at)
        WHERE activated_at IS NULL
          AND first_deck_created_at IS NOT NULL
          AND (first_study_at IS NOT NULL OR first_quiz_at IS NOT NULL)
        """
    )

    op.execute(
        """
        UPDATE "user"
        SET lifecycle_stage = CASE
            WHEN activated_at IS NOT NULL THEN 'activated'
            WHEN first_quiz_at IS NOT NULL THEN 'quiz_completed'
            WHEN first_study_at IS NOT NULL THEN 'studied'
            WHEN first_deck_created_at IS NOT NULL THEN 'created_deck'
            ELSE COALESCE(lifecycle_stage, 'registered')
        END
        """
    )

    op.create_index("ix_user_first_login_at", "user", ["first_login_at"], unique=False)
    op.create_index("ix_user_first_deck_created_at", "user", ["first_deck_created_at"], unique=False)
    op.create_index("ix_user_first_study_at", "user", ["first_study_at"], unique=False)
    op.create_index("ix_user_first_quiz_at", "user", ["first_quiz_at"], unique=False)
    op.create_index("ix_user_activated_at", "user", ["activated_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_user_activated_at", table_name="user")
    op.drop_index("ix_user_first_quiz_at", table_name="user")
    op.drop_index("ix_user_first_study_at", table_name="user")
    op.drop_index("ix_user_first_deck_created_at", table_name="user")
    op.drop_index("ix_user_first_login_at", table_name="user")
    op.drop_column("user", "activated_at")
    op.drop_column("user", "first_quiz_at")
    op.drop_column("user", "first_study_at")
    op.drop_column("user", "first_deck_created_at")
    op.drop_column("user", "first_login_at")
