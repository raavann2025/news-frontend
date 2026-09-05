import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Pencil, Trash2, ChevronRight, ChevronDown, Loader2,
  Eye, CornerDownRight, Flame, FileEdit, CheckCircle2,
} from "lucide-react";
import EditorShell from "@/components/EditorShell";
import CardEditPanel from "@/components/editor/CardEditPanel";
import StoryFlow from "@/components/editor/StoryFlow";
import { getTree, createCard, deleteCard, reorderCards } from "@/lib/api";

function flatten(node, depth, isRoot, expanded, out) {
  const children = node.children || [];
  const hasChildren = children.length > 0;
  out.push({ node, depth, isRoot, hasChildren, childCount: children.length });
  if (hasChildren && expanded.has(node.id)) {
    for (const c of children) flatten(c, depth + 1, false, expanded, out);
  }
  return out;
}

export default function TreeBuilder() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [busyId, setBusyId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [view, setView] = useState("flow"); // flow | tree

  // Find a node anywhere in the tree by id.
  const findNode = (n, id) => {
    if (!n) return null;
    if (n.id === id) return n;
    for (const c of n.children || []) { const f = findNode(c, id); if (f) return f; }
    return null;
  };

  // Drag-to-reorder: only reorders cards that share the SAME parent (siblings).
  const handleDrop = async (targetNode) => {
    const draggedId = dragId;
    setDragId(null);
    if (!draggedId || draggedId === targetNode.id) return;
    if (draggedId === targetNode.parent_id || targetNode.id === tree.id) return;
    const dragged = findNode(tree, draggedId);
    if (!dragged || dragged.parent_id !== targetNode.parent_id) {
      toast.message("Cards can only be reordered within the same level");
      return;
    }
    const parent = findNode(tree, dragged.parent_id);
    const siblings = (parent?.children || []).map((c) => c.id);
    const from = siblings.indexOf(draggedId);
    const to = siblings.indexOf(targetNode.id);
    if (from < 0 || to < 0) return;
    siblings.splice(to, 0, siblings.splice(from, 1)[0]);
    try { await reorderCards(siblings); toast.success("Reordered"); await load(); }
    catch { toast.error("Could not reorder"); }
  };

  const load = useCallback(async () => {
    try {
      const t = await getTree(storyId);
      setTree(t);
      setExpanded((prev) => new Set([...prev, t.id]));
    } catch { toast.error("Story not found"); navigate("/editor"); }
    finally { setLoading(false); }
  }, [storyId, navigate]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id) => setExpanded((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const addChild = async (parent) => {
    setBusyId(parent.id);
    try {
      const child = await createCard({ parent_id: parent.id, headline: "New insight", body: "", category: parent.category || "Insight", status: "draft" });
      await load();
      setExpanded((prev) => new Set([...prev, parent.id]));
      setEditing({ card: child, isRoot: false });
    } catch { toast.error("Could not add card"); }
    finally { setBusyId(null); }
  };

  const removeCard = async (card, isRoot) => {
    if (!window.confirm(isRoot ? "Delete this entire story and all its deeper cards?" : "Delete this card and everything beneath it?")) return;
    setBusyId(card.id);
    try {
      await deleteCard(card.id);
      toast.success("Deleted");
      if (isRoot) { navigate("/editor"); return; }
      await load();
    } catch { toast.error("Could not delete"); }
    finally { setBusyId(null); }
  };

  const onSaved = async () => { await load(); };

  if (loading) {
    return <EditorShell><div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#71717A]" /></div></EditorShell>;
  }

  const rows = flatten(tree, 0, true, expanded, []);

  return (
    <EditorShell>
      <div className="mb-6 flex items-center justify-between">
        <button data-testid="back-to-stories" onClick={() => navigate("/editor")} className="inline-flex items-center gap-2 text-sm font-medium text-[#71717A] hover:text-[#0A0A0A]">
          <ArrowLeft className="h-4 w-4" /> All stories
        </button>
        <a data-testid="preview-story" href={`/preview?id=${tree.id}`} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-[#E4E4E7] bg-white px-3.5 py-2 text-sm font-medium hover:border-[#0A0A0A]">
          <Eye className="h-4 w-4" /> Preview
        </a>
      </div>

      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#71717A]">Story chronology · left→right = deeper, top→bottom = lateral</p>
          <h1 className="mt-1 font-editorial text-3xl font-bold tracking-tight">{tree.headline}</h1>
        </div>
        <div className="flex rounded-md border border-[#E4E4E7] bg-white p-0.5">
          <button data-testid="view-flow" onClick={() => setView("flow")} className={`rounded px-3 py-1.5 text-xs font-semibold ${view === "flow" ? "bg-[#0A0A0A] text-white" : "text-[#71717A]"}`}>Flowchart</button>
          <button data-testid="view-tree" onClick={() => setView("tree")} className={`rounded px-3 py-1.5 text-xs font-semibold ${view === "tree" ? "bg-[#0A0A0A] text-white" : "text-[#71717A]"}`}>Tree</button>
        </div>
      </div>

      {view === "flow" ? (
        <StoryFlow tree={tree} busyId={busyId}
          onEdit={(c, r) => setEditing({ card: c, isRoot: r })}
          onAdd={addChild} onDelete={removeCard} />
      ) : (
      <div className="space-y-1.5 rounded-lg border border-[#E4E4E7] bg-white p-4" data-testid="tree-canvas">
        {rows.map(({ node, depth, isRoot, hasChildren, childCount }) => {
          const isOpen = expanded.has(node.id);
          return (
            <div key={node.id} className="relative" style={{ marginLeft: depth * 22 }} data-testid={`tree-node-${node.id}`}>
              <div
                draggable={!isRoot}
                onDragStart={() => setDragId(node.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => { if (dragId && dragId !== node.id) e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); handleDrop(node); }}
                className={`group flex items-start gap-2 rounded-md border px-3 py-2.5 transition-colors hover:border-[#0A0A0A] ${isRoot ? "border-[#0A0A0A]/25 bg-[#FAFAFA]" : "border-[#E4E4E7] bg-white"} ${dragId === node.id ? "opacity-40" : ""} ${dragId && dragId !== node.id && !isRoot ? "border-dashed" : ""}`}>
                <button onClick={() => toggle(node.id)} className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded ${hasChildren ? "text-[#0A0A0A] hover:bg-[#F4F4F5]" : "text-[#D4D4D8]"}`}>
                  {hasChildren ? (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <CornerDownRight className="h-3 w-3" />}
                </button>

                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setEditing({ card: node, isRoot })} data-testid={`node-title-${node.id}`}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isRoot && node.is_hot && <Flame className="h-3.5 w-3.5 text-[#E63946]" />}
                    <span className="font-editorial text-[15px] font-semibold leading-snug text-[#0A0A0A]">{node.headline || "Untitled"}</span>
                    {node.status === "published"
                      ? <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-700"><CheckCircle2 className="h-2.5 w-2.5" /> Live</span>
                      : <span className="inline-flex items-center gap-0.5 rounded bg-[#F4F4F5] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#71717A]"><FileEdit className="h-2.5 w-2.5" /> Draft</span>}
                    {node.question_label && <span className="rounded bg-[#F4F4F5] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#71717A]">Q: {node.question_label.slice(0, 24)}</span>}
                  </div>
                  {node.body && <p className="mt-0.5 line-clamp-1 text-xs text-[#71717A]">{node.body}</p>}
                  <span className="font-mono text-[10px] text-[#A1A1AA]">{hasChildren ? `${childCount} deeper` : "leaf"}</span>
                </div>

                <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button data-testid={`edit-${node.id}`} title="Edit" onClick={(e) => { e.stopPropagation(); setEditing({ card: node, isRoot }); }} className="flex h-7 w-7 items-center justify-center rounded-md text-[#3f3f46] hover:bg-[#F4F4F5]"><Pencil className="h-3.5 w-3.5" /></button>
                  <button data-testid={`add-child-${node.id}`} title="Add deeper card" onClick={(e) => { e.stopPropagation(); addChild(node); }} className="flex h-7 w-7 items-center justify-center rounded-md text-[#3f3f46] hover:bg-[#F4F4F5]">{busyId === node.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}</button>
                  <button data-testid={`delete-${node.id}`} title="Delete" onClick={(e) => { e.stopPropagation(); removeCard(node, isRoot); }} className="flex h-7 w-7 items-center justify-center rounded-md text-[#E63946] hover:bg-[#F4F4F5]"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {editing && (
        <CardEditPanel card={editing.card} isRoot={editing.isRoot} onClose={() => setEditing(null)} onSaved={onSaved} />
      )}
    </EditorShell>
  );
}
