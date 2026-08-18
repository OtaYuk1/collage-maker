// キャンバスへの描画とPNG/JPEG書き出し。
//
// 補足: Canvasに描画してtoBlob()で書き出すと、元画像が持っていたEXIFメタデータ
// (撮影日時・位置情報など)は再エンコード時に失われる。そのため追加のライブラリ
// 無しでプライバシー要件(位置情報等の除去)を満たせる。

import { computeDrawRect } from "./cellEditor.js";

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1920;

/**
 * セルの相対矩形(0〜1)を、任意サイズのコンテナ内の実ピクセル矩形に変換する。
 * プレビュー(DOM)と書き出し(Canvas)の両方で同じ計算式を使うことで、
 * 見た目を完全に一致させる。gapは「幅1080基準のpx」で統一する。
 * @param {{x:number,y:number,w:number,h:number}} cell
 * @param {number} containerW
 * @param {number} containerH
 * @param {number} gapPxAt1080 幅1080換算での余白px
 */
export function computeCellRectPx(cell, containerW, containerH, gapPxAt1080) {
  const gapFrac = gapPxAt1080 / CANVAS_WIDTH;
  const insetPx = (gapFrac * containerW) / 2;
  return {
    x: cell.x * containerW + insetPx,
    y: cell.y * containerH + insetPx,
    w: Math.max(0, cell.w * containerW - insetPx * 2),
    h: Math.max(0, cell.h * containerH - insetPx * 2),
  };
}

function drawRoundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{url:string, naturalW:number, naturalH:number, crop:object}[]} images
 * @param {{x:number,y:number,w:number,h:number}[]} cells 0〜1の相対矩形(枚数分)
 * @param {{gapPx:number, gapColor:string, bgColor:string, rounded:boolean}} decoration
 * @param {HTMLImageElement[]} loadedImages images と同じ順のImage要素(描画用)
 */
export function drawCollage(canvas, images, cells, decoration, loadedImages) {
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");

  // 背景色を全面に敷く(gapPx > 0のときはセル間・外周の隙間から透けて見える)
  ctx.fillStyle = decoration.bgColor;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const cornerRadius = decoration.rounded ? 24 : 0;

  cells.forEach((cell, i) => {
    const image = images[i];
    const imgEl = loadedImages[i];
    if (!image || !imgEl) return;

    const { x: cx, y: cy, w: cw, h: ch } = computeCellRectPx(
      cell,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      decoration.gapPx
    );
    if (cw <= 0 || ch <= 0) return;

    ctx.save();
    drawRoundedRectPath(ctx, cx, cy, cw, ch, cornerRadius);
    ctx.clip();

    const { drawW, drawH, drawX, drawY } = computeDrawRect(
      cw,
      ch,
      image.naturalW,
      image.naturalH,
      image.crop
    );
    ctx.drawImage(imgEl, cx + drawX, cy + drawY, drawW, drawH);
    ctx.restore();
  });
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {"png"|"jpeg"} format
 * @param {number} quality 0〜1(JPEGのみ使用)
 * @returns {Promise<Blob>}
 */
export function canvasToBlob(canvas, format, quality) {
  const mime = format === "jpeg" ? "image/jpeg" : "image/png";
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("failed to export canvas"));
      },
      mime,
      format === "jpeg" ? quality : undefined
    );
  });
}
