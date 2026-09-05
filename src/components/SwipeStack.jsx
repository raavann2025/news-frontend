import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";

const ADVANCE_DIST_FRAC = 0.14;
const ADVANCE_VELOCITY = 380;
const SNAP_STIFFNESS = 320;
const SNAP_DAMPING = 34;

export default function SwipeStack({ total, activeIdx, onIndexChange, renderCard, disabled = false }) {
  const wrapperRef = useRef(null);
  const [vh, setVh] = useState(() => (typeof window !== "undefined" ? window.innerHeight : 800));
  const y = useMotionValue(-activeIdx * vh);
  const draggingRef = useRef(false);

  useEffect(() => {
    const measure = () => setVh(wrapperRef.current?.clientHeight || window.innerHeight);
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if (draggingRef.current) return;
    const controls = animate(y, -activeIdx * vh, { type: "spring", stiffness: SNAP_STIFFNESS, damping: SNAP_DAMPING, mass: 0.8 });
    return () => controls.stop();
  }, [activeIdx, vh, y]);

  const handleDragEnd = (_e, info) => {
    draggingRef.current = false;
    const advancePx = ADVANCE_DIST_FRAC * vh;
    let next = activeIdx;
    const wantsNext = info.offset.y < -advancePx || info.velocity.y < -ADVANCE_VELOCITY;
    const wantsPrev = info.offset.y > advancePx || info.velocity.y > ADVANCE_VELOCITY;
    if (wantsNext && activeIdx < total - 1) next = activeIdx + 1;
    else if (wantsPrev && activeIdx > 0) next = activeIdx - 1;
    if (next !== activeIdx) onIndexChange(next);
    else animate(y, -activeIdx * vh, { type: "spring", stiffness: SNAP_STIFFNESS, damping: SNAP_DAMPING, mass: 0.8 });
  };

  const mountedSlots = useMemo(() => {
    const s = new Set();
    for (let i = activeIdx - 1; i <= activeIdx + 1; i++) if (i >= 0 && i < total) s.add(i);
    return s;
  }, [activeIdx, total]);

  const topBound = 0;
  const bottomBound = -(total - 1) * vh;

  return (
    <div ref={wrapperRef} className="relative h-full w-full overflow-hidden" style={{ touchAction: "pan-y" }} data-testid="swipe-stack">
      <motion.div
        drag={disabled ? false : "y"}
        dragDirectionLock
        dragMomentum={false}
        dragElastic={0.18}
        dragConstraints={{ top: bottomBound, bottom: topBound }}
        onDragStart={() => { draggingRef.current = true; }}
        onDragEnd={handleDragEnd}
        style={{ y }}
        className="absolute inset-x-0 top-0"
      >
        {[...mountedSlots].map((idx) => (
          <div key={idx} data-idx={idx} style={{ position: "absolute", top: idx * vh, left: 0, right: 0, height: vh }}>
            {renderCard(idx)}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
