import GhHtmlElement from '@gudhub/gh-html-element';
import html from "./image-annotation.html";
import styles from "./image-annotation.scss";

import '../annotations-viewer/annotations-viewer.js';
import '../annotations-editor/annotations-editor.js';

import { slidesServiceDM } from '../../services/slidesServiceDM.js';

class GhImageAnnotation extends GhHtmlElement {
  constructor() {
    super();

    //TODO: Need to remove this gudHub data below
    this.appId = '36609';
    this.fieldId = '863613';
    this.itemId = '4900015';
    this.documentAddress = {
      app_id: this.appId,
      item_id: this.itemId,
      element_id: this.fieldId
    };
  }

  onInit() {
    super.render(`
      <style>${styles}</style>
      ${html}
    `);

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

    editorEl.addEventListener('editor:cancel', () => {
      this.showViewer();
    });

    editorEl.addEventListener('editor:save', async (e) => {
      const { json, dataUrl, currentSlideIndex, storageKey } = e.detail;
      const slides = await slidesServiceDM.getDataWithSlides(this.documentAddress);

      if (currentSlideIndex !== -1) {
        const slide = slides[currentSlideIndex];
        slide.canvasJSON = json;
        slide.previewDataUrl = dataUrl;

        if (slide.kind === 'empty') {
          slide.kind = 'normal';
          const base = Number.isInteger(slide.baseIndex)
            ? slide.baseIndex
            : (this._inferBaseIndexFromName(slide.name) || 1);
          slide.name = `slide-${base}`;
          slide.copyIndex = 0;
        }

        await slidesServiceDM.createDataWithSlides(this.documentAddress, slides);
      }

      this.showViewer();
      this.querySelector('gh-annotations-viewer').refreshSlides();
    });

    editorWrapper.appendChild(editorEl);

    this.querySelector('#viewerWrapper').classList.add('hidden');
    editorWrapper.classList.remove('hidden');
  }

  _inferBaseIndexFromName(name = '') {
    const m = name.match(/slide[-\s](\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  showViewer() {
    this.querySelector('#editorWrapper').classList.add('hidden');
    this.querySelector('#viewerWrapper').classList.remove('hidden');
  }
}

if (!window.customElements.get('gh-image-annotation')) {
  window.customElements.define('gh-image-annotation', GhImageAnnotation);
}
