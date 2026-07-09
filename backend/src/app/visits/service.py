"""Business logic for the visits module.

Maintains a single counter row (``id == COUNTER_ID``) tracking how many times a
page has been visited.
"""

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.visits.models import VisitCounter

COUNTER_ID = 1


async def get_count(db: AsyncSession) -> int:
    """Return the current visit count (0 if no visits have been recorded)."""
    result = await db.execute(select(VisitCounter.count).where(VisitCounter.id == COUNTER_ID))
    return result.scalar_one_or_none() or 0


async def record_visit(db: AsyncSession) -> int:
    """Atomically increment and return the visit count.

    Creates the singleton counter row on first call.
    """
    result = await db.execute(
        update(VisitCounter)
        .where(VisitCounter.id == COUNTER_ID)
        .values(count=VisitCounter.count + 1)
        .returning(VisitCounter.count)
    )
    new_count = result.scalar_one_or_none()
    if new_count is None:
        db.add(VisitCounter(id=COUNTER_ID, count=1))
        new_count = 1
    await db.commit()
    return new_count
