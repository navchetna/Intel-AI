import Link from "next/link";
import { settings } from "@/config/settings";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-10">
      <h1 className="text-3xl font-bold">{settings.appName}</h1>
      <p className="mt-2 text-gray-600">
        Modular FastAPI + Next.js boilerplate. Add feature modules under{" "}
        <code className="rounded bg-gray-100 px-1">app/(modules)/</code>.
      </p>
      <ul className="mt-6 list-disc pl-6">
        <li>
          <Link className="text-blue-600 underline" href="/dashboard">
            Dashboard module
          </Link>
        </li>
      </ul>
    </main>
  );
}
