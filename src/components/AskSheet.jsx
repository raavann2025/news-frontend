import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { X, Send, Mic, Square, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { fetchCardQuestions, streamDeepDive, transcribeAudio } from "@/lib/api";

export default function AskSheet({ open, onClose, card, deviceId, autoRecord, onPickQuestion, onDeepDiveDone }) {
  const [questions, setQuestions] = useState([]);
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [answer, setAnswer] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const abortRef = useRef(null);

  useEffect(() => {
    if (open && card) {
      setText(""); setAnswer(""); setStreaming(false);
      if (card.placeholder) { setQuestions([]); }
      else {
        fetchCardQuestions(card.id).then((d) => setQuestions(d.questions || [])).catch(() => setQuestions([]));
        if (autoRecord) setTimeout(() => toggleRecord(), 300);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card]);

  const submit = async () => {
    if (!text.trim() || !card) return;
    if (card.placeholder) { toast.message("This is a placeholder — an editor will write it in the Studio."); return; }
    setStreaming(true);
    setAnswer("");
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      let finalCard = null;
      for await (const ev of streamDeepDive({ card_id: card.id, question: text.trim(), device_id: deviceId }, { signal: ac.signal })) {
        if (ev.phase === "delta") setAnswer((p) => p + ev.delta);
        else if (ev.phase === "done") finalCard = ev.card;
        else if (ev.phase === "error") throw new Error(ev.message);
      }
      if (finalCard) { toast.success("Deep dive ready"); onDeepDiveDone(finalCard); }
    } catch (e) {
      if (e?.name !== "AbortError") toast.error("The AI couldn't answer that");
    } finally {
      setStreaming(false);
    }
  };

  const toggleRecord = async () => {
    if (recording) {
      mediaRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg"];
      const mime = (window.MediaRecorder && candidates.find((t) => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } })) || "";
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || mime || "audio/webm" });
        try {
          toast.loading("Transcribing…", { id: "stt" });
          const { text: t } = await transcribeAudio(blob, mr.mimeType || mime);
          toast.dismiss("stt");
          if (t) setText(t);
        } catch { toast.error("Couldn't hear that", { id: "stt" }); }
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
    } catch { toast.error("Microphone unavailable"); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" data-testid="ask-overlay" />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#0d0d0d] p-5 no-scrollbar sm:p-7"
            data-testid="ask-sheet"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-editorial text-2xl text-white">Go deeper</h3>
              <button onClick={onClose} data-testid="ask-close" className="rounded-full p-2 text-white/60 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            {answer ? (
              <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[#E63946]">
                  <Sparkles className="h-3 w-3" /> AI deep dive
                </p>
                <p className="font-ui text-[15px] leading-relaxed text-white/90" data-testid="ai-answer-stream">{answer}</p>
                {streaming && <Loader2 className="mt-3 h-4 w-4 animate-spin text-white/50" />}
              </div>
            ) : (
              questions.length > 0 && (
                <div className="mb-6">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">Editor rabbit holes</p>
                  <div className="space-y-2">
                    {questions.map((q, i) => (
                      <button key={q.id} data-testid={`question-${i}`} onClick={() => onPickQuestion(q.id)}
                        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-white/30 hover:bg-white/[0.05]">
                        <span className="font-ui text-sm text-white/85">{q.label}</span>
                        <ArrowRight className="h-4 w-4 flex-shrink-0 text-white/40 transition-transform group-hover:translate-x-1" />
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}

            {!streaming && (
              <div className="sticky bottom-0">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">Ask your own question</p>
                <div className="flex items-end gap-2 rounded-2xl border border-white/12 bg-white/[0.03] p-2">
                  <textarea
                    data-testid="ask-input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                    rows={1}
                    placeholder="What do you want to understand?"
                    className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 font-ui text-sm text-white placeholder:text-white/35 focus:outline-none"
                  />
                  <button data-testid="ask-mic" onClick={toggleRecord}
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${recording ? "bg-[#E63946] text-white" : "text-white/70 hover:bg-white/10"}`}>
                    {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                  <button data-testid="ask-submit" onClick={submit} disabled={!text.trim()}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#050505] disabled:opacity-30">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 font-ui text-[11px] text-white/35">Your custom deep dives are private to this device until an editor promotes them.</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
