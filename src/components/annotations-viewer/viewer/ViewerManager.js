import { renderPreview } from './ViewerPreview.js';
import { slidesServiceDM } from '../../../services/slidesServiceDM.js';

export class ViewerManager {
  constructor(appId, fieldId, itemId, { slideList, previewWrapper, editBtn, onSlideSelect, onSlideEdit, storageKey }) {
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

    this.slides = [];
    this.selectedSlide = null;

    this.renderSlides();
  }

  async ensureSlidesLoaded() {
    if (!Array.isArray(this.slides) || this.slides.length === 0) {
      this.slides = await this.loadSlides();
    }
    if (!Array.isArray(this.slides)) this.slides = [];
  }

  genId() {
    const rand = Math.random().toString(36).slice(2, 6);
    return `slide-${Date.now()}-${rand}`;
  }

  parseNumber(name = '') {
    const m = String(name).match(/slide-(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  isCopyName(name = '') {
    return /--copy\b/i.test(name);
  }

  isEmptyName(name = '') {
    return /--empty\b/i.test(name);
  }

  getNextNumber() {
    const arr = Array.isArray(this.slides) ? this.slides : [];
    const nums = arr
      .map(s => this.parseNumber(s?.name))
      .filter(n => Number.isInteger(n));
    return nums.length ? Math.max(...nums) + 1 : 1;
  }

  normalizeSlide(s, idx = 0) {
    const allowed = ['id', 'name', 'bgUrl', 'previewDataUrl', 'type', 'fileId'];

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
      fileId: s?.fileId ?? null
    };

    const ordered = {};
    allowed.forEach(k => { ordered[k] = out[k] ?? null; });
    return ordered;
  }

  async saveSlides() {
    await this.ensureSlidesLoaded();
    const minimal = this.slides.map((s, i) => this.normalizeSlide(s, i));
    await slidesServiceDM.createDataWithSlides(this.documentAddress, minimal);
  }

  createSlide() {
    const n = this.getNextNumber();
    return {
      id: this.genId(),
      name: `slide-${n}--empty`,
      bgUrl: null,
      previewDataUrl: null,
      type: 'empty',
      fileId: null
    };
  }

  async addSlide() {
    await this.ensureSlidesLoaded();
    const newSlide = this.createSlide();
    this.slides.push(newSlide);
    await this.saveSlides();
    await this.renderSlides();
    if (this.slides.length === 1) {
      this.selectSlide(newSlide.id);
    }
    return newSlide;
  }

  async deleteSlide(id) {
    await this.ensureSlidesLoaded();
    this.slides = this.slides.filter(slide => slide.id !== id);
    await this.saveSlides();
    await this.renderSlides();
    if (this.selectedSlide?.id === id) {
      if (this.slides.length > 0) {
        this.selectSlide(this.slides[0].id);
      } else {
        this.showEmptyPreview();
      }
    }
  }

  async duplicateSlide(id) {
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
      fileId: original?.fileId ?? null
    });

    this.slides.splice(originalIndex + 1, 0, copy);
    await this.saveSlides();
    await this.renderSlides();

    return copy;
  }

  selectSlide(id) {
    const slide = this.slides.find(s => s.id === id);
    if (!slide) return null;
    this.selectedSlide = slide;
    this.updateActiveSlideUI(id);
    this.showPreview(slide);

    if (this.editBtn) {
      this.editBtn.style.display = 'block';
      this.editBtn.onclick = () => this.onSlideEdit?.(slide);
    }

    this.onSlideSelect?.(slide);
    return slide;
  }

  showPreview(slide) {
    this.previewWrapper.innerHTML = '';
    if (slide.previewDataUrl) {
      const img = document.createElement('img');
      img.src = slide.previewDataUrl.startsWith('data:')
        ? slide.previewDataUrl
        : slide.previewDataUrl + '?t=' + Date.now();
      this.previewWrapper.appendChild(img);
    } else {
      this.showEmptyPreview();
    }
  }

  showEmptyPreview() {
    this.previewWrapper.innerHTML = `
      <div class="main__preview-wrapper--empty">
        Please select or add a slide
      </div>
    `;
    if (this.editBtn) this.editBtn.style.display = 'none';
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
    const loaded = await this.loadSlides();
    this.slides = (loaded || []).map((s, idx) => this.normalizeSlide(s, idx));

    this.slideList.innerHTML = '';
    this.slides.forEach(slide => {
      const slideEl = renderPreview(slide, {
        onDelete: () => this.deleteSlide(slide.id),
        onDuplicate: () => this.duplicateSlide(slide.id),
        onSelect: () => this.selectSlide(slide.id)
      });
      slideEl.dataset.id = slide.id;
      this.slideList.appendChild(slideEl);
    });

    if (!this.selectedSlide && this.slides.length > 0) {
      this.selectSlide(this.slides[0].id);
    } else if (this.slides.length === 0) {
      this.showEmptyPreview();
    }
  }
}
