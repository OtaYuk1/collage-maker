// 画像のトリミング(クロップ)状態の計算とドラッグ/ズーム操作。
//
// crop状態は解像度に依存しない正規化値で持つ:
//   scale: 1以上。1 = セルにちょうど収まる("object-fit: cover"相当)
//   tx, ty: -1〜1。画像がセルをはみ出す範囲内でのパン位置(0が中央)
//
// この正規化値を使うことで、プレビュー(CSSピクセル)と書き出し(1080x1920の
// キャンバスピクセル)のどちらに対しても同じ計算式で全く同じ見た目を再現できる。

const MIN_SCALE = 1;
const MAX_SCALE = 4;

export function createDefaultCrop() {
  return { scale: 1, tx: 0, ty: 0 };
}

/**
 * セル内での画像の描画矩形(セル左上を原点とするpx)を計算する。
 * @param {number} cellW セルの幅(px、任意の単位系でよい)
 * @param {number} cellH セルの高さ
 * @param {number} imgW 画像の自然幅
 * @param {number} imgH 画像の自然高さ
 * @param {{scale:number, tx:number, ty:number}} crop
 */
export function computeDrawRect(cellW, cellH, imgW, imgH, crop) {
  const baseScale = Math.max(cellW / imgW, cellH / imgH);
  const effScale = baseScale * crop.scale;
  const drawW = imgW * effScale;
  const drawH = imgH * effScale;
  const maxOffsetX = Math.max(0, (drawW - cellW) / 2);
  const maxOffsetY = Math.max(0, (drawH - cellH) / 2);
  const offsetX = crop.tx * maxOffsetX;
  const offsetY = crop.ty * maxOffsetY;
  const drawX = (cellW - drawW) / 2 + offsetX;
  const drawY = (cellH - drawH) / 2 + offsetY;
  return { drawW, drawH, drawX, drawY };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const LONG_PRESS_MS = 350;
const MOVE_THRESHOLD_PX = 8;

function findCellUnderPoint(el, x, y) {
  const target = document.elementFromPoint(x, y);
  const cellEl = target && target.closest ? target.closest(".cell") : null;
  return cellEl && cellEl !== el ? cellEl : null;
}

/**
 * セルDOM要素にドラッグ(パン)・ホイール/ピンチ(ズーム)・長押しドラッグ(セル入れ替え)を付与する。
 *
 * 通常のドラッグ(すぐに動かす)はクロップのパン操作になり、動かさずに一定時間
 * 押し続けてから動かすとセル入れ替えモードになる。この2つは同じpointerdownから
 * 分岐するため、移動量としきい値時間のどちらが先に発生するかで振り分ける。
 *
 * @param {HTMLElement} el セル要素(pointer eventsを受け取る)
 * @param {() => {crop: object, imgW: number, imgH: number}} getState
 * @param {(crop: object) => void} onCropChange
 * @param {(targetCellEl: HTMLElement|null) => void} [onSwapEnd] 長押しドラッグを離した時に呼ばれる
 */
export function attachCellInteraction(el, getState, onCropChange, onSwapEnd) {
  let dragging = false;
  let swapMode = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let longPressTimer = null;
  let currentSwapTarget = null;
  let pinchStartDist = null;
  let pinchStartScale = 1;
  const activePointers = new Map();

  function pinchDistance() {
    const pts = [...activePointers.values()];
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return Math.hypot(dx, dy);
  }

  function clearLongPress() {
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function enterSwapMode() {
    swapMode = true;
    dragging = false;
    el.classList.add("swap-source");
  }

  function exitSwapMode() {
    if (currentSwapTarget) {
      currentSwapTarget.classList.remove("swap-target");
      currentSwapTarget = null;
    }
    el.classList.remove("swap-source");
    el.style.transform = "";
    swapMode = false;
  }

  el.addEventListener("pointerdown", (e) => {
    el.setPointerCapture(e.pointerId);
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 1) {
      startX = e.clientX;
      startY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
      clearLongPress();
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        enterSwapMode();
      }, LONG_PRESS_MS);
    } else if (activePointers.size === 2) {
      clearLongPress();
      if (swapMode) exitSwapMode();
      dragging = false;
      pinchStartDist = pinchDistance();
      pinchStartScale = getState().crop.scale;
    }
  });

  el.addEventListener("pointermove", (e) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 2 && pinchStartDist) {
      const dist = pinchDistance();
      const state = getState();
      const nextScale = clamp((pinchStartScale * dist) / pinchStartDist, MIN_SCALE, MAX_SCALE);
      onCropChange({ ...state.crop, scale: nextScale });
      return;
    }

    if (swapMode) {
      el.style.transform = `translate(${e.clientX - startX}px, ${e.clientY - startY}px) scale(0.94)`;
      const target = findCellUnderPoint(el, e.clientX, e.clientY);
      if (target !== currentSwapTarget) {
        if (currentSwapTarget) currentSwapTarget.classList.remove("swap-target");
        currentSwapTarget = target;
        if (currentSwapTarget) currentSwapTarget.classList.add("swap-target");
      }
      return;
    }

    if (!dragging) {
      const distMoved = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (distMoved < MOVE_THRESHOLD_PX) return;
      clearLongPress();
      dragging = true;
      el.classList.add("dragging");
      lastX = e.clientX;
      lastY = e.clientY;
    }

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    const state = getState();
    const rect = el.getBoundingClientRect();
    const { drawW, drawH } = computeDrawRect(rect.width, rect.height, state.imgW, state.imgH, state.crop);
    const maxOffsetX = Math.max(0, (drawW - rect.width) / 2);
    const maxOffsetY = Math.max(0, (drawH - rect.height) / 2);

    const nextTx = maxOffsetX === 0 ? 0 : clamp(state.crop.tx + dx / maxOffsetX, -1, 1);
    const nextTy = maxOffsetY === 0 ? 0 : clamp(state.crop.ty + dy / maxOffsetY, -1, 1);
    onCropChange({ ...state.crop, tx: nextTx, ty: nextTy });
  });

  function endPointer(e) {
    activePointers.delete(e.pointerId);
    clearLongPress();

    if (swapMode && activePointers.size === 0) {
      const target = currentSwapTarget;
      exitSwapMode();
      if (onSwapEnd) onSwapEnd(target);
    }

    if (activePointers.size < 2) {
      pinchStartDist = null;
    }
    if (activePointers.size === 0) {
      dragging = false;
      el.classList.remove("dragging");
    }
  }

  el.addEventListener("pointerup", endPointer);
  el.addEventListener("pointercancel", endPointer);

  el.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const state = getState();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const nextScale = clamp(state.crop.scale + delta, MIN_SCALE, MAX_SCALE);
      onCropChange({ ...state.crop, scale: nextScale });
    },
    { passive: false }
  );
}
