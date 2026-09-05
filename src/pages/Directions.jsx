import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ArrowUpRight, Compass, Loader2 } from "lucide-react";
import { fetchChildren, streamDeepDive, getDeviceId } from "@/lib/api";
import { padDirections, isPlaceholderId } from "@/lib/placeholders";

/* =========================================================================
 * Directions — after double-tapping a card, the reader chooses a rabbit
 * hole. Directions are the editor-written child insights (their question
 * label, or headline). Picking one drops into the deeper 12-card feed.
 * A custom question spins up a private AI deep-dive.
 * ========================================================================= */
export default function Directions() {
  const location = useLocation();
  const navigate = useNavigate();
  const deviceId = getDeviceId();
  const cardId = location.state?.cardId;
  const label = location.state?.label || "";

  const [loading, setLoading] = useState(true);
  const [directions, setDirections] = useState([]);
  const [customText, setCustomText] = useState("");
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    if (!cardId) { navigate("/", { replace: true }); return; }
    if (isPlaceholderId(cardId)) { setDirections(padDirections([])); setLoading(false); return; }
    fetchChildren(cardId, deviceId)
      .then((d) => setDirections(padDirections(d.cards)))
      .catch(() => setDirections(padDirections([])))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  // Picking any direction opens the parent's 12-card feed (real or placeholder).
  const openFeed = (startId) => navigate("/feed", { state: { parentId: cardId, startId, label } });

  const submitCustom = async (e) => {
    e?.preventDefault?.();
    const q = customText.trim();
    if (!q || thinking) return;
    if (isPlaceholderId(cardId)) { openFeed(null); return; }
    setThinking(true);
    try {
      let finalCard = null;
      for await (const ev of streamDeepDive({ card_id: cardId, question: q, device_id: deviceId })) {
        if (ev.phase === "done") finalCard = ev.card;
        else if (ev.phase === "error") throw new Error(ev.message);
      }
      if (finalCard) navigate("/feed", { state: { parentId: cardId, startId: finalCard.id, label } });
    } catch { toast.error("The AI couldn't answer that"); }
    finally { setThinking(false); }
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#0C0C0D]">
      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-5">
        <button data-testid="dir-back" onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/80"><ArrowLeft className="h-4 w-4" /></button>
        <div className="max-w-[60%] truncate rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-ui text-[11px] text-white/70">{label}</div>
        <span className="w-9" />
      </header>

      <main className="relative z-10 px-5 pb-24 pt-8 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mx-auto w-full max-w-xl">
          <div className="mb-5 flex items-center gap-2">
            <Compass className="h-4 w-4 text-white/60" />
            <p className="font-ui text-[10px] uppercase tracking-[0.28em] text-white/50">Choose a rabbit hole</p>
          </div>
          <h1 className="font-editorial text-3xl leading-tight tracking-tight text-white sm:text-4xl" data-testid="dir-heading">Where should we go deep?</h1>
          <p className="mt-3 max-w-md font-ui text-sm text-white/50">Pick a direction below or write your own.</p>

          <div className="mt-8 space-y-3" data-testid="dir-list">
            {loading && [0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />)}
            <AnimatePresence>
              {!loading && directions.map((d, idx) => (
                <motion.button key={d.id} data-testid={`direction-card-${idx}`} onClick={() => openFeed(d.placeholder ? null : d.id)}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} whileTap={{ scale: 0.98 }}
                  className="group flex w-full items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left transition-colors hover:border-white/25 hover:bg-white/[0.05]">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-editorial text-lg leading-snug text-white">{d.question_label || d.headline}</h3>
                    <p className="mt-1.5 line-clamp-2 font-ui text-xs leading-relaxed text-white/55">{d.placeholder ? d.text : (d.question_label ? d.headline : d.text)}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-white/80" />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>

          {/* Custom direction → private AI deep-dive */}
          <form onSubmit={submitCustom} className="mt-8">
            <label className="block font-ui text-[10px] uppercase tracking-[0.24em] text-white/40">Or ask your own question</label>
            <div className="mt-2 flex items-center gap-2 border-b border-white/20 transition-colors focus-within:border-white/70">
              <input data-testid="dir-custom-input" value={customText} onChange={(e) => setCustomText(e.target.value)}
                placeholder="e.g. who benefits most from this?"
                className="w-full bg-transparent py-3 font-editorial text-base italic text-white outline-none placeholder:text-white/25" />
              <button type="submit" data-testid="dir-custom-submit" disabled={!customText.trim() || thinking}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#0C0C0D] transition-opacity disabled:opacity-30">
                {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
              </button>
            </div>
          </form>

          {/* Skip — always available */}
          <div className="mt-8 flex justify-center">
            <button data-testid="dir-skip" onClick={() => openFeed(null)}
              className="rounded-full border border-white/10 bg-white/[0.02] px-5 py-2.5 font-ui text-xs uppercase tracking-[0.18em] text-white/60 transition-colors hover:border-white/25 hover:text-white/95">
              Skip — just start swiping
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
