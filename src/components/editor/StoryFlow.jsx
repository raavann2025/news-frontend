import { Plus, Pencil, Trash2, Flame, Loader2, CheckCircle2, FileEdit } from "lucide-react";

/* =========================================================================
 * StoryFlow — a horizontal + vertical flowchart of the whole story.
 * Depth flows LEFT→RIGHT (vertical depth into a topic); siblings stack
 * TOP→BOTTOM (lateral/horizontal depth). Every rabbit hole is visible at a
 * glance. Nodes are mini insight cards; SVG bezier lines connect parents to
 * children. Click a node to edit it.
 *
 * Layout is computed with a pure DFS (returns numbers, not JSX) so there is
 * no self-referencing component — keeps the compiler happy.
 * ========================================================================= */
const W = 250, H = 104, GAP_X = 80, GAP_Y = 22;

function computeLayout(root) {
  const placed = [];
  const links = [];
  let leafCursor = 0;

  const dfs = (node, depth) => {
    const children = node.children || [];
    let row;
    if (!children.length) {
      row = leafCursor++;
    } else {
      const rows = children.map((c) => dfs(c, depth + 1));
      row = (rows[0] + rows[rows.length - 1]) / 2;
      children.forEach((c) => links.push([node.id, c.id]));
    }
    placed.push({ node, depth, row });
    return row;
  };
  dfs(root, 0);

  const pos = {};
  let maxDepth = 0, maxRow = 0;
  placed.forEach((p) => {
    pos[p.node.id] = { x: p.depth * (W + GAP_X), y: p.row * (H + GAP_Y), node: p.node, depth: p.depth };
    maxDepth = Math.max(maxDepth, p.depth);
    maxRow = Math.max(maxRow, p.row);
  });
  const width = (maxDepth + 1) * (W + GAP_X);
  const height = (maxRow + 1) * (H + GAP_Y) + H;
  return { pos, links, width, height };
}

export default function StoryFlow({ tree, onEdit, onAdd, onDelete, busyId }) {
  const { pos, links, width, height } = computeLayout(tree);

  return (
    <div className="relative w-full overflow-auto rounded-lg border border-[#E4E4E7] bg-[#FCFCFD] bg-[radial-gradient(circle,#E4E4E7_1px,transparent_1px)] [background-size:22px_22px]" data-testid="story-flow" style={{ maxHeight: "72vh" }}>
      <div className="relative" style={{ width: width + 40, height: height + 40, padding: 20 }}>
        {/* Connectors */}
        <svg className="pointer-events-none absolute left-0 top-0" width={width + 40} height={height + 40}>
          {links.map(([pid, cid]) => {
            const a = pos[pid], b = pos[cid];
            if (!a || !b) return null;
            const x1 = a.x + W + 20, y1 = a.y + H / 2 + 20;
            const x2 = b.x + 20, y2 = b.y + H / 2 + 20;
            const mx = (x1 + x2) / 2;
            return <path key={`${pid}-${cid}`} d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} fill="none" stroke="#C4B5FD" strokeWidth="2" />;
          })}
        </svg>

        {/* Nodes */}
        {Object.values(pos).map(({ x, y, node, depth }) => {
          const isRoot = depth === 0;
          const kids = node.children?.length || 0;
          return (
            <div key={node.id} data-testid={`flow-node-${node.id}`} className="group absolute" style={{ left: x + 20, top: y + 20, width: W, height: H }}>
              <div onClick={() => onEdit(node, isRoot)}
                className={`flex h-full cursor-pointer flex-col justify-between rounded-xl border bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${isRoot ? "border-[#0A0A0A]" : "border-[#E4E4E7] hover:border-fuchsia-400"}`}>
                <div className="flex items-center gap-1.5">
                  {isRoot && node.is_hot && <Flame className="h-3 w-3 text-[#E63946]" />}
                  <span className="rounded bg-[#F4F4F5] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-[#71717A]">{node.category || "Insight"}</span>
                  {node.status === "published"
                    ? <CheckCircle2 className="ml-auto h-3 w-3 text-emerald-600" />
                    : <FileEdit className="ml-auto h-3 w-3 text-[#A1A1AA]" />}
                </div>
                <p className="line-clamp-2 font-editorial text-[13px] font-semibold leading-snug text-[#0A0A0A]">{node.headline || "Untitled"}</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] text-[#A1A1AA]">{kids ? `${kids} deeper` : "leaf"}</span>
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button data-testid={`flow-edit-${node.id}`} onClick={(e) => { e.stopPropagation(); onEdit(node, isRoot); }} className="rounded p-1 text-[#3f3f46] hover:bg-[#F4F4F5]"><Pencil className="h-3 w-3" /></button>
                    <button data-testid={`flow-add-${node.id}`} onClick={(e) => { e.stopPropagation(); onAdd(node); }} className="rounded p-1 text-[#3f3f46] hover:bg-[#F4F4F5]">{busyId === node.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}</button>
                    <button data-testid={`flow-del-${node.id}`} onClick={(e) => { e.stopPropagation(); onDelete(node, isRoot); }} className="rounded p-1 text-[#E63946] hover:bg-[#F4F4F5]"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
