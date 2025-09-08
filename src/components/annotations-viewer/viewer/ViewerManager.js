import { renderPreview, renderSlides } from './ViewerPreview.js';

export class ViewerManager {
  constructor({ slideList, previewWrapper, editBtn, onSlideSelect, onSlideEdit, storageKey, service }) {
    this.slideList = slideList;
    this.previewWrapper = previewWrapper;
    this.editBtn = editBtn;
    this.onSlideSelect = onSlideSelect;
    this.onSlideEdit = onSlideEdit;
    this.storageKey = storageKey || 'slides';
    this.service = service;

    this.slides = this.service.getAllSlides();
    this.selectedSlide = null;
    this.renderSlides();

    if (this.slides.length > 0) {
      this.selectSlide(this.slides[0].id);
    } else {
      this.showEmptyPreview();
    }
  }

  addSlide() {
    const newSlide = this.service.addSlide();
    this.slides = this.service.getAllSlides();
    this.service.persist(); // 1 запит: createDocument
    this.renderSlides();
    if (this.slides.length === 1) {
      this.selectSlide(newSlide.id);
    }
    return newSlide;
  }

  deleteSlide(id) {
    this.service.deleteSlide(id);
    this.slides = this.service.getAllSlides();
    this.service.persist(); // 1 запит
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
    const copy = this.service.duplicateSlide(id);
    if (!copy) return null;
    this.slides = this.service.getAllSlides();
    this.service.persist(); // 1 запит
    this.renderSlides();
    return copy;
  }

  selectSlide(id) {
    const slide = this.service.getSlide(id) || this.slides.find(s => s.id === id);
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
    // лишаємо як було, щоб не ламати існуючу розмітку
    const containers = this.slideList.querySelectorAll('.slide-preview-container, .sidebar__slide-preview-container');
    containers.forEach(el => {
      el.classList.toggle('active', el.dataset.id === activeId);
    });
  }

  renderSlides() {
    this.slides = this.service.getAllSlides();
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
