"""Items module routes — full CRUD example."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.items import service
from app.modules.items.schemas import ItemCreate, ItemRead, ItemUpdate

router = APIRouter()


@router.get("", response_model=list[ItemRead], summary="List items")
async def list_items(db: AsyncSession = Depends(get_db)) -> list[ItemRead]:
    return await service.list_items(db)


@router.post(
    "",
    response_model=ItemRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create item",
)
async def create_item(payload: ItemCreate, db: AsyncSession = Depends(get_db)) -> ItemRead:
    return await service.create_item(db, payload)


@router.get("/{item_id}", response_model=ItemRead, summary="Get item by id")
async def get_item(item_id: int, db: AsyncSession = Depends(get_db)) -> ItemRead:
    item = await service.get_item(db, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


@router.patch("/{item_id}", response_model=ItemRead, summary="Update item")
async def update_item(
    item_id: int, payload: ItemUpdate, db: AsyncSession = Depends(get_db)
) -> ItemRead:
    item = await service.get_item(db, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return await service.update_item(db, item, payload)


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete item",
)
async def delete_item(item_id: int, db: AsyncSession = Depends(get_db)) -> None:
    item = await service.get_item(db, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    await service.delete_item(db, item)
