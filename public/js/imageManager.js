// 画像の選択・削除・並び替えの状態管理。
import { createDefaultCrop } from "./cellEditor.js";

let nextId = 1;

export function createImageManager(maxImages, onChange) {
  /** @type {{id:number, file:File, url:string, naturalW:number, naturalH:number, crop:object}[]} */
  let images = [];

  function notify() {
    onChange([...images]);
  }

  /**
   * @param {File[]|FileList} files
   * @returns {{added:number, rejected:number}}
   */
  function addFiles(files) {
    const list = [...files].filter((f) => f.type.startsWith("image/"));
    const room = maxImages - images.length;
    const toAdd = list.slice(0, Math.max(0, room));
    const rejected = list.length - toAdd.length;

    for (const file of toAdd) {
      const url = URL.createObjectURL(file);
      const entry = {
        id: nextId++,
        file,
        url,
        naturalW: 0,
        naturalH: 0,
        crop: createDefaultCrop(),
      };
      images.push(entry);

      const img = new Image();
      img.onload = () => {
        entry.naturalW = img.naturalWidth;
        entry.naturalH = img.naturalHeight;
        notify();
      };
      img.src = url;
    }

    if (toAdd.length > 0) {
      notify();
    }

    return { added: toAdd.length, rejected };
  }

  function remove(id) {
    const entry = images.find((img) => img.id === id);
    if (entry) {
      URL.revokeObjectURL(entry.url);
    }
    images = images.filter((img) => img.id !== id);
    notify();
  }

  function reorder(fromIndex, toIndex) {
    if (
      fromIndex < 0 ||
      fromIndex >= images.length ||
      toIndex < 0 ||
      toIndex >= images.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    const [moved] = images.splice(fromIndex, 1);
    images.splice(toIndex, 0, moved);
    notify();
  }

  function swap(idA, idB) {
    if (idA === idB) return;
    const i = images.findIndex((img) => img.id === idA);
    const j = images.findIndex((img) => img.id === idB);
    if (i === -1 || j === -1) return;
    [images[i], images[j]] = [images[j], images[i]];
    notify();
  }

  function getAll() {
    return [...images];
  }

  return { addFiles, remove, reorder, swap, getAll };
}
