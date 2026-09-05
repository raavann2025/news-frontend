import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, ArrowUp, Loader2 } from "lucide-react";
import SwipeStack from "@/components/SwipeStack";
import { InsightCardView } from "@/components/ConsumerCard";
import AskSheet from "@/components/AskSheet";
import { fetchHot, getDeviceId, recordHistory } from "@/lib/api";
import { padCards } from "@/lib/placeholders";

/* =========================================================================
 * HotFeed — the "Hot Now" hero deck (12 editor-written root cards).
 * Vertical swipe between cards; double-tap a card opens its Directions.
 * ========================================================================= */
export default function HotFeed() {
  const navigate = useNavigate();
  const deviceId = getDeviceId();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [hasSwiped, setHasSwiped] = useState(false);
  const [ask, setAsk] = useState(null); // {card, record}

  useEffect(() => {
    fetchHot().then((d) => setCards(padCards(d.cards, 0, 12))).catch(() => setCards(padCards([], 0, 12))).finally(() => setLoading(false));
  }, []);

  useEffect(() => { const c = cards[activeIdx]; if (c) recordHistory({ id: c.id, headline: c.headline, level: 0 }); }, [activeIdx, cards]);

  const goDeep = (card) => navigate("/directions", { state: { cardId: card.id, label: card.headline } });

  const total = cards.length;

  return (
    <section className="mx-auto w-full max-w-xl px-5 sm:px-0" data-testid="hot-feed">
      {/* Header */}
      <div className="mx-auto mb-4 flex w-full max-w-md items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.span animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 1.8 }}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-white/90">
            <Flame className="h-3 w-3" fill="currentColor" />
          </motion.span>
          <div>
            <p className="font-ui text-[10px] uppercase tracking-[0.32em] text-white/60">Hot Now</p>
            <p className="font-ui text-[9px] uppercase tracking-[0.24em] text-white/30">Double-tap any card to go deeper</p>
          </div>
        </div>
        {total > 0 && (
          <span className="font-ui text-[10px] uppercase tracking-[0.28em] text-white/45" data-testid="hot-progress">
            {String(Math.min(activeIdx + 1, total)).padStart(2, "0")}<span className="mx-1 text-white/20">/</span>{String(total).padStart(2, "0")}
          </span>
        )}
      </div>

      {/* Card stack container */}
      <div className="relative mx-auto h-[calc(100dvh-160px)] max-h-[820px] min-h-[500px] w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0F0F11] shadow-[0_10px_60px_rgba(0,0,0,0.5)]">
        {loading ? (
          <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
        ) : total === 0 ? (
          <div className="flex h-full items-center justify-center px-8 text-center">
            <p className="font-editorial text-sm italic text-white/50">No hot stories published yet. Our editors are on it.</p>
          </div>
        ) : (
          <>
            <SwipeStack
              total={total}
              activeIdx={activeIdx}
              disabled={!!ask}
              onIndexChange={(n) => { setHasSwiped(true); setActiveIdx(n); }}
              renderCard={(i) => (
                <InsightCardView card={cards[i]} idx={i} total={total} deckKind="hot"
                  showHint={i === activeIdx && !hasSwiped && i === 0}
                  onDeeper={goDeep} onAsk={(c, o) => setAsk({ card: c, ...o })} />
              )}
            />
            {!hasSwiped && total > 1 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-20 z-10 flex flex-col items-center gap-1">
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-white/25 text-white/60"><ArrowUp className="h-3 w-3" /></motion.div>
                <p className="font-ui text-[9px] uppercase tracking-[0.28em] text-white/45">Swipe up</p>
              </div>
            )}
          </>
        )}
      </div>

      <AskSheet
        open={!!ask}
        autoRecord={ask?.record}
        card={ask?.card}
        deviceId={deviceId}
        onClose={() => setAsk(null)}
        onPickQuestion={(childId) => { const c = ask.card; setAsk(null); navigate("/feed", { state: { parentId: c.id, startId: childId, label: c.headline } }); }}
        onDeepDiveDone={(newCard) => { const c = ask.card; setAsk(null); navigate("/feed", { state: { parentId: c.id, startId: newCard.id, label: c.headline } }); }}
      />
    </section>
  );
}
