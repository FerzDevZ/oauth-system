import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt="Foto profil"
              width={56}
              height={56}
              className="h-14 w-14 rounded-full"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-lg font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
              {(user.name ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {user.name ?? "Pengguna"}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {user.email ?? "Email tidak tersedia"}
            </p>
          </div>
        </div>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
            <dt className="text-zinc-500 dark:text-zinc-400">Provider</dt>
            <dd className="font-medium capitalize text-zinc-900 dark:text-zinc-50">
              {user.provider}
            </dd>
          </div>
          <div className="flex justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
            <dt className="text-zinc-500 dark:text-zinc-400">User ID</dt>
            <dd className="font-mono text-xs text-zinc-900 dark:text-zinc-50">{user.id}</dd>
          </div>
        </dl>

        <form action="/auth/logout" method="POST" className="mt-6">
          <button
            type="submit"
            className="h-11 w-full rounded-lg bg-red-600 text-sm font-medium text-white transition hover:bg-red-500"
          >
            Keluar (Logout)
          </button>
        </form>

        <form action="/auth/logout-all" method="POST" className="mt-3">
          <button
            type="submit"
            className="h-11 w-full rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Keluar dari semua perangkat
          </button>
        </form>
      </div>
    </main>
  );
}
