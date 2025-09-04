import GhHtmlElement from '@gudhub/gh-html-element';
import html from "./image-annotation.html";
import styles from "./image-annotation.scss";

import '../annotations-viewer/annotations-viewer.js';
import '../annotations-editor/annotations-editor.js';
import { SlidesServiceDM } from '../../services/slidesServiceDM.js';

class GhImageAnnotation extends GhHtmlElement {
  constructor() {
    super();
    this.svc = null; // єдиний інстанс на сторінку
  }

  onInit() {
    super.render(`
      <style>${styles}</style>
      ${html}
    `);

    // Єдиний інстанс сервісу (state-manager)
    const appId  = this.getAttribute('data-app-id')  || '36609';
    const fieldId= this.getAttribute('data-field-id')|| '863613';
    const itemId = this.getAttribute('data-item-id') || '4898526';
    this.svc = new SlidesServiceDM({ appId, fieldId, itemId });

    const viewerEl = this.querySelector('gh-annotations-viewer');
    if (viewerEl) {
      viewerEl.svc = this.svc;
      viewerEl.addEventListener('edit', (e) => {
        const { slide } = e.detail || {};
        if (!slide) return;
        this.showEditor(slide.id, slide);
      });
    }
  }

  showEditor(slideId, slide) {
    const editorWrapper = this.querySelector('#editorWrapper');

    editorWrapper.innerHTML = '';
    const editorEl = document.createElement('gh-annotations-editor');
    editorEl.setAttribute('slide-id', slideId);
    editorEl.setAttribute('storage-key', 'slides');
    editorEl.svc = this.svc;           // той самий сервіс
    editorEl.initialSlide = slide;     // повний слайд (щоб Editor не робив зайвий get)

    editorEl.addEventListener('editor:cancel', () => {
      this.showViewer();
    });

    editorEl.addEventListener('editor:save', (e) => {
      this.showViewer();
      const { state, slideId: savedId } = e.detail || {};
      const viewer = this.querySelector('gh-annotations-viewer');
      if (state && viewer && typeof viewer.applyState === 'function') {
        // Жодного запиту в мережу — використовуємо вже "get" зі збереження
        viewer.applyState(state, { select: savedId });
      } else {
        // Фолбек: 1 get без запису
        viewer?.refreshSlides({ select: slideId, sync: false });
      }
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
