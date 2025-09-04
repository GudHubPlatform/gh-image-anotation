// viewer/ViewerManager.js
import { renderPreview } from './ViewerPreview.js';
import {
  generateCanvasPreviewFromUrl,
  generateCanvasPreviewFromJSON
} from '../../../lib/generateCanvasPreviewFromUrl.js';

function isCopySlide(slide) {
  return !!(slide?.isCopy || slide?.copyOf);
}
function isEmptySlide(slide) {
  if (!slide) return false;
  if (slide.fileId || slide.bgUrl) return false;
  const json = slide.canvasJSON;
  if (!json) return true;
  try {
    const objs = Array.isArray(json.objects) ? json.objects : [];
    return objs.length === 0;
  } catch { return true; }
}

export class ViewerManager {
  constructor({
    slideList,
    previewWrapper,
    editBtn,
    onSlideSelect,
    onSlideEdit,
    storageKey,
    slidesService,
    initialSlidesMeta
  }) {
    this.slideList = slideList;
    this.previewWrapper = previewWrapper;
    this.editBtn = editBtn;
    this.onSlideSelect = onSlideSelect;
    this.onSlideEdit = onSlideEdit;
    this.storageKey = storageKey || 'slides';
    this.svc = slidesService;

    this.slides = Array.isArray(initialSlidesMeta) ? initialSlidesMeta : [];
    this.selectedSlide = null;

    this.renderSlides();
    if (this.slides.length > 0) this.selectSlide(this.slides[0].id);
    else this.showEmptyPreview();
  }

  async _persistIndex() { await this.svc.saveIndex(this.slides); }

  addSlide() {
    const newSlide = this.createSlide();
    this.slides.push(newSlide);
    this._persistIndex();
    this.renderSlides();
    if (this.slides.length === 1) this.selectSlide(newSlide.id);
    return newSlide;
  }

  /**
   * Видаляти дозволено лише КОПІЇ або ПУСТІ слайди.
   */
  async deleteSlide(id) {
    const slide = this.slides.find(s => s.id === id);
    const allowDelete = isCopySlide(slide) || isEmptySlide(slide);
    if (!allowDelete) {
      // легка підказка користувачу: підсвітити
      const el = this.slideList.querySelector(`[data-id="${id}"]`);
      if (el) {
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 400);
      }
      return;
    }

    this.slides = this.slides.filter(s => s.id !== id);
    await this._persistIndex();
    try { await this.svc.hardDelete(id); } catch (_) {}

    this.renderSlides();
    if (this.selectedSlide?.id === id) {
      if (this.slides.length > 0) this.selectSlide(this.slides[0].id);
      else this.showEmptyPreview();
    }
  }

  duplicateSlide(id) {
    const i = this.slides.findIndex(s => s.id === id);
    if (i === -1) return null;

    const original = this.slides[i];
    const copies = this.slides.filter(s => s.copyOf === original.id);
    const nextNum = copies.length + 1;
    const baseName = (original.name || 'Slide').replace(/\s*- copy\s*\d+$/i, '');

    const copy = {
      ...original,
      id: 'slide-' + Date.now(),
      name: `${baseName} - copy ${nextNum}`,
      isCopy: true,
      copyOf: original.id,
      copyNumber: nextNum
    };

    this.slides.splice(i + 1, 0, copy);
    this._persistIndex();

    this.svc.getSlide(id).then(full => {
      const copyFull = { ...copy, canvasJSON: full?.canvasJSON ?? null };
      return this.svc.upsertSlide(copyFull);
    }).catch(() => {});

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

  /** Отримати dataURL для превʼю на основі даних документа */
  async getPreviewDataUrl(slide) {
    try {
      if (slide?.canvasJSON) {
        const { previewDataUrl } = await generateCanvasPreviewFromJSON(
          slide.canvasJSON,
          { width: 1920, height: 1080 }
        );
        return previewDataUrl;
      }
      if (slide?.bgUrl) {
        const { previewDataUrl } = await generateCanvasPreviewFromUrl(
          slide.bgUrl,
          { width: 1920, height: 1080, marginRatio: 0.10, background: null }
        );
        return previewDataUrl;
      }
    } catch (e) {
      console.error('Thumb render failed:', e);
    }
    return null;
  }

  async showPreview(slide) {
    this.previewWrapper.innerHTML = '';
    try {
      const dataUrl = await this.getPreviewDataUrl(slide);
      if (dataUrl) {
        const img = document.createElement('img');
        img.src = dataUrl;
        this.previewWrapper.appendChild(img);
      } else {
        this.showEmptyPreview();
      }
    } catch (e) {
      console.error('Preview render failed:', e);
      this.showEmptyPreview();
    }
  }

  showEmptyPreview() {
    this.previewWrapper.innerHTML = `<div class="main__preview-wrapper--empty">Please select or add a slide</div>`;
    if (this.editBtn) this.editBtn.style.display = 'none';
  }

  updateActiveSlideUI(activeId) {
    const containers = this.slideList.querySelectorAll('.slide-preview-container, .sidebar__slide-preview-container');
    containers.forEach(el => el.classList.toggle('active', el.dataset.id === activeId));
  }

  createSlide() { return { id: 'slide-' + Date.now(), name: 'Slide', bgUrl: null, canvasJSON: null }; }

  /** Рендер списку слайдів з підвантаженням мініатюр */
  renderSlides() {
    this.slideList.innerHTML = '';
    this.slides.forEach(async (slide) => {
      // спочатку створюємо картку без src — щоб UI зʼявився миттєво
      const slideEl = renderPreview(slide, {
        onDelete: () => this.deleteSlide(slide.id),
        onDuplicate: () => this.duplicateSlide(slide.id),
        onSelect: () => this.selectSlide(slide.id),
        previewUrl: null
      });
      slideEl.dataset.id = slide.id;
      this.slideList.appendChild(slideEl);

      // асинхронно підвантажуємо таке саме зображення, як у великому превʼю
      const url = await this.getPreviewDataUrl(slide);
      const img = slideEl.querySelector('img.sidebar__thumb');
      if (img && url) img.src = url;
    });
    if (this.selectedSlide) this.updateActiveSlideUI(this.selectedSlide.id);
  }
}
