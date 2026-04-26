export interface TreemapItem {
  id: string;
  value: number;
}

export interface TreemapTile {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function worstAspect(values: number[], rowSum: number, shortSide: number): number {
  if (values.length === 0) return Infinity;
  const max = Math.max(...values);
  const min = Math.min(...values);
  // Classic squarify criterion: worst(r, w, s) = max(s²·max/r², r²/(s²·min))
  const s2 = shortSide * shortSide;
  const r2 = rowSum * rowSum;
  return Math.max((s2 * max) / r2, r2 / (s2 * min));
}

function layoutStrip(
  items: TreemapItem[],
  rowSum: number,
  rect: { x: number; y: number; w: number; h: number },
  isWide: boolean
): TreemapTile[] {
  const { x, y, w, h } = rect;
  const tiles: TreemapTile[] = [];
  let offset = 0;

  if (isWide) {
    // Strip is a column on the left side: fixed width, items stacked top→bottom
    const stripW = (rowSum / rowSum) * w; // computed by caller
    for (const item of items) {
      const tileH = (item.value / rowSum) * h;
      tiles.push({ id: item.id, x, y: y + offset, w: stripW, h: tileH });
      offset += tileH;
    }
  } else {
    // Strip is a band across the top: fixed height, items placed left→right
    const stripH = (rowSum / rowSum) * h; // computed by caller
    for (const item of items) {
      const tileW = (item.value / rowSum) * w;
      tiles.push({ id: item.id, x: x + offset, y, w: tileW, h: stripH });
      offset += tileW;
    }
  }
  return tiles;
}

export function squarify(
  items: TreemapItem[],
  container: { x: number; y: number; w: number; h: number }
): TreemapTile[] {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  return _squarify(sorted, container);
}

function _squarify(
  items: TreemapItem[],
  rect: { x: number; y: number; w: number; h: number }
): TreemapTile[] {
  const { x, y, w, h } = rect;

  if (items.length === 0) return [];
  if (items.length === 1) return [{ id: items[0].id, x, y, w, h }];
  if (w < 2 || h < 2) return items.map(item => ({ id: item.id, x, y, w, h }));

  const totalValue = items.reduce((s, i) => s + i.value, 0);
  const isWide = w >= h;
  const shorter = isWide ? h : w;
  const longer = isWide ? w : h;

  // Build row greedily
  let row: TreemapItem[] = [];
  let rowSum = 0;
  let prevWorst = Infinity;

  for (const item of items) {
    const newRowSum = rowSum + item.value;
    const newWorst = worstAspect(
      [...row.map(r => r.value), item.value],
      newRowSum,
      shorter
    );

    if (row.length > 0 && newWorst > prevWorst) break;

    row.push(item);
    rowSum = newRowSum;
    prevWorst = newWorst;
  }

  // Place the strip
  const stripFraction = rowSum / totalValue;
  const stripSize = stripFraction * longer; // size along the longer dimension
  const tiles: TreemapTile[] = [];
  let offset = 0;

  for (const item of row) {
    const itemSize = (item.value / rowSum) * shorter;
    if (isWide) {
      tiles.push({ id: item.id, x, y: y + offset, w: stripSize, h: itemSize });
    } else {
      tiles.push({ id: item.id, x: x + offset, y, w: itemSize, h: stripSize });
    }
    offset += itemSize;
  }

  // Recurse for remaining items in remaining rectangle
  const rest = items.slice(row.length);
  if (rest.length > 0) {
    const remainingRect = isWide
      ? { x: x + stripSize, y, w: w - stripSize, h }
      : { x, y: y + stripSize, w, h: h - stripSize };
    tiles.push(..._squarify(rest, remainingRect));
  }

  return tiles;
}
