import type { Item } from "../types";

/** Presentational component (UI) for the dashboard item list. */
export function ItemList({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return <p className="mt-6 text-gray-500">No items yet.</p>;
  }
  return (
    <ul className="mt-6 space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded border p-3">
          <span className="font-medium">{item.name}</span>
          {item.description ? (
            <span className="text-gray-500"> — {item.description}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
