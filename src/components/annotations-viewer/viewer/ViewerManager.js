import { renderPreview } from './ViewerPreview.js';
import { slidesServiceDM } from '../../../services/slidesServiceDM.js';

export class ViewerManager {
  constructor(appId, fieldId, itemId, { slideList, previewWrapper, editBtn, onSlideSelect, onSlideEdit, storageKey, loader = null }) {
    this.appId = appId;
    this.fieldId = fieldId;
    this.itemId = itemId;
    this.documentAddress = {
      app_id: this.appId,
      item_id: this.itemId,
      element_id: this.fieldId
    };

    this.slideList = slideList;
    this.previewWrapper = previewWrapper;
    this.editBtn = editBtn;
    this.onSlideSelect = onSlideSelect;
    this.onSlideEdit = onSlideEdit;
    this.storageKey = storageKey || 'slides';
    this.loader = loader;

    this.slides = [];
    this.selectedSlide = null;
  }

  async ensureSlidesLoaded() {
    if (!Array.isArray(this.slides) || this.slides.length === 0) {
      this.slides = await this.loadSlides();
    }
    if (!Array.isArray(this.slides)) this.slides = [];
    this.slides = this._dedupeById(this.slides);
  }

  genId() {
    const rand = Math.random().toString(36).slice(2, 6);
    return `slide-${Date.now()}-${rand}`;
  }

  parseNumber(name = '') {
    const m = String(name).match(/slide-(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  isCopyName(name = '') { return /--copy\b/i.test(name); }
  isEmptyName(name = '') { return /--empty\b/i.test(name); }

  getNextNumber() {
    const arr = Array.isArray(this.slides) ? this.slides : [];
    const nums = arr.map(s => this.parseNumber(s?.name)).filter(n => Number.isInteger(n));
    return nums.length ? Math.max(...nums) + 1 : 1;
  }

  normalizeSlide(s, idx = 0) {
    const allowed = ['id', 'name', 'bgUrl', 'previewDataUrl', 'type', 'fileId', 'canvasJSON'];

    let id = s?.id || this.genId();
    let name = s?.name || '';
    let type = s?.type;

    if (!type) {
      if (this.isCopyName(name)) type = 'copy';
      else if (this.isEmptyName(name)) type = 'empty';
      else type = 'normal';
    }

    let n = this.parseNumber(name);
    if (!Number.isInteger(n)) n = idx + 1;

    if (type === 'empty') name = `slide-${n}--empty`;
    else if (type === 'copy') name = `slide-${n}--copy`;
    else name = `slide-${n}`;

    const out = {
      id,
      name,
      bgUrl: s?.bgUrl || null,
      previewDataUrl: s?.previewDataUrl || null,
      type,
      fileId: s?.fileId ?? null,
      canvasJSON: s?.canvasJSON ?? null
    };

    const ordered = {};
    allowed.forEach(k => { ordered[k] = out[k] ?? null; });
    return ordered;
  }

  applyLocalUpdate({ id, dataUrl = null, json = null }) {
    const idx = this.slides.findIndex(s => s.id === id);
    if (idx === -1) return;

    const slide = this.slides[idx];
    if (dataUrl) {
      slide.bgUrl = dataUrl;
      slide.previewDataUrl = dataUrl;
      slide.__previewCache = dataUrl;
    }
    if (json) slide.canvasJSON = json;
  }

  async saveSlides() {
    this.loader?.show();
    try {
      await this.ensureSlidesLoaded();
      this.slides = this._dedupeById(this.slides);
      const minimal = this.slides.map((s, i) => this.normalizeSlide(s, i));
      await slidesServiceDM.createDataWithSlides(this.documentAddress, minimal);
    } finally {
      this.loader?.hide();
    }
  }

  createSlide() {
    const n = this.getNextNumber();
    return {
      id: this.genId(),
      name: `slide-${n}--empty`,
      bgUrl: null,
      previewDataUrl: null,
      type: 'empty',
      fileId: null,
      canvasJSON: null
    };
  }

  async addSlide() {
    this.loader?.show();
    try {
      await this.ensureSlidesLoaded();
      const newSlide = this.createSlide();
      this.slides.push(newSlide);
      await this.saveSlides();
      await this.renderSlides();
      return newSlide;
    } finally {
      this.loader?.hide();
    }
  }

  async deleteSlide(id) {
    this.loader?.show();
    try {
      await this.ensureSlidesLoaded();
      this.slides = this.slides.filter(slide => slide.id !== id);
      await this.saveSlides();
      await this.renderSlides();
      if (!this.slides.length) this.showEmptyPreview();
    } finally {
      this.loader?.hide();
    }
  }

  async duplicateSlide(id) {
    this.loader?.show();
    try {
      await this.ensureSlidesLoaded();
      const originalIndex = this.slides.findIndex(s => s.id === id);
      if (originalIndex === -1) return null;

      const original = this.slides[originalIndex];
      const n = this.parseNumber(original?.name) ?? this.getNextNumber();

      const copy = this.normalizeSlide({
        id: this.genId(),
        name: `slide-${n}--copy`,
        type: 'copy',
        bgUrl: original?.bgUrl || null,
        previewDataUrl: original?.previewDataUrl || null,
        fileId: original?.fileId ?? null,
        canvasJSON: original?.canvasJSON ?? null
      });

      this.slides.splice(originalIndex + 1, 0, copy);
      await this.saveSlides();
      await this.renderSlides();

      return copy;
    } finally {
      this.loader?.hide();
    }
  }

  _dedupeById(arr = []) {
    const seen = new Set();
    const out = [];
    for (const s of arr) {
      const id = s?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(s);
    }
    return out;
  }

  async _generatePreviewFromCanvasJSON(canvasJSON) {
    return new Promise((resolve, reject) => {
      try {
        const el = document.createElement('canvas');
        el.width = 1920;
        el.height = 1080;
        const canvas = new fabric.Canvas(el, { selection: false });
        canvas.loadFromJSON(canvasJSON, () => {
          canvas.getObjects().forEach(obj => {
            if (obj.type === 'path') obj.set({ fill: null });
          });

          canvas.getObjects().forEach(obj => {
            if (obj.type === 'textbox') {
              if (Object.prototype.hasOwnProperty.call(obj, 'customUrl')) return;

              const c = obj.aCoords;
              if (!c) return;
              const left = Math.min(c.tl.x, c.tr.x, c.bl.x, c.br.x);
              const top = Math.min(c.tl.y, c.tr.y, c.bl.y, c.br.y);
              const right = Math.max(c.tl.x, c.tr.x, c.bl.x, c.br.x);
              const bottom = Math.max(c.tl.y, c.tr.y, c.bl.y, c.br.y);
              const border = new fabric.Rect({
                left,
                top,
                width: right - left,
                height: bottom - top,
                stroke: '#FF0000',
                strokeWidth: 2,
                fill: 'rgba(0,0,0,0)',
                selectable: false,
                evented: false
              });
              canvas.add(border);
              canvas.bringToFront(border);
            }
          });

          canvas.renderAll();
          const dataUrl = canvas.toDataURL({
            format: 'png',
            quality: 1,
            width: 1920,
            height: 1080,
            multiplier: 1
          });
          canvas.dispose?.();
          resolve(dataUrl);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  async _ensurePreview(slide) {
    if (slide.__previewCache) return slide.__previewCache;

    if (slide.canvasJSON) {
      this.loader?.show();
      try {
        slide.__previewCache = await this._generatePreviewFromCanvasJSON(slide.canvasJSON);
      } finally {
        this.loader?.hide();
      }
      return slide.__previewCache;
    }

    if (slide.bgUrl) {
      slide.__previewCache = slide.bgUrl;
      return slide.__previewCache;
    }

    return null;
  }

  selectSlide(id) {
    const slide = this.slides.find(s => s.id === id);
    if (!slide) return null;
    this.selectedSlide = slide;
    this.updateActiveSlideUI(id);
    if (this.editBtn) {
      this.editBtn.style.display = 'block';
      this.editBtn.onclick = () => this.onSlideEdit?.(slide);
    }
    this.showPreview(slide);
    this.onSlideSelect?.(slide);
    return slide;
  }

  async showPreview(slide) {
    this.previewWrapper.innerHTML = '';
    const src = await this._ensurePreview(slide);
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      this.previewWrapper.appendChild(img);
    } else {
      this.showEmptyPreview();
    }
  }

  showEmptyPreview() {
    this.previewWrapper.innerHTML = `
      <div class="main__preview-wrapper--empty">
        This slide is empty. Click "Edit" to start drawing or add a background.
      </div>
    `;
    if (this.editBtn) this.editBtn.style.display = 'block';
  }

  updateActiveSlideUI(activeId) {
    const containers = this.slideList.querySelectorAll('.slide-preview-container, .sidebar__slide-preview-container');
    containers.forEach(el => {
      el.classList.toggle('active', el.dataset.id === activeId);
    });
  }

  async loadSlides() {
    const data = await slidesServiceDM.getDataWithSlides(this.documentAddress);
    return Array.isArray(data) ? data : [];
  }

  async renderSlides() {
    await this.ensureSlidesLoaded();

    this.slideList.innerHTML = '';
    for (const slide of this.slides) {
      slide.__previewCache = await this._ensurePreview(slide);
      const item = renderPreview(slide, {
        onDelete: () => this.deleteSlide(slide.id),
        onDuplicate: () => this.duplicateSlide(slide.id),
        onSelect: () => this.selectSlide(slide.id)
      });
      this.slideList.appendChild(item);
    }

    if (this.slides.length && (!this.selectedSlide || !this.slides.some(s => s.id === this.selectedSlide.id))) {
      this.selectSlide(this.slides[0].id);
    }
  }
}
