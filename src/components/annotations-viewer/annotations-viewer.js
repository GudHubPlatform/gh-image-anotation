import html from './annotations-viewer.html';
import styles from './annotations-viewer.scss';
import { ViewerManager } from './viewer/ViewerManager.js';

class GhAnnotationsViewer extends HTMLElement {
  constructor() {
    super();
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
    // const fieldId = this.getAttribute('data-field-id');
    const storageKey = this.getAttribute('storage-key') || 'slides';

    if (appId) {
      try {
        const gudHubApp = await gudhub.getApp(appId);
        const imagesUrl = gudHubApp?.file_list?.map(file => file?.url);

        const slides = imagesUrl.map((url, i) => ({
          id: `slide-${Date.now()}-${i}`,
          name: `Slide ${i + 1}`,
          canvasJSON: null,
          previewDataUrl: url,
          bgUrl: url
        })).filter(s => !!s.bgUrl);

        if (slides.length) {
          localStorage.setItem(storageKey, JSON.stringify(slides));
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

    addSlideBtn?.addEventListener('click', () => this.manager.addSlide());
  }

  refreshSlides() {
    this.manager.renderSlides();
  }
}

if (!window.customElements.get('gh-annotations-viewer')) {
  window.customElements.define('gh-annotations-viewer', GhAnnotationsViewer);
}
