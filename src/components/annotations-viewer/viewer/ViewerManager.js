import { renderPreview } from './ViewerPreview.js';
import { slidesServiceDM } from '../../../services/slidesServiceDM.js';

export class ViewerManager {
  constructor({ slideList, previewWrapper, editBtn, onSlideSelect, onSlideEdit, storageKey }) {
    //TODO: Need to remove this gudHub data below
    this.appId = '36609';
    this.fieldId = '863613';
    this.itemId = '4900015';
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

    this.slides = this.loadSlides();
    this.selectedSlide = null;
    this.renderSlides();

    if (this.slides.length > 0) {
      this.selectSlide(this.slides[0].id);
    } else {
      this.showEmptyPreview();
    }
  }

  async ensureSlidesLoaded() {
    if (!Array.isArray(this.slides)) {
      this.slides = await this.loadSlides();
    }
  }

  getNextBaseIndex() {
    const arr = Array.isArray(this.slides) ? this.slides : [];
    const indices = arr.map(s => s?.baseIndex).filter(n => Number.isInteger(n));
    return indices.length ? Math.max(...indices) + 1 : 1;
  }

  getNextCopyIndex(baseIndex) {
    const arr = Array.isArray(this.slides) ? this.slides : [];
    const copies = arr.filter(s => s.baseIndex === baseIndex && s.kind === 'copy');
    return copies.length ? Math.max(...copies.map(s => s.copyIndex || 0)) + 1 : 1;
  }

  genId() {
    const rand = Math.random().toString(36).slice(2, 6);
    return `slide-${Date.now()}-${rand}`;
  }

  _inferBaseIndexFromName(name = '') {
    const m = name.match(/slide[-\s](\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  saveSlides() {
    slidesServiceDM.createDataWithSlides(this.documentAddress, this.slides);
  }

  createSlide() {
    const baseIndex = this.getNextBaseIndex();
    return {
      id: this.genId(),
      name: `slide-${baseIndex}--empty`,
      kind: 'empty',
      baseIndex,
      copyIndex: 0,
      canvasJSON: null,
      previewDataUrl: null
    };
  }

  async addSlide() {
    await this.ensureSlidesLoaded();
    const newSlide = this.createSlide();
    this.slides.push(newSlide);
    this.saveSlides();
    this.renderSlides();
    if (this.slides.length === 1) {
      this.selectSlide(newSlide.id);
    }
    return newSlide;
  }

  deleteSlide(id) {
    this.slides = this.slides.filter(slide => slide.id !== id);
    this.saveSlides();
    this.renderSlides();
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
    let baseIndex = Number.isInteger(original.baseIndex)
      ? original.baseIndex
      : this._inferBaseIndexFromName(original.name) ?? this.getNextBaseIndex();

    const copyIndex = this.getNextCopyIndex(baseIndex);

    const copy = {
      ...original,
      id: this.genId(),
      name: `slide-${baseIndex}--copy-${copyIndex}`,
      kind: 'copy',
      baseIndex,
      copyIndex
    };

    this.slides.splice(originalIndex + 1, 0, copy);
    this.saveSlides();
    this.renderSlides();

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

    if (this.editBtn) {
      this.editBtn.style.display = 'none';
    }
  }

  updateActiveSlideUI(activeId) {
    const containers = this.slideList.querySelectorAll('.slide-preview-container, .sidebar__slide-preview-container');
    containers.forEach(el => {
      el.classList.toggle('active', el.dataset.id === activeId);
    });
  }

  async loadSlides() {
    return await slidesServiceDM.getDataWithSlides(this.documentAddress);
  }

  async renderSlides() {
    this.slides = await this.loadSlides();
    this.slides = (this.slides || []).map((s, idx) => {
      if (!s.kind) {
        const hasContent = !!(s.canvasJSON || s.previewDataUrl);
        const inferred = this._inferBaseIndexFromName(s.name) || (idx + 1);
        return {
          kind: hasContent ? 'normal' : 'empty',
          baseIndex: inferred,
          copyIndex: 0,
          ...s,
          name: hasContent ? `slide-${inferred}` : `slide-${inferred}--empty`
        };
      }
      return s;
    });

    this.slideList.innerHTML = '';
    this.slides.forEach(slide => {
      const slideEl = renderPreview(slide, {
        onDelete: () => this.deleteSlide(slide.id),
        onDuplicate: () => this.duplicateSlide(slide.id),
        onSelect: () => this.selectSlide(slide.id),
        onEdit: () => this.onSlideEdit?.(slide)
      });
      slideEl.dataset.id = slide.id;
      this.slideList.appendChild(slideEl);
    });

    if (this.selectedSlide) {
      this.updateActiveSlideUI(this.selectedSlide.id);
    }
  }
}
