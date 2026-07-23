/**
 * Foundry folder layout for the Virtues & Flaws pack (AG0201 signed points).
 */

/** @typedef {{ key: string, name: string, sort: number, kind?: string, pointsBucket?: number, children?: object[] }} VirtueFlawFolderDef */

/** @type {VirtueFlawFolderDef[]} */
export const VF_FOLDER_TREE = Object.freeze([
  {
    key: "virtues",
    name: "Virtues",
    sort: 0,
    children: [
      { key: "virtues-0", name: "+0 (Free)", sort: 0, kind: "virtue", pointsBucket: 0 },
      { key: "virtues-1", name: "+1", sort: 100_000, kind: "virtue", pointsBucket: 1 },
      { key: "virtues-2", name: "+2", sort: 200_000, kind: "virtue", pointsBucket: 2 },
      { key: "virtues-3", name: "+3", sort: 300_000, kind: "virtue", pointsBucket: 3 },
      { key: "virtues-4", name: "+4", sort: 400_000, kind: "virtue", pointsBucket: 4 },
      { key: "virtues-5", name: "+5", sort: 500_000, kind: "virtue", pointsBucket: 5 }
    ]
  },
  {
    key: "flaws",
    name: "Flaws",
    sort: 100_000,
    children: [
      { key: "flaws-1", name: "−1", sort: 0, kind: "flaw", pointsBucket: -1 },
      { key: "flaws-2", name: "−2", sort: 100_000, kind: "flaw", pointsBucket: -2 },
      { key: "flaws-3", name: "−3", sort: 200_000, kind: "flaw", pointsBucket: -3 },
      { key: "flaws-4", name: "−4", sort: 300_000, kind: "flaw", pointsBucket: -4 },
      { key: "flaws-5", name: "−5", sort: 400_000, kind: "flaw", pointsBucket: -5 }
    ]
  }
]);

/**
 * Snap raw signed points to a folder bucket (−5…+5).
 * @param {number | string | null | undefined} points
 * @returns {number}
 */
export function pointsBucket(points) {
  const n = Number(points);
  if (!Number.isFinite(n)) return 0;
  if (n === 0) return 0;
  const sign = n < 0 ? -1 : 1;
  const mag = Math.min(5, Math.max(1, Math.round(Math.abs(n))));
  return sign * mag;
}

/**
 * Resolve the leaf folder key for a virtue/flaw system blob.
 * @param {object} [system]
 * @returns {string}
 */
export function resolveVirtueFlawFolderKey(system = {}) {
  const kind = system.kind === "flaw" ? "flaw" : "virtue";
  let bucket = pointsBucket(system.points);

  // Flaws may be stored as positive magnitude historically — normalize.
  if (kind === "flaw" && bucket > 0) bucket = -bucket;
  if (kind === "virtue" && bucket < 0) bucket = Math.abs(bucket);

  if (kind === "virtue") {
    if (bucket === 0) return "virtues-0";
    return `virtues-${Math.abs(bucket)}`;
  }

  const mag = Math.abs(bucket) || 1;
  return `flaws-${mag}`;
}

/**
 * Flatten the tree into parent + leaf descriptors with parentKey.
 * @returns {Array<{ key: string, name: string, sort: number, parentKey: string | null, kind?: string, pointsBucket?: number }>}
 */
export function flattenVirtueFlawFolders() {
  /** @type {Array<{ key: string, name: string, sort: number, parentKey: string | null, kind?: string, pointsBucket?: number }>} */
  const list = [];

  for (const root of VF_FOLDER_TREE) {
    list.push({
      key: root.key,
      name: root.name,
      sort: root.sort,
      parentKey: null
    });

    for (const child of root.children ?? []) {
      list.push({
        key: child.key,
        name: child.name,
        sort: child.sort,
        parentKey: root.key,
        kind: child.kind,
        pointsBucket: child.pointsBucket
      });
    }
  }

  return list;
}

/**
 * Relative source path segments for a leaf folder key (for nested compile dirs).
 * @param {string} leafKey
 * @returns {string[]}
 */
export function folderPathSegments(leafKey) {
  const flat = flattenVirtueFlawFolders();
  const leaf = flat.find((f) => f.key === leafKey);
  if (!leaf) return [];

  if (!leaf.parentKey) return [slugFolderDir(leaf.name)];

  const parent = flat.find((f) => f.key === leaf.parentKey);
  return [slugFolderDir(parent?.name ?? leaf.parentKey), slugFolderDir(leaf.name)];
}

/**
 * @param {string} name
 * @returns {string}
 */
function slugFolderDir(name) {
  return String(name)
    .replace(/[()]/g, "")
    .replace(/[−–—]/g, "-")
    .replace(/\+/g, "plus-")
    .trim()
    .replace(/\s+/g, "-")
    || "folder";
}
