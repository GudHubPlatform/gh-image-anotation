import html from './annotations-editor.html';
import styles from './annotations-editor.scss';
import PaintEditor from './editor/PaintEditor.js';

class GhAnnotationsEditor extends HTMLElement {
  constructor() {
    super();
    this.editor = null;
    this.currentSlideIndex = -1;
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

  init() {
    const slideId = this.getAttribute('slide-id');
    const storageKey = this.getAttribute('storage-key') || 'slides';

    let slides = JSON.parse(localStorage.getItem(storageKey) || '[]');
    this.currentSlideIndex = slides.findIndex(s => s.id === slideId);

    this.editor = new PaintEditor(this);

    if (this.currentSlideIndex !== -1) {
      const slide = slides[this.currentSlideIndex];
      if (slide.canvasJSON) {
        setTimeout(() => {
          this.editor.canvas.loadFromJSON(slide.canvasJSON, () => {
            this.editor.canvas.renderAll();
          });
        }, 100);
      } else if (slide.bgUrl && typeof this.editor.setBackgroundImageFromURL === 'function') {
        this.editor.setBackgroundImageFromURL(slide.bgUrl);
      }
    }

    this.querySelector('#cancelBtn')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
    });

    this.querySelector('#finalSaveBtn')?.addEventListener('click', () => {
      const json = this.editor.canvas.toJSON();
      const dataUrl = this.editor.canvas.toDataURL({ format: 'png' });

      this.dispatchEvent(new CustomEvent('save', {
        bubbles: true,
        composed: true,
        detail: { json, dataUrl, currentSlideIndex: this.currentSlideIndex, storageKey }
      }));
    });
  }
}

if (!window.customElements.get('gh-annotations-editor')) {
  window.customElements.define('gh-annotations-editor', GhAnnotationsEditor);
}
