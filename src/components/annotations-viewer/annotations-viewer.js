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
        const imagesUrl = gudhubImagesDataFiles?.map(file => file?.url);

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

    addSlideBtn?.addEventListener('click', async () => { await this.manager.addSlide(); });
  }

  refreshSlides() {
    this.manager.renderSlides();
  }
}

if (!window.customElements.get('gh-annotations-viewer')) {
  window.customElements.define('gh-annotations-viewer', GhAnnotationsViewer);
}
