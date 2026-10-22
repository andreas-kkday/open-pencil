#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 input.fig output.fig" >&2
  exit 1
fi

input=$1
output=$2

cat <<'JS' | bun packages/cli/src/index.ts eval "$input" -o "$output" --stdin
const collection = figma
  .getLocalVariableCollections()
  .find((c) => c.name === "System Colors");

const darkModeId = collection?.modes.find((m) => m.name === "Dark")?.modeId;

if (collection && darkModeId) {
  const nodes = figma.root.findAll();
  const keep = new Set();

  for (const node of nodes) {
    const mode = node.resolvedVariableModes?.[collection.id];

    // Keep layers with no System Colors mode, or a mode other than Dark.
    if (!mode || mode !== darkModeId) {
      for (let current = node; current; current = current.parent) {
        keep.add(current.id);
      }
    }
  }

  const depth = (node) => {
    let value = 0;
    for (let parent = node.parent; parent; parent = parent.parent) value++;
    return value;
  };

  const candidates = nodes
    .filter((node) => node.type !== "PAGE" && node.type !== "DOCUMENT")
    .filter((node) => {
      const mode = node.resolvedVariableModes?.[collection.id];
      return mode === darkModeId && !keep.has(node.id);
    })
    // Figma does not allow removing children owned by an instance.
    .filter((node) => {
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (parent.type === "INSTANCE") return false;
      }
      return true;
    });

  const candidateIds = new Set(candidates.map((node) => node.id));

  // Remove only the highest removable node in each branch. This avoids
  // trying to remove stale descendants after their ancestor was removed.
  candidates
    .filter((node) => {
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (candidateIds.has(parent.id)) return false;
      }
      return true;
    })
    .forEach((node) => node.remove());
}
JS
