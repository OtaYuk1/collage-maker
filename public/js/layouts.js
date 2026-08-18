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
// 機械的に生成している(ROW_PATTERNSは下記ロジックの出力を書き出したもの):
//   1. セルの実ピクセルアスペクト比 = CANVAS_AR(9/16) × 枚数 / 列数^2
//   2. この値が [MIN_CELL_AR, MAX_CELL_AR] を外れる行(列数)は「極端」として使わない
//   3. 横長側の上限は縦長側の下限より緩くし、横長を優先する
//   4. 有効な列数だけを使って枚数を行に分割し、行の並び順を変えて見た目のバリエーションを出す
// (生成スクリプトはリポジトリには含めず、出力結果のみをここに定数として保持している)

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

// 枚数ごとのパターン定義(rows構成のみ列挙。矩形計算はbuildLayoutで行う)
// MIN_CELL_AR=0.55 / MAX_CELL_AR=4.0 の範囲内で、有効な列数のみを使って
// 枚数を行分割し、行の並び順を変えたバリエーションを列挙した結果。
const ROW_PATTERNS = {
  1: [[{ cols: 1 }]],
  2: [[{ cols: 1 }, { cols: 1 }]],
  3: [[{ cols: 1 }, { cols: 1 }, { cols: 1 }]],
  4: [
    [{ cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }],
    [{ cols: 2 }, { cols: 1 }, { cols: 1 }],
    [{ cols: 1 }, { cols: 1 }, { cols: 2 }],
    [{ cols: 2 }, { cols: 2 }],
  ],
  5: [
    [{ cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }],
    [{ cols: 2 }, { cols: 1 }, { cols: 1 }, { cols: 1 }],
    [{ cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 2 }],
    [{ cols: 2 }, { cols: 2 }, { cols: 1 }],
    [{ cols: 1 }, { cols: 2 }, { cols: 2 }],
  ],
  6: [
    [{ cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }],
    [{ cols: 2 }, { cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }],
    [{ cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 2 }],
    [{ cols: 2 }, { cols: 2 }, { cols: 1 }, { cols: 1 }],
    [{ cols: 1 }, { cols: 1 }, { cols: 2 }, { cols: 2 }],
    [{ cols: 2 }, { cols: 2 }, { cols: 2 }],
  ],
  7: [
    [{ cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }],
    [{ cols: 2 }, { cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }],
    [{ cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 2 }],
    [{ cols: 2 }, { cols: 2 }, { cols: 1 }, { cols: 1 }, { cols: 1 }],
    [{ cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 2 }, { cols: 2 }],
    [{ cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 1 }],
  ],
  8: [[{ cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }]],
  9: [
    [{ cols: 3 }, { cols: 2 }, { cols: 2 }, { cols: 2 }],
    [{ cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 3 }],
    [{ cols: 3 }, { cols: 3 }, { cols: 3 }],
  ],
  10: [
    [{ cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }],
    [{ cols: 3 }, { cols: 3 }, { cols: 2 }, { cols: 2 }],
    [{ cols: 2 }, { cols: 2 }, { cols: 3 }, { cols: 3 }],
  ],
  11: [
    [{ cols: 3 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }],
    [{ cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 3 }],
    [{ cols: 3 }, { cols: 3 }, { cols: 3 }, { cols: 2 }],
    [{ cols: 2 }, { cols: 3 }, { cols: 3 }, { cols: 3 }],
  ],
  12: [
    [{ cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }],
    [{ cols: 3 }, { cols: 3 }, { cols: 2 }, { cols: 2 }, { cols: 2 }],
    [{ cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 3 }, { cols: 3 }],
    [{ cols: 3 }, { cols: 3 }, { cols: 3 }, { cols: 3 }],
  ],
  13: [
    [{ cols: 3 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }],
    [{ cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 3 }],
    [{ cols: 3 }, { cols: 3 }, { cols: 3 }, { cols: 2 }, { cols: 2 }],
    [{ cols: 2 }, { cols: 2 }, { cols: 3 }, { cols: 3 }, { cols: 3 }],
  ],
  14: [
    [{ cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }],
    [{ cols: 3 }, { cols: 3 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }],
    [{ cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 3 }, { cols: 3 }],
    [{ cols: 3 }, { cols: 3 }, { cols: 3 }, { cols: 3 }, { cols: 2 }],
    [{ cols: 2 }, { cols: 3 }, { cols: 3 }, { cols: 3 }, { cols: 3 }],
  ],
  15: [
    [{ cols: 3 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }],
    [{ cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 3 }],
    [{ cols: 3 }, { cols: 3 }, { cols: 3 }, { cols: 2 }, { cols: 2 }, { cols: 2 }],
    [{ cols: 2 }, { cols: 2 }, { cols: 2 }, { cols: 3 }, { cols: 3 }, { cols: 3 }],
    [{ cols: 3 }, { cols: 3 }, { cols: 3 }, { cols: 3 }, { cols: 3 }],
  ],
};

export const MAX_IMAGES = 15;

/**
 * 指定枚数の全パターン(矩形リストの配列)を返す
 * @param {number} count
 * @returns {{x:number,y:number,w:number,h:number}[][]}
 */
export function getPatterns(count) {
  const rowPatterns = ROW_PATTERNS[count];
  if (!rowPatterns) {
    throw new Error(`no layout patterns defined for count=${count}`);
  }
  return rowPatterns.map((rows) => buildLayout(count, rows));
}
