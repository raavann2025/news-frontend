import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { InsightCardView } from "@/components/ConsumerCard";
import { fetchPreview } from "@/lib/api";

/* =========================================================================
 * Preview — a shareable, public, read-only view of a single card exactly as
 * the reader will see it (works for drafts too). Used by editors to preview
 * and share how a card looks before publishing.
 * ========================================================================= */
export default function Preview() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const [card, setCard] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) { setError(true); return; }
    fetchPreview(id).then(setCard).catch(() => setError(true));
  }, [id]);

  if (error) return <div className="flex h-[100dvh] items-center justify-center bg-[#0C0C0D] font-editorial text-white/60">Card not found</div>;
  if (!card) return <div className="flex h-[100dvh] items-center justify-center bg-[#0C0C0D]"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#050505]">
      <div className="relative h-[100dvh] w-full max-w-md overflow-hidden bg-[#0C0C0D] sm:h-[860px] sm:rounded-[2.2rem] sm:border sm:border-white/10">
        <div className="pointer-events-none absolute inset-x-0 top-3 z-20 text-center font-ui text-[9px] uppercase tracking-[0.3em] text-white/35">Preview · {card.status}</div>
        <InsightCardView card={card} idx={0} total={1} deckKind="hot" />
      </div>
    </div>
  );
}
