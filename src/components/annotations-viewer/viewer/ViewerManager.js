import { renderPreview, renderSlides } from './ViewerPreview.js';

export class ViewerManager {
  constructor({ slideList, previewWrapper, editBtn, onSlideSelect, onSlideEdit, storageKey, slidesService, initialSlidesMeta }) {
    this.slideList = slideList;
    this.previewWrapper = previewWrapper;
    this.editBtn = editBtn;
    this.onSlideSelect = onSlideSelect;
    this.onSlideEdit = onSlideEdit;
    this.storageKey = storageKey || 'slides';
    // this.slides = this.loadSlides();
    this.svc = slidesService;
    this.slides = Array.isArray(initialSlidesMeta) ? initialSlidesMeta : [];
    this.selectedSlide = null;
    this.renderSlides();

    if (this.slides.length > 0) {
      this.selectSlide(this.slides[0].id);
    } else {
      this.showEmptyPreview();
    }
  }

  // saveSlides() {
  //   localStorage.setItem(this.storageKey, JSON.stringify(this.slides));
  // }

  async _persistIndex() { 
    await this.svc.saveIndex(this.slides); 
  }

  addSlide() {
    const newSlide = this.createSlide();
    this.slides.push(newSlide);
    // this.saveSlides();
    this._persistIndex();
    this.renderSlides();
    if (this.slides.length === 1) {
      this.selectSlide(newSlide.id);
    }
    return newSlide;
  }

  deleteSlide(id) {
    this.slides = this.slides.filter(slide => slide.id !== id);
    // this.saveSlides();
    this._persistIndex();
    this.svc.softDelete(id);
    this.renderSlides();
    if (this.selectedSlide?.id === id) {
      if (this.slides.length > 0) {
        this.selectSlide(this.slides[0].id);
      } else {
        this.showEmptyPreview();
      }
    }
  }

  duplicateSlide(id) {
    const originalIndex = this.slides.findIndex(s => s.id === id);
    if (originalIndex === -1) return null;

    const original = this.slides[originalIndex];
    const copy = {
      ...original,
      id: 'slide-' + Date.now(),
      name: original.name + ' (copy)'
    };

    this.slides.splice(originalIndex + 1, 0, copy);
    // this.saveSlides();

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
    const containers = this.slideList.querySelectorAll('.slide-preview-container');
    containers.forEach(el => {
      el.classList.toggle('active', el.dataset.id === activeId);
    });
  }

  // loadSlides() {
  //   return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
  // }

  createSlide() {
    return {
      id: 'slide-' + Date.now(),
      name: 'Slide',
      // canvasJSON: null,
      previewDataUrl: null
    };
  }

  renderSlides() {
    // this.slides = this.loadSlides();
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
