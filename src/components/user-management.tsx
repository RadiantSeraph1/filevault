"use client";

import { FormEvent, useState } from "react";
import { Save, Trash2, Users } from "lucide-react";
import type { PublicUser, UserRole } from "@/lib/auth";

async function requestJson(url: string, options: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}

export function UserManagement({
  users,
  currentUserId,
}: {
  users: PublicUser[];
  currentUserId: string;
}) {
  const [rows, setRows] = useState(users);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateDraft(id: string, patch: Partial<PublicUser>) {
    setRows((current) =>
      current.map((user) => (user.id === id ? { ...user, ...patch } : user)),
    );
  }

  async function saveUser(event: FormEvent<HTMLFormElement>, user: PublicUser) {
    event.preventDefault();
    setStatus(null);
    setError(null);

    try {
      const payload = await requestJson(`/api/auth/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ email: user.email, role: user.role }),
      });
      setRows((current) =>
        current.map((row) => (row.id === user.id ? payload.user : row)),
      );
      setStatus(`Saved ${payload.user.email}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "User update failed.");
    }
  }

  async function removeUser(user: PublicUser) {
    if (!window.confirm(`Delete access for ${user.email}?`)) {
      return;
    }

    setStatus(null);
    setError(null);

    try {
      await requestJson(`/api/auth/users/${user.id}`, { method: "DELETE" });
      setRows((current) => current.filter((row) => row.id !== user.id));
      setStatus(`Deleted ${user.email}.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "User delete failed.");
    }
  }

  return (
    <section className="border border-[#d9ded6] bg-white p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="auth-icon">
          <Users size={18} />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-[#111816]">User control</h2>
          <p className="text-sm text-[#66736c]">Edit roles and remove access.</p>
        </div>
      </div>
      {error ? <p className="auth-error">{error}</p> : null}
      {status ? <p className="auth-success">{status}</p> : null}
      <div className="mt-4 space-y-3 md:hidden">
        {rows.map((user) => (
          <form
            className="border border-[#edf0e9] bg-[#fbfbf8] p-3"
            key={user.id}
            onSubmit={(event) => saveUser(event, user)}
          >
            <label className="auth-label mt-0">
              Email
              <input
                className="auth-input"
                value={user.email}
                onChange={(event) => updateDraft(user.id, { email: event.target.value })}
                type="email"
              />
            </label>
            <label className="auth-label">
              Role
              <select
                className="auth-input bg-white"
                value={user.role}
                onChange={(event) =>
                  updateDraft(user.id, { role: event.target.value as UserRole })
                }
              >
                <option value="member">Member</option>
                <option value="owner">Owner</option>
              </select>
            </label>
            <p className="mt-3 font-mono text-xs text-[#66736c]">
              Created {new Date(user.createdAt).toISOString().slice(0, 10)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-[#173f35] px-3 text-sm font-semibold text-white hover:bg-[#0f2d26]"
                type="submit"
              >
                <Save size={15} />
                Save
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-[#e0b9ac] px-3 text-sm font-semibold text-[#8c3c26] hover:bg-[#fff4ef] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={user.id === currentUserId}
                onClick={() => removeUser(user)}
                type="button"
              >
                <Trash2 size={15} />
                Delete
              </button>
            </div>
          </form>
        ))}
      </div>
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#dfe6de] text-left text-xs uppercase tracking-[0.12em] text-[#66736c]">
              <th className="py-2 pr-3 font-semibold">Email</th>
              <th className="py-2 pr-3 font-semibold">Role</th>
              <th className="py-2 pr-3 font-semibold">Created</th>
              <th className="py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <tr key={user.id} className="border-b border-[#edf0e9]">
                <td className="py-3 pr-3">
                  <input
                    className="h-10 w-full border border-[#cfd7cf] px-3 text-sm outline-none focus:border-[#173f35]"
                    value={user.email}
                    onChange={(event) => updateDraft(user.id, { email: event.target.value })}
                    type="email"
                  />
                </td>
                <td className="py-3 pr-3">
                  <select
                    className="h-10 w-full border border-[#cfd7cf] bg-white px-3 text-sm outline-none focus:border-[#173f35]"
                    value={user.role}
                    onChange={(event) =>
                      updateDraft(user.id, { role: event.target.value as UserRole })
                    }
                  >
                    <option value="member">Member</option>
                    <option value="owner">Owner</option>
                  </select>
                </td>
                <td className="py-3 pr-3 font-mono text-xs text-[#66736c]">
                  {new Date(user.createdAt).toISOString().slice(0, 10)}
                </td>
                <td className="py-3">
                  <div className="flex justify-end gap-2">
                    <form onSubmit={(event) => saveUser(event, user)}>
                      <button
                        className="inline-flex h-10 items-center gap-2 rounded-sm bg-[#173f35] px-3 text-sm font-semibold text-white hover:bg-[#0f2d26]"
                        type="submit"
                      >
                        <Save size={15} />
                        <span className="hidden sm:inline">Save</span>
                      </button>
                    </form>
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-sm border border-[#e0b9ac] px-3 text-sm font-semibold text-[#8c3c26] hover:bg-[#fff4ef] disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={user.id === currentUserId}
                      onClick={() => removeUser(user)}
                      type="button"
                    >
                      <Trash2 size={15} />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
