import GhHtmlElement from '@gudhub/gh-html-element';
import html from "./image-annotation.html";
import styles from "./image-annotation.scss";

import '../annotations-viewer/annotations-viewer.js';
import '../annotations-editor/annotations-editor.js';

class GhImageAnnotation extends GhHtmlElement {
  constructor() {
    super();
    this.service = null;
  }

  onInit() {
    super.render(`
      <style>${styles}</style>
      ${html}
    `);

    const viewerEl = this.querySelector('gh-annotations-viewer');
    if (viewerEl) {
      // дочекаймося ініціалізації viewer-а
      const exposeService = () => {
        if (viewerEl.service) {
          this.service = viewerEl.service;
        } else {
          // невелика спроба повторити (ініт асинхронний)
          setTimeout(exposeService, 50);
        }
      };
      exposeService();

      viewerEl.addEventListener('edit', (e) => {
        const { slideId } = e.detail;
        this.showEditor(slideId);
      });
    }
  }

  showEditor(slideId) {
    const editorWrapper = this.querySelector('#editorWrapper');

    editorWrapper.innerHTML = '';
    const editorEl = document.createElement('gh-annotations-editor');
    editorEl.setAttribute('slide-id', slideId);
    editorEl.setAttribute('storage-key', 'slides');

    editorEl.addEventListener('editor:cancel', () => {
      this.showViewer();
    });

    editorEl.addEventListener('editor:save', async (e) => {
      const { json, dataUrl } = e.detail;
      // Оновлюємо лише кеш сервісу + 1 запит createDocument з усіма слайдами
      if (this.service) {
        this.service.updateSlide(slideId, { canvasJSON: json, previewDataUrl: dataUrl });
        await this.service.persist();
      }

      this.showViewer();
      this.querySelector('gh-annotations-viewer').refreshSlides();
    });

    editorWrapper.appendChild(editorEl);

    this.querySelector('#viewerWrapper').classList.add('hidden');
    editorWrapper.classList.remove('hidden');
  }

  showViewer() {
    this.querySelector('#editorWrapper').classList.add('hidden');
    this.querySelector('#viewerWrapper').classList.remove('hidden');
  }
}

if (!window.customElements.get('gh-image-annotation')) {
  window.customElements.define('gh-image-annotation', GhImageAnnotation);
}
