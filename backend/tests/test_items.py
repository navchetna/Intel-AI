"""Tests for the items CRUD module."""

import pytest


@pytest.mark.asyncio
async def test_item_crud_flow(client):
    # Create
    resp = await client.post("/api/items", json={"name": "widget", "description": "a thing"})
    assert resp.status_code == 201
    created = resp.json()
    item_id = created["id"]
    assert created["name"] == "widget"

    # List
    resp = await client.get("/api/items")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # Get
    resp = await client.get(f"/api/items/{item_id}")
    assert resp.status_code == 200

    # Update
    resp = await client.patch(f"/api/items/{item_id}", json={"name": "gadget"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "gadget"

    # Delete
    resp = await client.delete(f"/api/items/{item_id}")
    assert resp.status_code == 204

    # Confirm gone
    resp = await client.get(f"/api/items/{item_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_missing_item(client):
    resp = await client.get("/api/items/9999")
    assert resp.status_code == 404
