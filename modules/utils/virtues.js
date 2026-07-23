/**
 * Virtue and flaw point totals for character sheets (AG0201 signed points).
 */

/**
 * @param {number} points
 * @param {"virtue"|"flaw"} kind
 * @returns {number} signed points (virtues ≥ 0, flaws ≤ 0)
 */
export function signedVirtueFlawPoints(points, kind) {
  const n = Number(points) || 0;
  if (kind === "flaw") return n <= 0 ? n : -Math.abs(n);
  return n >= 0 ? n : Math.abs(n);
}

/**
 * @param {number} points
 * @returns {string}
 */
export function formatVirtueFlawPoints(points) {
  const n = Number(points) || 0;
  if (n > 0) return `+${n}`;
  return String(n);
}

/**
 * @param {Iterable<Item>} items
 * @returns {{ virtues: object[], flaws: object[], virtuePoints: number, flawPoints: number, balance: number }}
 */
export function prepareVirtueFlawList(items) {
  const virtues = [];
  const flaws = [];
  let virtuePoints = 0;
  let flawPoints = 0;

  for (const item of items) {
    if (item.type !== "virtueFlaw") continue;

    const kind = item.system?.kind === "flaw" ? "flaw" : "virtue";
    const points = signedVirtueFlawPoints(item.system?.points, kind);

    const entry = {
      id: item.id,
      name: item.name,
      kind,
      points,
      pointsLabel: formatVirtueFlawPoints(points),
      magnitude: item.system?.magnitude ?? "",
      category: item.system?.category ?? "",
      description: item.system?.description ?? "",
      source: item.system?.source ?? ""
    };

    if (kind === "flaw") {
      flaws.push(entry);
      flawPoints += Math.abs(points);
    } else {
      virtues.push(entry);
      virtuePoints += Math.abs(points);
    }
  }

  return {
    virtues,
    flaws,
    virtuePoints,
    flawPoints,
    balance: virtuePoints - flawPoints
  };
}
