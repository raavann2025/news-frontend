import { useNavigate } from "react-router-dom";
import { PenLine } from "lucide-react";
import HotFeed from "@/components/HotFeed";

/* =========================================================================
 * Landing (consumer) — mobile-first. The Hot Now deck IS the hero: the
 * first thing a reader sees, straight from the top. Double-tap a card to
 * dive into its rabbit hole.
 *
 * A discreet "Editor" entry (bottom-left) links to the internal Editor
 * Studio at /editor/login. It's low-profile so everyday readers ignore it,
 * but always available to the newsroom team.
 * ========================================================================= */
export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100dvh] w-full bg-[#0C0C0D] text-[#F8F8F8]">
      <section className="mx-auto w-full max-w-xl px-0 pt-4 sm:pt-6">
        <HotFeed />
      </section>

      <button
        data-testid="editor-access-btn"
        onClick={() => navigate("/editor/login")}
        aria-label="Editor Studio"
        title="Editor Studio (internal)"
        className="fixed bottom-3 left-3 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#121214]/80 text-white/40 backdrop-blur-md transition-colors hover:text-white/90 no-tap-zoom"
      >
        <PenLine className="h-4 w-4" />
      </button>
    </div>
  );
}
