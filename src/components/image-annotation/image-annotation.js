import html from "./image-annotation.html";
import styles from "./image-annotation.scss";

import '../annotations-viewer/annotations-viewer.js';
import '../annotations-editor/annotations-editor.js';

class GhImageAnnotation extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
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
    const viewerEl = this.shadowRoot.querySelector('gh-annotations-viewer');

    viewerEl.addEventListener('edit', (e) => {
      const { slideId } = e.detail;
      this.showEditor(slideId);
    });
  }

  showEditor(slideId) {
    const editorWrapper = this.shadowRoot.querySelector('#editorWrapper');

    editorWrapper.innerHTML = '';
    const editorEl = document.createElement('gh-annotations-editor');
    editorEl.setAttribute('slide-id', slideId);
    editorEl.setAttribute('storage-key', 'slides');

    editorEl.addEventListener('cancel', () => {
      this.showViewer();
    });

    editorEl.addEventListener('save', (e) => {
      const { json, dataUrl, currentSlideIndex, storageKey } = e.detail;
      const slides = JSON.parse(localStorage.getItem(storageKey || 'slides') || '[]');

      if (currentSlideIndex !== -1) {
        slides[currentSlideIndex].canvasJSON = json;
        slides[currentSlideIndex].previewDataUrl = dataUrl;
        localStorage.setItem(storageKey || 'slides', JSON.stringify(slides));
      }

      this.showViewer();
      this.shadowRoot.querySelector('gh-annotations-viewer').refreshSlides();
    });

    editorWrapper.appendChild(editorEl);

    this.shadowRoot.querySelector('#viewerWrapper').classList.add('hidden');
    editorWrapper.classList.remove('hidden');
  }

  showViewer() {
    this.shadowRoot.querySelector('#editorWrapper').classList.add('hidden');
    this.shadowRoot.querySelector('#viewerWrapper').classList.remove('hidden');
  }
}

if (!window.customElements.get('gh-image-annotation')) {
  window.customElements.define('gh-image-annotation', GhImageAnnotation);
}
