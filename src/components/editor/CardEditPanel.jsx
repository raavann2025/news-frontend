import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { X, Plus, Trash2, Upload, Loader2, Link as LinkIcon, Share2, Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import { updateCard, uploadImage, resolveImage } from "@/lib/api";
import { InsightCardView } from "@/components/ConsumerCard";

const CATEGORIES = ["Insight", "Politics", "Business", "Tech", "Markets", "Culture", "Startups", "Geopolitics", "India", "Science", "Sports"];

/* =========================================================================
 * CardEditPanel — full-screen editor. LEFT: a live phone preview rendering
 * the exact InsightCardView the reader sees (updates as you type). RIGHT:
 * the writing form (title, body, category, back story, direction label,
 * sources, image, status). The preview is shareable via a public link.
 * ========================================================================= */
export default function CardEditPanel({ card, isRoot, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (card) {
      setForm({
        headline: card.headline || "",
        body: card.body || "",
        category: card.category || "Insight",
        backstory: card.backstory || "",
        sources: card.sources?.length ? card.sources : [{ title: "", url: "" }],
        image_url: card.image_url || "",
        question_label: card.question_label || "",
        status: card.status || "draft",
        is_hot: !!card.is_hot,
        created_at: (card.created_at || "").slice(0, 16),
      });
    }
  }, [card]);

  const previewCard = useMemo(() => {
    if (!form) return null;
    const srcs = (form.sources || []).filter((s) => s.title || s.url);
    return {
      id: card.id, topic: form.category, headline: form.headline || "Untitled",
      text: form.body || "Start writing the insight…", category: form.category,
      image_url: form.image_url || null,
      source_url: srcs[0]?.url || null, source_title: srcs[0]?.title || null,
      sources: srcs, backstory: form.backstory, has_backstory: !!form.backstory.trim(),
      has_children: false,
    };
  }, [form, card]);

  if (!card || !form) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSource = (i, k, v) => setForm((f) => { const s = [...f.sources]; s[i] = { ...s[i], [k]: v }; return { ...f, sources: s }; });

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { const res = await uploadImage(file); set("image_url", res.url); toast.success("Image uploaded"); }
    catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        headline: form.headline, body: form.body, category: form.category,
        backstory: form.backstory,
        sources: form.sources.filter((s) => s.title || s.url),
        image_url: form.image_url || null,
        question_label: form.question_label || null,
        status: form.status, is_hot: form.is_hot,
      };
      if (form.created_at) payload.created_at = new Date(form.created_at).toISOString();
      const updated = await updateCard(card.id, payload);
      toast.success(form.status === "published" ? "Saved & live for readers" : "Saved");
      onSaved(updated);
    } catch { toast.error("Could not save"); }
    finally { setSaving(false); }
  };

  const sharePreview = async () => {
    const url = `${window.location.origin}/preview?id=${card.id}`;
    try { await navigator.clipboard.writeText(url); toast.success("Preview link copied"); }
    catch { window.open(url, "_blank"); }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40" data-testid="card-edit-panel" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="m-auto flex h-[92vh] w-[min(1040px,95vw)] overflow-hidden rounded-2xl border border-[#E4E4E7] bg-[#F8F9FA] font-plex shadow-2xl">

        {/* LEFT — live phone preview */}
        <div className="hidden w-[420px] flex-shrink-0 flex-col items-center justify-center border-r border-[#E4E4E7] bg-[#0C0C0D] p-8 md:flex">
          <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40"><Smartphone className="h-3.5 w-3.5" /> Live reader preview</div>
          <div className="relative h-[620px] w-[300px] overflow-hidden rounded-[2rem] border-[6px] border-[#1c1c1f] bg-[#0C0C0D] shadow-[0_20px_60px_rgba(0,0,0,0.5)]" data-testid="edit-live-preview">
            <InsightCardView card={previewCard} idx={0} total={1} deckKind="hot" />
          </div>
          <button data-testid="share-preview-btn" onClick={sharePreview} className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 font-ui text-xs text-white/80 hover:bg-white/[0.1]">
            <Share2 className="h-3.5 w-3.5" /> Copy shareable preview link
          </button>
        </div>

        {/* RIGHT — form */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-[#E4E4E7] bg-white px-6 py-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#71717A]">{isRoot ? "Root story card" : "Insight card"}</p>
              <h3 className="text-lg font-bold tracking-tight">Write the card</h3>
            </div>
            <button onClick={onClose} data-testid="edit-close" className="rounded-md p-2 hover:bg-[#F4F4F5]"><X className="h-5 w-5" /></button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <Field label="Title"><textarea data-testid="edit-headline" value={form.headline} onChange={(e) => set("headline", e.target.value)} rows={2} className="w-full resize-none rounded-md border border-[#E4E4E7] px-3 py-2 font-editorial text-lg outline-none focus:border-[#0A0A0A]" /></Field>
            <Field label="Body (3-4 sentences)"><textarea data-testid="edit-body" value={form.body} onChange={(e) => set("body", e.target.value)} rows={5} className="w-full resize-none rounded-md border border-[#E4E4E7] px-3 py-2 text-sm leading-relaxed outline-none focus:border-[#0A0A0A]" /></Field>
            <Field label="Back Story (shown when readers tap “Back Story”)"><textarea data-testid="edit-backstory" value={form.backstory} onChange={(e) => set("backstory", e.target.value)} rows={4} placeholder="The context behind this insight…" className="w-full resize-none rounded-md border border-[#E4E4E7] px-3 py-2 text-sm leading-relaxed outline-none focus:border-[#0A0A0A]" /></Field>

            <Field label="Category"><select data-testid="edit-category" value={form.category} onChange={(e) => set("category", e.target.value)} className="w-full rounded-md border border-[#E4E4E7] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>

            {!isRoot && (
              <Field label="Direction label (the choice readers see after double-tapping the parent)">
                <input data-testid="edit-question" value={form.question_label} onChange={(e) => set("question_label", e.target.value)} placeholder="e.g. Why does this matter?" className="w-full rounded-md border border-[#E4E4E7] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]" />
              </Field>
            )}

            <Field label="Sources">
              <div className="space-y-2">
                {form.sources.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <input data-testid={`edit-source-title-${i}`} value={s.title} onChange={(e) => setSource(i, "title", e.target.value)} placeholder="Title" className="w-1/2 rounded-md border border-[#E4E4E7] px-2.5 py-1.5 text-xs outline-none focus:border-[#0A0A0A]" />
                    <input data-testid={`edit-source-url-${i}`} value={s.url} onChange={(e) => setSource(i, "url", e.target.value)} placeholder="https://" className="flex-1 rounded-md border border-[#E4E4E7] px-2.5 py-1.5 text-xs outline-none focus:border-[#0A0A0A]" />
                    <button onClick={() => set("sources", form.sources.filter((_, x) => x !== i))} className="rounded-md p-1.5 text-[#71717A] hover:bg-[#F4F4F5]"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                <button data-testid="add-source-btn" onClick={() => set("sources", [...form.sources, { title: "", url: "" }])} className="inline-flex items-center gap-1 text-xs font-medium text-[#0A0A0A]"><Plus className="h-3.5 w-3.5" /> Add source</button>
              </div>
            </Field>

            <Field label="Image (auto-fits the reader's phone)">
              {resolveImage(form.image_url) && <img src={resolveImage(form.image_url)} alt="" className="mb-2 h-32 w-full rounded-md object-cover" />}
              <div className="flex gap-2">
                <label data-testid="upload-image-btn" className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#E4E4E7] px-3 py-2 text-xs font-medium hover:bg-[#F4F4F5]">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload
                  <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
                </label>
                {form.image_url && <button onClick={() => set("image_url", "")} className="rounded-md border border-[#E4E4E7] px-3 py-2 text-xs text-[#E63946]">Remove</button>}
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-md border border-[#E4E4E7] px-2.5 py-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-[#71717A]" />
                <input data-testid="edit-image-url" value={form.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="…or paste image URL" className="flex-1 text-xs outline-none" />
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Status">
                <select data-testid="edit-status" value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full rounded-md border border-[#E4E4E7] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]">
                  <option value="draft">Draft</option><option value="published">Published</option>
                </select>
              </Field>
              {isRoot && (
                <Field label="Feed">
                  <button data-testid="edit-hot-toggle" onClick={() => set("is_hot", !form.is_hot)} className={`w-full rounded-md border px-3 py-2 text-sm font-medium ${form.is_hot ? "border-[#E63946] bg-[#E63946]/10 text-[#E63946]" : "border-[#E4E4E7] text-[#71717A]"}`}>{form.is_hot ? "🔥 Hot feed" : "Latest feed"}</button>
                </Field>
              )}
            </div>

            <Field label="Publish date (controls feed order)"><input data-testid="edit-date" type="datetime-local" value={form.created_at} onChange={(e) => set("created_at", e.target.value)} className="w-full rounded-md border border-[#E4E4E7] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]" /></Field>
          </div>

          <div className="flex gap-3 border-t border-[#E4E4E7] bg-white px-6 py-4">
            <button data-testid="save-card-btn" onClick={save} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#0A0A0A] py-3 text-sm font-semibold text-white disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save card
            </button>
            <button data-testid="share-preview-btn-2" onClick={sharePreview} className="rounded-md border border-[#E4E4E7] px-4 py-3 text-sm font-medium hover:bg-[#F4F4F5] md:hidden"><Share2 className="h-4 w-4" /></button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.15em] text-[#71717A]">{label}</label>
      {children}
    </div>
  );
}
