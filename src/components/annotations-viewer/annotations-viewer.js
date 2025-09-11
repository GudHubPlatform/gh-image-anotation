import html from './annotations-viewer.html';
import styles from './annotations-viewer.scss';
import { ViewerManager } from './viewer/ViewerManager.js';
import { slidesServiceDM } from '../../services/slidesServiceDM.js';

class GhAnnotationsViewer extends HTMLElement {
  constructor() {
    super();

    // TODO: Need to remove this gudHub data below
    this.appId = '36609';
    this.fieldId = '863613';
    this.itemId = '4900015';
    this.documentAddress = {
      app_id: this.appId,
      item_id: this.itemId,
      element_id: this.fieldId
    };

    this.manager = null;
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

    if (appId) {
      try {
        const gudhubImagesFieldValue = await gudhub.getFieldValue(appId, itemId, fieldId);
        const idsArray = gudhubImagesFieldValue
          .split(",")
          .map(id => id.trim())
          .filter(Boolean);

        const gudhubImagesDataFiles = await gudhub.getFiles(appId, idsArray);
        const requiredFiles = (gudhubImagesDataFiles || []).map(f => ({
          fileId: f?.id ?? f?.file_id,
          url: f?.url ?? null
        })).filter(x => x.fileId && x.url);

        let slides = await slidesServiceDM.getDataWithSlides(this.documentAddress);
        if (!Array.isArray(slides)) slides = [];

        const existing = new Set(slides.map(s => s?.fileId).filter(Boolean));
        const toAdd = [];
        for (const f of requiredFiles) {
          if (!existing.has(f.fileId)) {
            const nextNumber = slides.length + toAdd.length + 1;
            toAdd.push({
              id: `slide-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
              name: `slide-${nextNumber}`,
              type: 'normal',
              bgUrl: f.url,
              previewDataUrl: f.url,
              fileId: f.fileId
            });
          }
        }

        if (toAdd.length > 0) {
          const newSlides = slides.concat(toAdd);
          await slidesServiceDM.createDataWithSlides(this.documentAddress, newSlides);
        }

      } catch (e) {
        console.error('Failed to bootstrap slides from Gudhub:', e);
      }
    }

    this.manager = new ViewerManager({
      slideList,
      previewWrapper,
      editBtn,
      storageKey,
      onSlideSelect: () => {},
      onSlideEdit: (slide) => {
        this.dispatchEvent(new CustomEvent('edit', {
          bubbles: true,
          composed: true,
          detail: { slideId: slide.id }
        }));
      }
    });

    addSlideBtn?.addEventListener('click', async () => {
      await this.manager.addSlide();
    });
  }

  refreshSlides() {
    this.manager.renderSlides();
  }
}

if (!window.customElements.get('gh-annotations-viewer')) {
  window.customElements.define('gh-annotations-viewer', GhAnnotationsViewer);
}
