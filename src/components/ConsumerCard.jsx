import React, { useRef, useState } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import html2canvas from "html2canvas";
import {
  Link as LinkIcon, Bookmark, MessageCircle, Volume2, VolumeX, Share2, Mic,
  X, BookOpen, Sparkles, Maximize2,
} from "lucide-react";
import { fetchTTS, toggleSavedCard, isSaved, resolveImage } from "@/lib/api";

/* =========================================================================
 * InsightCardView — the single card design shared by Hot Now, every deeper
 * level, the editor's live preview and the shareable Preview page. It fills
 * its parent (h-full). Single-tap expands the full text; double-tap goes
 * deeper. Action bar: Save · Ask · Listen · Share · Mic. Tapping the image
 * opens a pinch-to-zoom fullscreen viewer. Sharing exports the WHOLE card
 * as an image.
 * ========================================================================= */
export function InsightCardView({
  card, idx, total, deckKind = "hot", showHint = false,
  onDeeper, onAsk,
}) {
  const [expanded, setExpanded] = useState(false);
  const [zoomImage, setZoomImage] = useState(false);
  const [backOpen, setBackOpen] = useState(false);
  const [saved, setSaved] = useState(() => isSaved(card.id));
  const [listening, setListening] = useState(false);
  const [sharing, setSharing] = useState(false);
  const audioRef = useRef(null);
  const tapTimer = useRef(null);
  const cardRef = useRef(null);
  const img = resolveImage(card.image_url);

  // ---- single vs double tap (ignored while a sheet/zoom is open) ----
  const handleClick = () => {
    if (zoomImage || backOpen) return;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapTimer.current = null; setExpanded(true); }, 260);
  };
  const handleDouble = () => {
    if (tapTimer.current) { clearTimeout(tapTimer.current); tapTimer.current = null; }
    onDeeper && onDeeper(card);
  };

  // ---- actions ----
  const doSave = (e) => { e.stopPropagation(); const now = toggleSavedCard(card); setSaved(now); toast[now ? "success" : "message"](now ? "Saved" : "Removed"); };

  const doShare = async (e) => {
    e.stopPropagation();
    if (sharing) return;
    setSharing(true);
    const linkUrl = `${window.location.origin}/preview?id=${card.id}`;
    try {
      // Capture the WHOLE card as an image so the full insight is shared.
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0C0C0D", useCORS: true, allowTaint: true, scale: 2,
      });
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      const file = new File([blob], "insight-card.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: card.headline, text: card.text });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "insight-card.png"; a.click();
        URL.revokeObjectURL(url);
        toast.success("Card image downloaded");
      }
    } catch {
      try {
        if (navigator.share) await navigator.share({ title: card.headline, text: card.text, url: linkUrl });
        else { await navigator.clipboard.writeText(linkUrl); toast.success("Link copied"); }
      } catch {}
    } finally { setSharing(false); }
  };

  const doListen = async (e) => {
    e.stopPropagation();
    if (listening && audioRef.current) { try { audioRef.current.pause(); } catch {} audioRef.current = null; setListening(false); return; }
    try {
      setListening(true);
      const blob = await fetchTTS(`${card.headline}. ${card.text}`, "sage");
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.setAttribute("playsinline", "true");
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); setListening(false); audioRef.current = null; };
      await audio.play();
    } catch { setListening(false); toast.error("Voice unavailable"); }
  };

  const openBackStory = (e) => {
    e.stopPropagation();
    if (card.has_backstory || card.backstory) setBackOpen(true);
    else onAsk && onAsk(card, { record: false });
  };

  return (
    <article
      ref={cardRef}
      data-testid={`insight-card-${idx}`}
      onClick={handleClick}
      onDoubleClick={handleDouble}
      className="relative flex h-full w-full flex-col bg-[#0C0C0D] px-6 pt-5 pb-6 no-tap-zoom sm:px-8"
      style={{ touchAction: "pan-y" }}
    >
      {/* Position counter */}
      <div className="relative flex flex-shrink-0 items-center justify-end">
        <span className="font-ui text-[9px] uppercase tracking-[0.28em] text-white/35">
          {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>

      {/* Image — fits the phone, tap to zoom fullscreen */}
      {img && (
        <button onClick={(e) => { e.stopPropagation(); setZoomImage(true); }} data-testid={`card-image-${idx}`}
          className="group relative mt-3 h-[34%] max-h-[300px] w-full flex-shrink-0 overflow-hidden rounded-2xl border border-white/10">
          <img src={img} alt={card.headline} crossOrigin="anonymous" className="h-full w-full object-cover" />
          <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white/90 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <Maximize2 className="h-3.5 w-3.5" />
          </span>
        </button>
      )}

      {/* Topic / category */}
      {card.topic && (
        <div data-testid={`card-topic-${idx}`} className="relative mt-4 line-clamp-1 font-ui text-[11px] uppercase tracking-[0.22em] text-white/45">{card.topic}</div>
      )}

      {/* Headline */}
      <h2 data-testid={`card-headline-${idx}`} className="relative mt-2 flex-shrink-0 font-editorial text-[26px] leading-[1.14] text-white sm:text-[28px]">{card.headline}</h2>

      {/* Body — masked/clipped */}
      <div className="relative mt-4 min-h-0 flex-1 overflow-hidden"
        style={{ WebkitMaskImage: "linear-gradient(to bottom, black calc(100% - 28px), transparent 100%)", maskImage: "linear-gradient(to bottom, black calc(100% - 28px), transparent 100%)" }}>
        <p data-testid={`card-text-${idx}`} className="font-editorial text-[15px] leading-[1.55] text-white/85 sm:text-[16px]">{card.text}</p>
      </div>

      {/* Source + Back Story */}
      <div className="relative mt-4 flex flex-shrink-0 items-center justify-between gap-3 pb-14">
        {card.source_url ? (
          <a href={card.source_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} data-testid={`card-source-${idx}`}
            className="inline-flex w-fit max-w-[50%] items-center gap-2 truncate rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-ui text-[11px] text-white/60 transition-colors hover:border-white/25 hover:text-white/90">
            <LinkIcon className="h-3 w-3" /><span className="truncate">{card.source_title ? card.source_title.slice(0, 32) : "Source"}</span>
          </a>
        ) : <span />}
        <button data-testid={`backstory-btn-${idx}`} onClick={openBackStory}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 py-1.5 font-ui text-[11px] font-medium text-fuchsia-200/90 transition hover:border-fuchsia-400/50 hover:bg-fuchsia-500/20">
          <BookOpen className="h-3 w-3" /> Back Story
        </button>
      </div>

      {/* Action bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-3 sm:bottom-6">
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-white/10 bg-[#121214]/95 px-1 py-1 shadow-[0_-2px_20px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <IconBtn testId={`save-btn-${idx}`} label={saved ? "Saved" : "Save"} onClick={doSave} active={saved}><Bookmark className="h-[17px] w-[17px]" fill={saved ? "currentColor" : "none"} /></IconBtn>
          <IconBtn testId={`ask-btn-${idx}`} label="Ask" onClick={(e) => { e.stopPropagation(); onAsk && onAsk(card, { record: false }); }}><MessageCircle className="h-[17px] w-[17px]" /></IconBtn>
          <IconBtn testId={`listen-btn-${idx}`} label={listening ? "Stop" : "Listen"} onClick={doListen} active={listening}>{listening ? <VolumeX className="h-[17px] w-[17px]" /> : <Volume2 className="h-[17px] w-[17px]" />}</IconBtn>
          <IconBtn testId={`share-btn-${idx}`} label="Share" onClick={doShare} active={sharing}><Share2 className="h-[17px] w-[17px]" /></IconBtn>
          <IconBtn testId={`mic-btn-${idx}`} label="Ask by voice" onClick={(e) => { e.stopPropagation(); onAsk && onAsk(card, { record: true }); }}><Mic className="h-[17px] w-[17px]" /></IconBtn>
        </div>
      </div>

      {showHint && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
          className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full border border-white/15 bg-[#121214]/95 px-3 py-1 font-ui text-[9px] uppercase tracking-[0.24em] text-white/70 backdrop-blur-md">
          Swipe · Double-tap deeper
        </motion.div>
      )}

      <ExpandedCardSheet card={card} idx={idx} open={expanded} onClose={() => setExpanded(false)} />
      <ImageZoomOverlay src={img} open={zoomImage} onClose={() => setZoomImage(false)} />
      <BackStorySheet card={card} idx={idx} open={backOpen} onClose={() => setBackOpen(false)} onAsk={() => { setBackOpen(false); onAsk && onAsk(card, { record: false }); }} />
    </article>
  );
}

function IconBtn({ children, label, onClick, testId, active, disabled }) {
  return (
    <button onClick={onClick} data-testid={testId} aria-label={label} disabled={disabled} style={{ touchAction: "manipulation" }}
      className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${active ? "bg-white text-[#0C0C0D]" : "text-white/85 hover:bg-white/10 hover:text-white"}`}>
      {children}
    </button>
  );
}

/* ===== Fullscreen expanded card (single-tap) ===== */
function ExpandedCardSheet({ card, idx, open, onClose }) {
  if (!open || typeof document === "undefined") return null;
  return ReactDOM.createPortal(
    <div data-testid={`card-expanded-${idx}`} className="fixed inset-0 z-[95] overflow-y-auto bg-[#0C0C0D]" onClick={onClose}>
      <div className="flex min-h-full flex-col px-6 pb-24 pt-6 sm:px-10" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <span className="font-ui text-[10px] uppercase tracking-[0.28em] text-white/40">{String(idx + 1).padStart(2, "0")}</span>
          <button onClick={onClose} data-testid={`card-expanded-close-${idx}`} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-ui text-[11px] text-white/60 hover:bg-white/[0.08]">Close</button>
        </div>
        {card.topic && <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.22em] text-white/45">{card.topic}</div>}
        <h2 className="mb-6 font-editorial text-[28px] leading-[1.16] text-white sm:text-[32px]">{card.headline}</h2>
        <p className="whitespace-pre-wrap font-editorial text-[16px] leading-[1.65] text-white/90 sm:text-[17px]">{card.text}</p>
        {(card.sources || []).filter((s) => s.url).map((s, i) => (
          <a key={i} href={s.url} target="_blank" rel="noreferrer" className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 font-ui text-[12px] text-white/60 hover:border-white/25 hover:text-white/90">
            <LinkIcon className="h-3.5 w-3.5" /><span>{s.title || "Read the source"}</span>
          </a>
        ))}
      </div>
    </div>,
    document.body
  );
}

/* ===== Pinch/scroll-to-zoom fullscreen image viewer ===== */
function ImageZoomOverlay({ src, open, onClose }) {
  if (!open || !src || typeof document === "undefined") return null;
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[97] bg-black" data-testid="image-zoom-overlay">
      <button onClick={onClose} data-testid="image-zoom-close" className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md"><X className="h-5 w-5" /></button>
      <TransformWrapper doubleClick={{ mode: "toggle", step: 2 }} pinch={{ step: 5 }} minScale={1} maxScale={6} centerOnInit>
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%" }}>
          <div className="flex h-[100dvh] w-screen items-center justify-center">
            <img src={src} alt="" className="max-h-full max-w-full object-contain" />
          </div>
        </TransformComponent>
      </TransformWrapper>
      <p className="pointer-events-none absolute inset-x-0 bottom-5 text-center font-ui text-[11px] text-white/50">Pinch or double-tap to zoom</p>
    </div>,
    document.body
  );
}

/* ===== Editor-written Back Story ===== */
function BackStorySheet({ card, idx, open, onClose, onAsk }) {
  return ReactDOM.createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[96] bg-black/60 backdrop-blur-sm" />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }}
            data-testid={`backstory-sheet-${idx}`}
            className="fixed inset-x-0 bottom-0 z-[96] max-h-[80vh] overflow-y-auto rounded-t-3xl border-t border-fuchsia-400/20 bg-[#0d0d0f] p-6 no-scrollbar">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-fuchsia-300"><BookOpen className="h-3 w-3" /> Back Story</p>
            <h3 className="mb-4 font-editorial text-2xl text-white">{card.headline}</h3>
            <p className="whitespace-pre-wrap font-editorial text-[15px] leading-[1.65] text-white/85">{card.backstory}</p>
            <button onClick={onAsk} data-testid={`backstory-ask-${idx}`} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-ui text-sm font-semibold text-[#0C0C0D]">
              <Sparkles className="h-4 w-4" /> Ask a question
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
