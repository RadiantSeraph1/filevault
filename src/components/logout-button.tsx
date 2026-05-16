"use client";

import { LogOut } from "lucide-react";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button
      className="inline-flex h-10 items-center gap-2 rounded-sm border border-[#cfd7cf] px-3 text-sm font-semibold text-[#173f35] transition hover:bg-[#f1f5ef]"
      onClick={logout}
      type="button"
    >
      <LogOut size={16} />
      Sign out
    </button>
  );
}
