import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Check, Trash2, CornerDownRight } from "lucide-react";
import EditorShell from "@/components/EditorShell";
import { listCommunity, publishCommunity, rejectCommunity } from "@/lib/api";

export default function Community() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listCommunity();
      setItems(data);
      setDrafts(Object.fromEntries(data.map((c) => [c.id, { headline: c.headline, body: c.body }])));
    } catch { toast.error("Failed to load queue"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const setDraft = (id, k, v) => setDrafts((d) => ({ ...d, [id]: { ...d[id], [k]: v } }));

  const publish = async (id) => {
    setBusyId(id);
    try {
      await publishCommunity(id, { headline: drafts[id].headline, body: drafts[id].body });
      toast.success("Promoted to public tree");
      setItems((it) => it.filter((c) => c.id !== id));
    } catch { toast.error("Could not publish"); }
    finally { setBusyId(null); }
  };

  const reject = async (id) => {
    setBusyId(id);
    try { await rejectCommunity(id); setItems((it) => it.filter((c) => c.id !== id)); toast("Removed"); }
    catch { toast.error("Could not remove"); }
    finally { setBusyId(null); }
  };

  return (
    <EditorShell>
      <div className="mb-8">
        <h1 className="font-editorial text-4xl font-bold tracking-tight">Community AI</h1>
        <p className="mt-1 text-sm text-[#71717A]">Readers' private custom deep-dives. Edit for accuracy, then promote the best into the public tree.</p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#71717A]" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#D4D4D8] py-20 text-center">
          <Sparkles className="mx-auto mb-3 h-6 w-6 text-[#71717A]" />
          <p className="font-editorial text-xl">No pending deep-dives</p>
          <p className="mt-1 text-sm text-[#71717A]">When readers ask their own questions, their AI answers land here for review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((c) => (
            <div key={c.id} data-testid={`community-item-${c.id}`} className="rounded-lg border border-[#E4E4E7] bg-white p-5">
              <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#71717A]">
                <CornerDownRight className="h-3 w-3" /> under: {c.parent_headline || "—"}
              </div>
              <p className="mb-3 rounded-md bg-[#F4F4F5] px-3 py-2 text-sm text-[#3f3f46]"><span className="font-semibold">Reader asked:</span> {c.question_label}</p>

              <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.15em] text-[#71717A]">Headline</label>
              <input data-testid={`community-headline-${c.id}`} value={drafts[c.id]?.headline || ""} onChange={(e) => setDraft(c.id, "headline", e.target.value)}
                className="mb-3 w-full rounded-md border border-[#E4E4E7] px-3 py-2 font-editorial text-lg outline-none focus:border-[#0A0A0A]" />
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.15em] text-[#71717A]">AI answer</label>
              <textarea data-testid={`community-body-${c.id}`} value={drafts[c.id]?.body || ""} onChange={(e) => setDraft(c.id, "body", e.target.value)} rows={4}
                className="mb-4 w-full resize-none rounded-md border border-[#E4E4E7] px-3 py-2 text-sm leading-relaxed outline-none focus:border-[#0A0A0A]" />

              <div className="flex gap-2">
                <button data-testid={`community-publish-${c.id}`} onClick={() => publish(c.id)} disabled={busyId === c.id}
                  className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {busyId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Publish to public tree
                </button>
                <button data-testid={`community-reject-${c.id}`} onClick={() => reject(c.id)} disabled={busyId === c.id}
                  className="inline-flex items-center gap-2 rounded-md border border-[#E4E4E7] px-4 py-2 text-sm font-medium text-[#E63946] hover:bg-[#E63946]/5">
                  <Trash2 className="h-4 w-4" /> Discard
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </EditorShell>
  );
}
