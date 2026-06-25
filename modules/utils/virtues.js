/**
 * Virtue and flaw point totals for character sheets.
 */

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

    const entry = {
      id: item.id,
      name: item.name,
      kind: item.system?.kind ?? "virtue",
      points: Number(item.system?.points) || 0,
      magnitude: item.system?.magnitude ?? "",
      category: item.system?.category ?? "",
      description: item.system?.description ?? "",
      source: item.system?.source ?? ""
    };

    if (entry.kind === "flaw") {
      flaws.push(entry);
      flawPoints += entry.points;
    } else {
      virtues.push(entry);
      virtuePoints += entry.points;
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
