import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Flame, Clock, FileEdit, Layers, Loader2, ExternalLink } from "lucide-react";
import EditorShell from "@/components/EditorShell";
import { listStories, createCard } from "@/lib/api";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "hot", label: "Hot", feed: "hot" },
  { key: "old", label: "Latest", feed: "old" },
  { key: "draft", label: "Drafts", status: "draft" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [creating, setCreating] = useState(false);

  const load = async (f = filter) => {
    setLoading(true);
    const def = FILTERS.find((x) => x.key === f) || {};
    const params = {};
    if (def.feed) params.feed = def.feed;
    if (def.status) params.status = def.status;
    try { setStories(await listStories(params)); } catch { toast.error("Failed to load stories"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(filter); /* eslint-disable-next-line */ }, [filter]);

  const newStory = async () => {
    setCreating(true);
    try {
      const card = await createCard({ headline: "Untitled story", body: "", category: "Insight", status: "draft" });
      toast.success("Story created");
      navigate(`/editor/story/${card.id}`);
    } catch { toast.error("Could not create story"); }
    finally { setCreating(false); }
  };

  return (
    <EditorShell>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-editorial text-4xl font-bold tracking-tight">Stories</h1>
          <p className="mt-1 text-sm text-[#71717A]">Build recursive rabbit holes. Each story is a tree of hand-written cards.</p>
        </div>
        <button data-testid="new-story-btn" onClick={newStory} disabled={creating}
          className="inline-flex items-center gap-2 rounded-md bg-[#E63946] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} New story
        </button>
      </div>

      <div className="mb-6 flex gap-1 border-b border-[#E4E4E7]">
        {FILTERS.map((f) => (
          <button key={f.key} data-testid={`filter-${f.key}`} onClick={() => setFilter(f.key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${filter === f.key ? "border-[#0A0A0A] text-[#0A0A0A]" : "border-transparent text-[#71717A] hover:text-[#0A0A0A]"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#71717A]" /></div>
      ) : stories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#D4D4D8] py-20 text-center">
          <p className="font-editorial text-xl text-[#0A0A0A]">No stories here yet</p>
          <p className="mt-1 text-sm text-[#71717A]">Create your first story to start building.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stories.map((s) => (
            <button key={s.id} data-testid={`story-card-${s.id}`} onClick={() => navigate(`/editor/story/${s.id}`)}
              className="group flex flex-col rounded-lg border border-[#E4E4E7] bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[#0A0A0A]">
              <div className="mb-3 flex items-center gap-2">
                {s.is_hot && <span className="inline-flex items-center gap-1 rounded-full bg-[#E63946]/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#E63946]"><Flame className="h-3 w-3" /> Hot</span>}
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${s.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-[#F4F4F5] text-[#71717A]"}`}>
                  {s.status === "published" ? <Clock className="h-3 w-3" /> : <FileEdit className="h-3 w-3" />} {s.status}
                </span>
              </div>
              <h3 className="font-editorial text-xl font-bold leading-snug tracking-tight text-[#0A0A0A]">{s.headline || "Untitled"}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-[#52525B]">{s.body || "No summary yet."}</p>
              <div className="mt-4 flex items-center gap-3 border-t border-[#F4F4F5] pt-3 font-mono text-[11px] text-[#71717A]">
                <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" /> {s.descendant_count} deeper</span>
                <span className="ml-auto inline-flex items-center gap-1 text-[#0A0A0A] opacity-0 transition-opacity group-hover:opacity-100">Open <ExternalLink className="h-3 w-3" /></span>
              </div>
            </button>
          ))}
        </div>
      )}
    </EditorShell>
  );
}
