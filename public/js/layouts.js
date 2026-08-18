// レイアウトパターン定義
//
// 各パターンは「行(row)の配列」で表現する。
// 各行は { cols: 行内の列数 } を持ち、行の高さは (1/枚数) / (1/cols) = cols/枚数 として
// 自動計算することで、行の形(縦長/横長)は変えつつ各セルの面積をほぼ均等に保つ。
//
// buildLayout() が rows定義から実際のセル矩形リスト { x, y, w, h }(0〜1の相対値)を生成する。
// フチ(隙間)は無し。セルは常にキャンバスいっぱいに敷き詰められる。
//
// --- セルのアスペクト比について ---
// 撮影される写真が3:2(横長)の場合、セルが縦長すぎると object-fit:cover の
// トリミングで写真の左右が大きく失われてしまう。一方、セルが横長な場合は
// 上下が失われるだけで済むため、被害が小さい。そのため以下の方針でパターンを
// 機械的に生成している(getRowPatterns()が下記ロジックをそのまま実行する):
//   1. セルの実ピクセルアスペクト比 = CANVAS_AR(9/16) × 枚数 / 列数^2
//   2. この値が [MIN_CELL_AR, MAX_CELL_AR] を外れる行(列数)は「極端」として使わない
//   3. 横長側の上限は縦長側の下限より緩くし、横長を優先する
//   4. 有効な列数だけを使って枚数を行に分割し(部分和の多重集合を列挙)、
//      各多重集合について行の並び順の全順列(重複除去)をバリエーションとして出す

/**
 * rows定義から矩形リストを生成する
 * @param {number} count 画像枚数
 * @param {{cols: number}[]} rows 行定義(上から順)
 * @returns {{x:number, y:number, w:number, h:number}[]}
 */
function buildLayout(count, rows) {
  const totalCols = rows.reduce((sum, row) => sum + row.cols, 0);
  if (totalCols !== count) {
    throw new Error(`layout mismatch: rows sum to ${totalCols} but count is ${count}`);
  }

  const cells = [];
  let y = 0;
  for (const row of rows) {
    const h = row.cols / count;
    const w = 1 / row.cols;
    for (let i = 0; i < row.cols; i++) {
      cells.push({ x: i * w, y, w, h });
    }
    y += h;
  }
  return cells;
}

const CANVAS_AR = 9 / 16;
const MIN_CELL_AR = 0.55;
const MAX_CELL_AR = 4.0;

// 指定枚数に対して「極端」でない(セルのアスペクト比が範囲内に収まる)列数の一覧
function validCols(count) {
  const cols = [];
  for (let c = 1; c <= count; c++) {
    const ar = (CANVAS_AR * count) / (c * c);
    if (ar >= MIN_CELL_AR && ar <= MAX_CELL_AR) cols.push(c);
  }
  return cols;
}

// 有効な列数だけを使って枚数を行に分割する組み合わせ(多重集合)を列挙する
function findPartitions(count, cols) {
  const results = [];
  function rec(remaining, minIdx, current) {
    if (remaining === 0) {
      results.push(current.slice());
      return;
    }
    for (let i = minIdx; i < cols.length; i++) {
      const c = cols[i];
      if (c <= remaining) {
        current.push(c);
        rec(remaining - c, i, current);
        current.pop();
      }
    }
  }
  rec(count, 0, []);
  return results;
}

// 多重集合の重複を除いた全順列(行の並び順のバリエーション)を列挙する
function permutations(values) {
  const results = [];
  const used = new Array(values.length).fill(false);
  const sorted = values.slice().sort((a, b) => a - b);
  function rec(current) {
    if (current.length === sorted.length) {
      results.push(current.slice());
      return;
    }
    for (let i = 0; i < sorted.length; i++) {
      if (used[i]) continue;
      if (i > 0 && sorted[i] === sorted[i - 1] && !used[i - 1]) continue;
      used[i] = true;
      current.push(sorted[i]);
      rec(current);
      current.pop();
      used[i] = false;
    }
  }
  rec([]);
  return results;
}

const rowPatternsCache = new Map();

// 指定枚数の全rows定義(バリエーション順)を返す。結果は枚数ごとにキャッシュする
function getRowPatterns(count) {
  if (rowPatternsCache.has(count)) return rowPatternsCache.get(count);

  const cols = validCols(count);
  const partitions = findPartitions(count, cols).sort((a, b) => {
    if (b[b.length - 1] !== a[a.length - 1]) return b[b.length - 1] - a[a.length - 1];
    return a.length - b.length;
  });

  const rowPatterns = [];
  for (const partition of partitions) {
    const perms = permutations(partition).sort((a, b) => {
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return b[i] - a[i];
      }
      return 0;
    });
    for (const perm of perms) {
      rowPatterns.push(perm.map((c) => ({ cols: c })));
    }
  }

  rowPatternsCache.set(count, rowPatterns);
  return rowPatterns;
}

export const MAX_IMAGES = 15;

/**
 * 指定枚数の全パターン(矩形リストの配列)を返す
 * @param {number} count
 * @returns {{x:number,y:number,w:number,h:number}[][]}
 */
export function getPatterns(count) {
  const rowPatterns = getRowPatterns(count);
  if (rowPatterns.length === 0) {
    throw new Error(`no layout patterns defined for count=${count}`);
  }
  return rowPatterns.map((rows) => buildLayout(count, rows));
}
