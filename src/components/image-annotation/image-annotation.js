import GhHtmlElement from '@gudhub/gh-html-element';
import html from "./image-annotation.html";
import styles from "./image-annotation.scss";

import '../annotations-viewer/annotations-viewer.js';
import '../annotations-editor/annotations-editor.js';

import { slidesServiceDM } from '../../services/slidesServiceDM.js';

class GhImageAnnotation extends GhHtmlElement {
  constructor() {
    super();

    this.appId = null;
    this.fieldId = null;
    this.itemId = null;
    this.documentAddress = {};
  }

  onInit() {
    super.render(`
      <style>${styles}</style>
      ${html}
    `);

    this.appId = this.getAttribute('app-id') || '';
    this.itemId = this.getAttribute('item-id') || '';
    this.fieldId = this.getAttribute('field-id') || '';
    this.documentAddress = {
      app_id: this.appId,
      item_id: this.itemId,
      element_id: this.fieldId
    };

    const viewerEl = this.querySelector('gh-annotations-viewer');
    if (viewerEl) {
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

    editorEl.setAttribute('data-app-id', this.appId);
    editorEl.setAttribute('data-item-id', this.itemId);
    editorEl.setAttribute('data-field-id', this.fieldId);

    editorEl.addEventListener('editor:cancel', () => {
      this.showViewer();
    });

    editorEl.addEventListener('editor:save', async (e) => {
      const { json, dataUrl, currentSlideIndex } = e.detail;

      let slides = await slidesServiceDM.getDataWithSlides(this.documentAddress);
      if (!Array.isArray(slides)) return;

      if (currentSlideIndex !== -1) {
        const prev = slides[currentSlideIndex];

        const parseNumber = (name = '') => {
          const m = String(name).match(/slide-(\d+)/i);
          return m ? parseInt(m[1], 10) : null;
        };
        const n = parseNumber(prev?.name) ?? (currentSlideIndex + 1);

        const newType = prev?.type === 'copy' ? 'copy' : 'normal';
        const newName = newType === 'copy' ? `slide-${n}--copy` : `slide-${n}`;

        slides[currentSlideIndex] = {
          id: prev?.id || `slide-${Date.now()}`,
          name: newName,
          bgUrl: dataUrl,
          type: newType,
          fileId: prev?.fileId ?? null,
          canvasJSON: json
        };

        await slidesServiceDM.createDataWithSlides(this.documentAddress, slides);
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
