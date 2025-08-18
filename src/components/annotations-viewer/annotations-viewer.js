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

  init() {
    const slideList = this.shadowRoot.querySelector('#slideList');
    const previewWrapper = this.shadowRoot.querySelector('#previewWrapper');
    const addSlideBtn = this.shadowRoot.querySelector('#addSlideBtn');
    const editBtn = this.shadowRoot.querySelector('#editBtn');

    this.manager = new ViewerManager({
      slideList,
      previewWrapper,
      editBtn,
      storageKey: 'slides',
      onSlideSelect: () => {},
      onSlideEdit: (slide) => {
        this.dispatchEvent(new CustomEvent('edit', {
          bubbles: true,
          composed: true,
          detail: { slideId: slide.id }
        }));
      }
    });

    addSlideBtn.addEventListener('click', () => {
      this.manager.addSlide();
    });
  }

  refreshSlides() {
    this.manager.renderSlides();
  }
}

if (!window.customElements.get('gh-annotations-viewer')) {
  window.customElements.define('gh-annotations-viewer', GhAnnotationsViewer);
}
