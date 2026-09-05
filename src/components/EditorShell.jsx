import { useNavigate, useLocation } from "react-router-dom";
import { LayoutGrid, Users, Sparkles, LogOut, Rabbit } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/editor", label: "Stories", icon: LayoutGrid, testId: "nav-stories" },
  { to: "/editor/community", label: "Community AI", icon: Sparkles, testId: "nav-community" },
  { to: "/editor/team", label: "Editors", icon: Users, testId: "nav-team" },
];

export default function EditorShell({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-[#F8F9FA] font-plex text-[#0A0A0A]">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-[#E4E4E7] bg-white p-6">
        <div className="mb-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0A0A0A] text-white">
            <Rabbit className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none tracking-tight">Rabbit Hole</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#71717A]">Editor Studio</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((n) => {
            const active = pathname === n.to;
            return (
              <button
                key={n.to} data-testid={n.testId} onClick={() => navigate(n.to)}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-[#0A0A0A] text-white" : "text-[#3f3f46] hover:bg-[#F4F4F5]"}`}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[#E4E4E7] pt-4">
          <p className="truncate text-xs font-semibold">{user?.name || user?.email}</p>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[#71717A]">{user?.role}</p>
          <button data-testid="logout-btn" onClick={() => { logout(); navigate("/editor/login"); }}
            className="flex items-center gap-2 text-xs font-medium text-[#71717A] hover:text-[#E63946]">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      <main className="ml-60 flex-1 p-10">{children}</main>
    </div>
  );
}
