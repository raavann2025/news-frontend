/* =========================================================================
 * Placeholder scaffolding.
 * The product is designed around decks of 12 cards (Hot Now + every deeper
 * level) and ~4 "directions". Until editors have written real content, we
 * pad every deck to 12 and every directions list to 4 with clearly-labelled
 * placeholders ("Card 1…", "Direction 1…") so the full structure is visible.
 * Real, editor-written cards always take priority and render first.
 * ========================================================================= */

const rid = () => Math.random().toString(36).slice(2, 7);

export const isPlaceholderId = (id) => typeof id === "string" && id.startsWith("ph-");

export function placeholderCard(level, i) {
  return {
    id: `ph-${level}-${i}-${rid()}`,
    topic: "Placeholder",
    headline: `Card ${i + 1}`,
    text: "Placeholder card — an editor will write this insight in the Editor Studio. Double-tap to go one level deeper.",
    category: "Placeholder",
    sources: [],
    image_url: null,
    has_children: true,
    placeholder: true,
  };
}

/** Real cards first, then padded up to `target` (default 12). */
export function padCards(list, level = 0, target = 12) {
  const out = [...(list || [])];
  for (let i = out.length; i < target; i++) out.push(placeholderCard(level, i));
  return out;
}

/** A full deck of placeholders — used when a placeholder card is opened. */
export function placeholderDeck(level = 1, target = 12) {
  return Array.from({ length: target }, (_, i) => placeholderCard(level, i));
}

export function placeholderDirection(i) {
  return {
    id: `ph-dir-${i}-${rid()}`,
    question_label: `Direction ${i + 1}`,
    headline: `Direction ${i + 1}`,
    text: "Placeholder direction — an editor will write this rabbit hole.",
    placeholder: true,
  };
}

/** Real directions first, padded up to `target` (default 4). */
export function padDirections(list, target = 4) {
  const out = [...(list || [])];
  for (let i = out.length; i < target; i++) out.push(placeholderDirection(i));
  return out;
}
