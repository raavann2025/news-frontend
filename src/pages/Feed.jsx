import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Layers, Loader2 } from "lucide-react";
import SwipeStack from "@/components/SwipeStack";
import { InsightCardView } from "@/components/ConsumerCard";
import AskSheet from "@/components/AskSheet";
import { fetchChildren, getDeviceId, recordHistory } from "@/lib/api";
import { padCards, placeholderDeck, isPlaceholderId } from "@/lib/placeholders";

/* =========================================================================
 * Feed — a swipeable deck of 12 cards at one depth level (real editor cards
 * first, padded with placeholders). Double-tapping a card pushes ITS 12
 * children as the next deck (infinite recursion). Back pops one level.
 * Every card has Save / Ask / Listen / Share / Mic + a Back Story button.
 * ========================================================================= */
export default function Feed() {
  const location = useLocation();
  const navigate = useNavigate();
  const deviceId = getDeviceId();
  const initialParent = location.state?.parentId;
  const initialStart = location.state?.startId;
  const rootLabel = location.state?.label || "Story";

  const [deckStack, setDeckStack] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branchLoading, setBranchLoading] = useState(false);
  const [ask, setAsk] = useState(null); // {card, record}

  const currentDeck = deckStack[deckStack.length - 1];
  const cards = currentDeck?.cards || [];
  const activeIdx = currentDeck?.activeIdx || 0;
  const total = cards.length;
  const depth = deckStack.length; // level 1 = first deck under a hot card

  // ---- Resolve a deck of children for a given card (real → padded to 12,
  //      or a full placeholder deck for placeholder / childless cards) ----
  const resolveChildren = async (cardId, level) => {
    if (isPlaceholderId(cardId)) return placeholderDeck(level, 12);
    try {
      const d = await fetchChildren(cardId, deviceId);
      return padCards(d.cards, level, 12);
    } catch {
      return placeholderDeck(level, 12);
    }
  };

  // ---- initial load ----
  useEffect(() => {
    if (!initialParent) { navigate("/", { replace: true }); return; }
    resolveChildren(initialParent, 1).then((list) => {
      let idx = 0;
      if (initialStart) { const f = list.findIndex((c) => c.id === initialStart); if (f >= 0) idx = f; }
      setDeckStack([{ id: "d0", label: rootLabel, cards: list, activeIdx: idx }]);
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { const c = cards[activeIdx]; if (c) recordHistory({ id: c.id, headline: c.headline, level: depth }); },

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeIdx, currentDeck?.id]);

  const updateTop = (patch) => setDeckStack((cur) => {
    if (!cur.length) return cur;
    const cl = [...cur]; cl[cl.length - 1] = { ...cl[cl.length - 1], ...patch }; return cl;
  });

  const goDeeper = async (card) => {
    setBranchLoading(true);
    try {
      const list = await resolveChildren(card.id, depth + 1);
      setDeckStack((cur) => [...cur, { id: `d-${Date.now()}`, label: card.headline?.slice(0, 40), cards: list, activeIdx: 0 }]);
    } finally {
      setBranchLoading(false);
    }
  };

  const back = () => {
    if (deckStack.length <= 1) { navigate(-1); return; }
    setDeckStack((cur) => cur.slice(0, -1));
  };

  if (loading) return <div className="flex h-[100dvh] items-center justify-center bg-[#0C0C0D]"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>;
  if (!deckStack.length) return (
    <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-[#0C0C0D] px-8 text-center text-white">
      <p className="font-editorial text-2xl">Nothing deeper here yet</p>
      <button onClick={() => navigate("/")} data-testid="feed-home-btn" className="rounded-full border border-white/20 px-5 py-2.5 font-ui text-sm">Back home</button>
    </div>
  );

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#0C0C0D]" data-testid="feed">
      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between gap-2 px-3 pt-3 sm:px-5 sm:pt-5">
        <button data-testid="feed-back" onClick={back} className="no-tap-zoom pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#121214]/95 text-white/80 backdrop-blur-md"><ArrowLeft className="h-4 w-4" /></button>
        <div className="pointer-events-auto flex min-w-0 flex-1 items-center justify-center gap-1.5 truncate rounded-full border border-white/10 bg-[#121214]/95 px-3 py-1.5 text-center font-ui text-[11px] text-white/70 backdrop-blur-md">
          {depth > 1 && <Layers className="h-3 w-3 text-fuchsia-300" />}
          {depth > 1 ? `Level ${depth} · ` : ""}{currentDeck?.label}
        </div>
        <span className="w-9" />
      </header>

      {/* Progress + depth dots */}
      <div className="pointer-events-none absolute inset-x-0 top-14 z-20 flex flex-col items-center gap-2 sm:top-16">
        <span className="font-ui text-[10px] tracking-[0.28em] text-white/45 uppercase">
          {String(Math.min(activeIdx + 1, total)).padStart(2, "0")}<span className="mx-1.5 text-white/20">/</span>{String(total).padStart(2, "0")}
        </span>
        {depth > 1 && (
          <div className="flex items-center gap-1">
            {Array.from({ length: depth }).map((_, i) => <span key={i} className={`h-1 w-1 rounded-full ${i === depth - 1 ? "bg-fuchsia-300" : "bg-white/25"}`} />)}
          </div>
        )}
      </div>

      <SwipeStack
        key={currentDeck?.id}
        total={total}
        activeIdx={activeIdx}
        disabled={!!ask}
        onIndexChange={(n) => updateTop({ activeIdx: n })}
        renderCard={(i) => (
          <InsightCardView card={cards[i]} idx={i} total={total} deckKind="deep"
            onDeeper={goDeeper} onAsk={(c, o) => setAsk({ card: c, ...o })} />
        )}
      />

      <AnimatePresence>
        {branchLoading && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="absolute inset-x-0 bottom-24 z-30 flex justify-center px-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#121214]/95 px-4 py-2.5 backdrop-blur-md">
              <Loader2 className="h-4 w-4 animate-spin text-fuchsia-300" />
              <span className="font-ui text-[11px] font-medium text-white/85">Falling deeper…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AskSheet
        open={!!ask}
        autoRecord={ask?.record}
        card={ask?.card}
        deviceId={deviceId}
        onClose={() => setAsk(null)}
        onPickQuestion={() => { const c = ask.card; setAsk(null); goDeeper(c); }}
        onDeepDiveDone={(newCard) => {
          setAsk(null);
          setDeckStack((cur) => [...cur, { id: `ai-${Date.now()}`, label: "Your deep dive", cards: [newCard], activeIdx: 0 }]);
        }}
      />
    </div>
  );
}
