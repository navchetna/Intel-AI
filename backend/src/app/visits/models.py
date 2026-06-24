"""SQLAlchemy models for the visits module."""

from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class VisitCounter(Base):
    """Singleton row holding the cumulative page-visit count."""

    __tablename__ = "visit_counter"

    id: Mapped[int] = mapped_column(primary_key=True)
    count: Mapped[int] = mapped_column(default=0, nullable=False)
