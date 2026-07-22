/**
 * Foundry folder layout for the Virtues & Flaws pack.
 * Used by compile-compendiums.mjs and runtime seed.
 */

/** @typedef {{ key: string, name: string, sort: number, kind?: string, pointsBucket?: number, children?: object[] }} VirtueFlawFolderDef */

/** @type {VirtueFlawFolderDef[]} */
export const VF_FOLDER_TREE = Object.freeze([
  {
    key: "virtues",
    name: "Virtues",
    sort: 0,
    children: [
      { key: "virtues-free", name: "Free (0)", sort: 0, kind: "virtue", pointsBucket: 0 },
      { key: "virtues-1", name: "1 Point", sort: 100_000, kind: "virtue", pointsBucket: 1 },
      { key: "virtues-3", name: "3 Points", sort: 200_000, kind: "virtue", pointsBucket: 3 }
    ]
  },
  {
    key: "flaws",
    name: "Flaws",
    sort: 100_000,
    children: [
      { key: "flaws-1", name: "1 Point", sort: 0, kind: "flaw", pointsBucket: 1 },
      { key: "flaws-3", name: "3 Points", sort: 100_000, kind: "flaw", pointsBucket: 3 }
    ]
  }
]);

/**
 * Map raw points to a folder cost bucket.
 * @param {number | string | null | undefined} points
 * @returns {0 | 1 | 3}
 */
export function pointsBucket(points) {
  const n = Number(points);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n <= 2) return 1;
  return 3;
}

/**
 * Resolve the leaf folder key for a virtue/flaw system blob.
 * @param {object} [system]
 * @returns {string}
 */
export function resolveVirtueFlawFolderKey(system = {}) {
  const kind = system.kind === "flaw" ? "flaw" : "virtue";
  const bucket = pointsBucket(system.points);

  if (kind === "flaw") {
    return bucket >= 3 ? "flaws-3" : "flaws-1";
  }

  if (bucket === 0) return "virtues-free";
  if (bucket >= 3) return "virtues-3";
  return "virtues-1";
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
    .trim()
    .replace(/\s+/g, "-")
    || "folder";
}
