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
    const itemId  = '4368318';
    const fieldId = '862799';
    const storageKey = this.getAttribute('storage-key') || 'slides';

    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!existing.length && appId && itemId && fieldId) {
      try {
        const items = await gudhub.getItems({ app_id: appId, item_id: itemId });
        const ghItem = Array.isArray(items) ? items[0] : items;
        const images = (ghItem?.fields?.[fieldId]?.value) || [];

        const slides = images.map((img, i) => {
          const url = typeof img === 'string' ? img : (img.url || img.link || '');
          return {
            id: `slide-${Date.now()}-${i}`,
            name: `Slide ${i + 1}`,
            canvasJSON: null,
            previewDataUrl: url,
            bgUrl: url
          };
        }).filter(s => !!s.bgUrl);

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
