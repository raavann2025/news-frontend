import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2, Shield } from "lucide-react";
import EditorShell from "@/components/EditorShell";
import { listEditors, registerEditor, deleteEditor } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Editors() {
  const { user } = useAuth();
  const [editors, setEditors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "editor" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setEditors(await listEditors()); } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await registerEditor(form);
      toast.success("Editor added");
      setForm({ name: "", email: "", password: "", role: "editor" });
      load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Could not add editor"); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this editor?")) return;
    try { await deleteEditor(id); toast.success("Removed"); load(); }
    catch (err) { toast.error(err?.response?.data?.detail || "Could not remove"); }
  };

  const isAdmin = user?.role === "admin";

  return (
    <EditorShell>
      <div className="mb-8">
        <h1 className="font-editorial text-4xl font-bold tracking-tight">Editors</h1>
        <p className="mt-1 text-sm text-[#71717A]">Manage who can write and publish stories.</p>
      </div>

      {isAdmin && (
        <form onSubmit={add} data-testid="add-editor-form" className="mb-8 grid grid-cols-1 gap-3 rounded-lg border border-[#E4E4E7] bg-white p-5 md:grid-cols-5">
          <input data-testid="editor-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name"
            className="rounded-md border border-[#E4E4E7] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]" />
          <input data-testid="editor-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email"
            className="rounded-md border border-[#E4E4E7] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]" />
          <input data-testid="editor-password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password"
            className="rounded-md border border-[#E4E4E7] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]" />
          <select data-testid="editor-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="rounded-md border border-[#E4E4E7] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]">
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <button data-testid="add-editor-btn" disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Add
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#71717A]" /></div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#E4E4E7] bg-white">
          {editors.map((ed) => (
            <div key={ed.id} data-testid={`editor-row-${ed.id}`} className="flex items-center gap-4 border-b border-[#F4F4F5] px-5 py-3.5 last:border-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F4F5] font-mono text-sm font-bold">{(ed.name || ed.email)[0].toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{ed.name || "—"}</p>
                <p className="truncate text-xs text-[#71717A]">{ed.email}</p>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${ed.role === "admin" ? "bg-[#0A0A0A] text-white" : "bg-[#F4F4F5] text-[#71717A]"}`}>
                {ed.role === "admin" && <Shield className="h-3 w-3" />} {ed.role}
              </span>
              {isAdmin && ed.role !== "admin" && ed.id !== user?.id && (
                <button data-testid={`delete-editor-${ed.id}`} onClick={() => remove(ed.id)} className="rounded-md p-2 text-[#E63946] hover:bg-[#E63946]/5"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </EditorShell>
  );
}
