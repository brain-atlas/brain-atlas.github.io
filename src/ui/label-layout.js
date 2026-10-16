const MARGIN = 8;
const DIRECTIONS = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]];
const GAPS = [8, 32, 80, 160];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
function overlap(a, b, padding = 0) {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width + padding) - Math.max(a.x, b.x - padding))
    * Math.max(0, Math.min(a.y + a.height, b.y + b.height + padding) - Math.max(a.y, b.y - padding));
}

// Screen-space only. Coordinates and owner/depth eligibility come from the one renderer.
export function layoutLabels({ labels, width, height, obstacles = [], previous = [] }) {
  if (![width, height].every(Number.isFinite) || width <= 2 * MARGIN || height <= 2 * MARGIN) return [];
  const prior = new Map(previous.map(label => [label.id, label.slot]));
  const placed = [];
  const eligible = labels.filter(l => l.visible && !l.occluded
    && [l.x, l.y, l.z, l.depth, l.width, l.height].every(Number.isFinite)
    && l.depth > 0 && Math.abs(l.z) <= 1 && l.x >= 0 && l.x <= width && l.y >= 0 && l.y <= height
    && l.width > 0 && l.height > 0 && l.width <= width - 2 * MARGIN && l.height <= height - 2 * MARGIN);
  eligible.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const label of eligible) {
    let best = null;
    let bestCost = Infinity;
    for (let slot = 0; slot < GAPS.length * DIRECTIONS.length; slot++) {
      const [dx, dy] = DIRECTIONS[slot % DIRECTIONS.length];
      const gap = GAPS[Math.floor(slot / DIRECTIONS.length)];
      const rawX = label.x + dx * (label.width / 2 + gap) - label.width / 2;
      const rawY = label.y + dy * (label.height / 2 + gap) - label.height / 2;
      const rect = { x: clamp(rawX, MARGIN, width - MARGIN - label.width), y: clamp(rawY, MARGIN, height - MARGIN - label.height), width: label.width, height: label.height };
      // Collision/edge overflow are hard constraints; no unreadable fallback stacking.
      if (placed.some(other => overlap(rect, other, 4) > 0)) continue;
      const end = [clamp(label.x, rect.x, rect.x + rect.width), clamp(label.y, rect.y, rect.y + rect.height)];
      const length = Math.hypot(end[0] - label.x, end[1] - label.y);
      const occupancy = obstacles.reduce((sum, obstacle) => sum + overlap(rect, obstacle), 0) / (rect.width * rect.height);
      const edgeShift = Math.hypot(rawX - rect.x, rawY - rect.y);
      const cost = 200 * occupancy + 0.03 * length + 0.1 * edgeShift - (prior.get(label.id) === slot ? 8 : 0);
      if (cost < bestCost) {
        bestCost = cost;
        best = { id: label.id, ...rect, slot, leader: { from: [label.x, label.y], to: end } };
      }
    }
    if (best) placed.push(best);
  }
  return placed;
}
