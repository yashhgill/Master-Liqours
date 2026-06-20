"""add push subscriptions and bulk order inquiries tables

Revision ID: c7a9b1e3f201
Revises: 493306943755
Create Date: 2026-06-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7a9b1e3f201'
down_revision: Union[str, Sequence[str], None] = '493306943755'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('push_subscriptions',
    sa.Column('subscription_id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('endpoint', sa.Text(), nullable=False),
    sa.Column('p256dh', sa.String(length=255), nullable=False),
    sa.Column('auth', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('subscription_id'),
    sa.UniqueConstraint('endpoint')
    )
    op.create_index(op.f('ix_push_subscriptions_user_id'), 'push_subscriptions', ['user_id'], unique=False)

    op.create_table('bulk_order_inquiries',
    sa.Column('inquiry_id', sa.String(length=36), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('company', sa.String(length=255), nullable=True),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('whatsapp', sa.String(length=50), nullable=False),
    sa.Column('event_date', sa.String(length=50), nullable=True),
    sa.Column('estimated_cartons', sa.String(length=100), nullable=True),
    sa.Column('items_wanted', sa.Text(), nullable=True),
    sa.Column('message', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=30), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('inquiry_id')
    )
    op.create_index(op.f('ix_bulk_order_inquiries_created_at'), 'bulk_order_inquiries', ['created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_bulk_order_inquiries_created_at'), table_name='bulk_order_inquiries')
    op.drop_table('bulk_order_inquiries')
    op.drop_index(op.f('ix_push_subscriptions_user_id'), table_name='push_subscriptions')
    op.drop_table('push_subscriptions')
