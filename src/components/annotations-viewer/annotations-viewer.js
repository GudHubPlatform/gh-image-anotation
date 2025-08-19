import html from './annotations-viewer.html';
import styles from './annotations-viewer.scss';
import { ViewerManager } from './viewer/ViewerManager.js';

class GhAnnotationsViewer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.manager = null;
  }

  connectedCallback() {
    this.render();
    this.init();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      ${html}
    `;
  }

  async init() {
    const slideList = this.shadowRoot.querySelector('#slideList');
    const previewWrapper = this.shadowRoot.querySelector('#previewWrapper');
    const addSlideBtn = this.shadowRoot.querySelector('#addSlideBtn');
    const editBtn = this.shadowRoot.querySelector('#editBtn');

    const appId   = '36609';
    const storageKey = this.getAttribute('storage-key') || 'slides';

    if (appId) {
      try {
        const gudHubApp = await gudhub.getApp(appId);
        const imagesUrl = gudHubApp?.fileList?.map(file => file?.url);

        const slides = imagesUrl.map((url, i) => (
          {
            id: `slide-${Date.now()}-${i}`,
            name: `Slide ${i + 1}`,
            canvasJSON: null,
            previewDataUrl: url,
            bgUrl: url
          }
        )).filter(s => !!s.bgUrl);

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

    addSlideBtn.addEventListener('click', () => this.manager.addSlide());
  }

  refreshSlides() {
    this.manager.renderSlides();
  }
}

if (!window.customElements.get('gh-annotations-viewer')) {
  window.customElements.define('gh-annotations-viewer', GhAnnotationsViewer);
}
