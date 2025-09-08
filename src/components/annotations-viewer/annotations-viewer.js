import html from './annotations-viewer.html';
import styles from './annotations-viewer.scss';
import { ViewerManager } from './viewer/ViewerManager.js';
import SlidesService from '../../services/SlidesService.js';

class GhAnnotationsViewer extends HTMLElement {
  constructor() {
    super();
    this.manager = null;
    this.service = null;
  }

  connectedCallback() {
    this.render();
    this.init();
  }

  render() {
    this.innerHTML = `
      <style>${styles}</style>
      ${html}
    `;
  }

  async init() {
    const slideList = this.querySelector('#slideList');
    const previewWrapper = this.querySelector('#previewWrapper');
    const addSlideBtn = this.querySelector('#addSlideBtn');
    const editBtn = this.querySelector('#editBtn');

    const appId = this.getAttribute('data-app-id');
    const itemId = this.getAttribute('data-item-id')?.split('.')[1];
    const fieldId = this.getAttribute('data-field-id');
    const storageKey = this.getAttribute('storage-key') || 'slides';

    // Використовуємо вже існуючий глобальний gudhub (як у твоєму коді)
    // Якщо потрібно — можна додати data-auth-key і створювати інстанс тут.
    const gudhubInstance = (typeof window !== 'undefined' && (window.gudhub || window.GudHubInstance)) || (typeof gudhub !== 'undefined' ? gudhub : null);

    this.service = new SlidesService({
      gudhubInstance,
      app_id: Number(appId),
      element_id: Number(fieldId),
      item_id: Number(itemId),
      storageKey,
    });

    // 1) Завантажуємо поточний документ (getDocument — один запит)
    const currentSlides = await this.service.load();

    // Якщо документа ще нема, але в полі зображень є дані — ініціалізуємо слайди та збережемо документ 1 раз.
    if (appId && (!currentSlides || currentSlides.length === 0)) {
      try {
        const gudhubImagesFieldValue = await gudhubInstance.getFieldValue(appId, itemId, fieldId);
        const idsArray = gudhubImagesFieldValue
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);

        const gudhubImagesDataFiles = await gudhubInstance.getFiles(appId, idsArray);
        const imagesUrl = gudhubImagesDataFiles?.map((file) => file?.url);

        if (imagesUrl?.length) {
          imagesUrl.forEach((url, i) => {
            this.service.addSlide({
              id: `slide-${Date.now()}-${i}`,
              name: `Slide ${i + 1}`,
              previewDataUrl: url,
              bgUrl: url,
            });
          });
          await this.service.persist(); // createDocument — один запит
        }
      } catch (e) {
        console.error('Failed to bootstrap slides from Gudhub:', e);
      }
    }

    // 2) Ініціалізуємо менеджер перегляду, який працює лише з кешем сервісу
    this.manager = new ViewerManager({
      slideList,
      previewWrapper,
      editBtn,
      storageKey,
      service: this.service,
      onSlideSelect: () => {},
      onSlideEdit: (slide) => {
        this.dispatchEvent(new CustomEvent('edit', {
          bubbles: true,
          composed: true,
          detail: { slideId: slide.id }
        }));
      }
    });

    // expose service на елементі, щоб image-annotation міг його використати
    this.service = this.manager.service;

    addSlideBtn?.addEventListener('click', () => this.manager.addSlide());
  }

  refreshSlides() {
    this.manager.renderSlides();
  }
}

if (!window.customElements.get('gh-annotations-viewer')) {
  window.customElements.define('gh-annotations-viewer', GhAnnotationsViewer);
}
