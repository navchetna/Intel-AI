"""Business logic / data-access for the items module."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.items.models import Item
from app.modules.items.schemas import ItemCreate, ItemUpdate


async def list_items(db: AsyncSession) -> list[Item]:
    result = await db.execute(select(Item).order_by(Item.id))
    return list(result.scalars().all())


async def get_item(db: AsyncSession, item_id: int) -> Item | None:
    return await db.get(Item, item_id)


async def create_item(db: AsyncSession, payload: ItemCreate) -> Item:
    item = Item(name=payload.name, description=payload.description)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def update_item(db: AsyncSession, item: Item, payload: ItemUpdate) -> Item:
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    return item


async def delete_item(db: AsyncSession, item: Item) -> None:
    await db.delete(item)
    await db.commit()
