import { loadDashboard, ItemList } from "@/modules/dashboard";

/**
 * Dashboard route (thin).
 *
 * Routes under app/(modules)/ only wire a feature's business logic
 * (frontend/modules/<name>/) to a URL. Keep logic out of this file.
 */
export default async function DashboardPage() {
  const { items, error } = await loadDashboard();

  return (
    <main className="mx-auto max-w-2xl p-10">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-gray-600">Items fetched from the backend API.</p>

      {error ? (
        <p className="mt-6 rounded bg-red-50 p-3 text-red-700">
          Could not reach API: {error}
        </p>
      ) : (
        <ItemList items={items} />
      )}
    </main>
  );
}
