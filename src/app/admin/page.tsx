import Link from "next/link";
import { InviteForm } from "@/components/auth-forms";
import { LogoutButton } from "@/components/logout-button";
import { UserManagement } from "@/components/user-management";
import { readAuthState, requireOwner, toPublicUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireOwner();
  const state = await readAuthState();

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-5 py-6 text-[#1d2328]">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-col gap-4 border border-[#d9ded6] bg-white p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#597368]">Owner console</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#111816]">Access control</h1>
            <p className="mt-1 text-sm text-[#66736c]">Signed in as {session.email}</p>
          </div>
          <div className="flex gap-2">
            <Link className="inline-flex h-10 items-center rounded-sm border border-[#cfd7cf] px-3 text-sm font-semibold text-[#173f35] hover:bg-[#f1f5ef]" href="/">
              File vault
            </Link>
            <LogoutButton />
          </div>
        </header>
        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <InviteForm />
          <UserManagement
            currentUserId={session.userId}
            users={state.users.map(toPublicUser)}
          />
        </div>
      </div>
    </main>
  );
}
