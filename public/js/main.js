import { MAX_IMAGES, getPatterns } from "./layouts.js";
import { createImageManager } from "./imageManager.js";
import { attachCellInteraction, computeDrawRect } from "./cellEditor.js";
import { drawCollage, canvasToBlob, computeCellRectPx, CANVAS_WIDTH } from "./exporter.js";

const $ = (id) => document.getElementById(id);

const maxCountLabel = $("max-count-label");
const fileInput = $("file-input");
const dropzone = $("dropzone");
const imageCountLabel = $("image-count");
const limitMessage = $("limit-message");
const thumbList = $("thumb-list");
const patternPickerEl = $("pattern-picker");
const canvasWrap = $("canvas-wrap");
const collageEl = $("collage");
const gapRange = $("gap-range");
const bgColorInput = $("bg-color");
const roundedToggle = $("rounded-toggle");
const formatSelect = $("format-select");
const qualityLabel = $("quality-label");
const qualityRange = $("quality-range");
const downloadBtn = $("download-btn");

maxCountLabel.textContent = String(MAX_IMAGES);

const decoration = {
  gapPx: Number(gapRange.value),
  bgColor: bgColorInput.value,
  rounded: roundedToggle.checked,
};
canvasWrap.style.background = decoration.bgColor;

let images = [];
let patternIndex = 0;
let lastCount = 0;
/** @type {Map<number, {cellEl: HTMLElement, imgEl: HTMLImageElement, cell: object}>} */
let cellRefs = new Map();

const manager = createImageManager(MAX_IMAGES, handleImagesChange);

function handleImagesChange(nextImages) {
  images = nextImages;
  renderThumbnails();
  updateCountLabel();

  if (images.length !== lastCount) {
    patternIndex = 0;
    lastCount = images.length;
  }
  renderCollage();
  updateDownloadState();
}

function updateCountLabel() {
  imageCountLabel.textContent = `${images.length} / ${MAX_IMAGES} 枚`;
}

function updateDownloadState() {
  downloadBtn.disabled = images.length === 0;
}

// --- 画像追加(ドロップゾーン / ファイル選択) ---

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener("change", () => {
  handleNewFiles(fileInput.files);
  fileInput.value = "";
});

["dragenter", "dragover"].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
});
["dragleave", "drop"].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  });
});
dropzone.addEventListener("drop", (e) => {
  if (e.dataTransfer && e.dataTransfer.files) {
    handleNewFiles(e.dataTransfer.files);
  }
});

function handleNewFiles(fileList) {
  const { rejected } = manager.addFiles(fileList);
  if (rejected > 0) {
    limitMessage.hidden = false;
    limitMessage.textContent = `最大${MAX_IMAGES}枚までです。${rejected}枚は追加されませんでした。`;
  } else {
    limitMessage.hidden = true;
  }
}

// --- サムネイル一覧(削除・並び替え) ---

function renderThumbnails() {
  thumbList.innerHTML = "";
  images.forEach((image, index) => {
    const li = document.createElement("li");
    li.className = "thumb-item";
    li.draggable = true;
    li.dataset.index = String(index);

    const img = document.createElement("img");
    img.src = image.url;
    img.alt = "";
    li.appendChild(img);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "thumb-remove";
    removeBtn.textContent = "×";
    removeBtn.setAttribute("aria-label", "削除");
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      manager.remove(image.id);
    });
    li.appendChild(removeBtn);

    li.addEventListener("dragstart", (e) => {
      li.classList.add("dragging");
      e.dataTransfer.setData("text/plain", String(index));
      e.dataTransfer.effectAllowed = "move";
    });
    li.addEventListener("dragend", () => li.classList.remove("dragging"));
    li.addEventListener("dragover", (e) => e.preventDefault());
    li.addEventListener("drop", (e) => {
      e.preventDefault();
      const fromIndex = Number(e.dataTransfer.getData("text/plain"));
      manager.reorder(fromIndex, index);
    });

    thumbList.appendChild(li);
  });
}

// --- コラージュプレビュー ---

function renderCollage() {
  collageEl.innerHTML = "";
  cellRefs = new Map();

  if (images.length === 0) {
    patternPickerEl.innerHTML = "";
    return;
  }

  const patterns = getPatterns(images.length);
  if (patternIndex >= patterns.length) patternIndex = 0;
  const cells = patterns[patternIndex];

  renderPatternPicker(patterns);

  images.forEach((image, i) => {
    const cell = cells[i];
    if (!cell) return;

    const cellEl = document.createElement("div");
    cellEl.className = "cell";
    cellEl.dataset.imageId = String(image.id);

    const imgEl = document.createElement("img");
    imgEl.src = image.url;
    imgEl.alt = "";
    imgEl.draggable = false;
    cellEl.appendChild(imgEl);

    collageEl.appendChild(cellEl);
    cellRefs.set(image.id, { cellEl, imgEl, cell });

    attachCellInteraction(
      cellEl,
      () => ({ crop: image.crop, imgW: image.naturalW, imgH: image.naturalH }),
      (nextCrop) => {
        // ドラッグ中に画像一覧全体を再構築すると操作が壊れるため、
        // crop状態は直接更新してレイアウトの再計算だけを行う。
        image.crop = nextCrop;
        layoutCells();
      },
      (targetCellEl) => {
        if (!targetCellEl) return;
        const targetId = Number(targetCellEl.dataset.imageId);
        if (!Number.isNaN(targetId)) {
          manager.swap(image.id, targetId);
        }
      }
    );
  });

  layoutCells();
}

function renderPatternPicker(patterns) {
  patternPickerEl.innerHTML = "";
  patterns.forEach((cells, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pattern-thumb" + (i === patternIndex ? " selected" : "");
    btn.setAttribute("role", "listitem");
    btn.setAttribute("aria-label", `パターン ${i + 1}`);
    btn.setAttribute("aria-pressed", String(i === patternIndex));

    cells.forEach((cell) => {
      const block = document.createElement("span");
      block.className = "pattern-thumb-cell";
      block.style.left = `${cell.x * 100}%`;
      block.style.top = `${cell.y * 100}%`;
      block.style.width = `${cell.w * 100}%`;
      block.style.height = `${cell.h * 100}%`;
      btn.appendChild(block);
    });

    btn.addEventListener("click", () => {
      if (patternIndex === i) return;
      patternIndex = i;
      renderCollage();
    });

    patternPickerEl.appendChild(btn);
  });
}

function layoutCells() {
  const rect = collageEl.getBoundingClientRect();
  const radiusPx = decoration.rounded ? (24 / CANVAS_WIDTH) * rect.width : 0;

  for (const image of images) {
    const ref = cellRefs.get(image.id);
    if (!ref) continue;
    const { cellEl, imgEl, cell } = ref;

    const { x, y, w, h } = computeCellRectPx(cell, rect.width, rect.height, decoration.gapPx);
    cellEl.style.left = `${x}px`;
    cellEl.style.top = `${y}px`;
    cellEl.style.width = `${w}px`;
    cellEl.style.height = `${h}px`;
    cellEl.style.borderRadius = `${radiusPx}px`;

    if (!image.naturalW || !image.naturalH) continue;
    const { drawW, drawH, drawX, drawY } = computeDrawRect(w, h, image.naturalW, image.naturalH, image.crop);
    imgEl.style.width = `${drawW}px`;
    imgEl.style.height = `${drawH}px`;
    imgEl.style.left = `${drawX}px`;
    imgEl.style.top = `${drawY}px`;
  }
}

window.addEventListener("resize", () => {
  if (images.length > 0) layoutCells();
});

// --- 装飾 ---

gapRange.addEventListener("input", () => {
  decoration.gapPx = Number(gapRange.value);
  layoutCells();
});
bgColorInput.addEventListener("input", () => {
  decoration.bgColor = bgColorInput.value;
  canvasWrap.style.background = decoration.bgColor;
});
roundedToggle.addEventListener("change", () => {
  decoration.rounded = roundedToggle.checked;
  layoutCells();
});

// --- 書き出し ---

formatSelect.addEventListener("change", () => {
  qualityLabel.hidden = formatSelect.value !== "jpeg";
});

downloadBtn.addEventListener("click", async () => {
  if (images.length === 0) return;
  downloadBtn.disabled = true;
  try {
    const patterns = getPatterns(images.length);
    const cells = patterns[patternIndex] || patterns[0];
    const loadedImages = await Promise.all(images.map(loadImageElement));

    const canvas = document.createElement("canvas");
    drawCollage(canvas, images, cells, decoration, loadedImages);

    const format = formatSelect.value;
    const quality = Number(qualityRange.value);
    const blob = await canvasToBlob(canvas, format, quality);

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collage.${format === "jpeg" ? "jpg" : "png"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } finally {
    downloadBtn.disabled = images.length === 0;
  }
});

function loadImageElement(image) {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = image.url;
  });
}

updateCountLabel();
