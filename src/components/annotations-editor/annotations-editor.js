import html from './annotations-editor.html';
import styles from './annotations-editor.scss';
import PaintEditor from './editor/PaintEditor.js';
import { resetHistory } from './editor/state/history.js';
import { slidesServiceDM } from '../../services/slidesServiceDM.js';

class GhAnnotationsEditor extends HTMLElement {
  constructor() {
    super();

    this.appId = null;
    this.fieldId = null;
    this.itemId = null;
    this.documentAddress = {};

    this.editor = null;
    this.currentSlideIndex = -1;

    this._initialCanvasJSON = null;
    this._modal = null;
    this._modalContinueBtn = null;
    this._modalDiscardBtn = null;
    this._modalWired = false;

    this._escHandler = null;

    this._pageLoader = null;
    this._onSaved = null;
  }

  connectedCallback() {
    this.render();
    this.init();
  }

  disconnectedCallback() {
    if (this._onSaved) this.removeEventListener('editor:saved', this._onSaved);
    this._hidePageLoader(true);
  }

  render() {
    this.innerHTML = `
      <style>${styles}</style>
      ${html}
    `;

    this.appId = this.getAttribute('data-app-id') || '';
    this.itemId = this.getAttribute('data-item-id') || '';
    this.fieldId = this.getAttribute('data-field-id') || '';
    this.documentAddress = {
      app_id: this.appId,
      item_id: this.itemId,
      element_id: this.fieldId
    };

    this._ensureGlobalLoaderStyles();
  }

  _ensureGlobalLoaderStyles() {
    if (document.getElementById('gh-page-loader-styles')) return;
    const st = document.createElement('style');
    st.id = 'gh-page-loader-styles';
    st.textContent = `
      .gh-no-scroll { overflow: hidden !important; }
      .gh-page-loader {
        position: fixed; inset: 0;
        display: none; place-items: center;
        background: rgba(0,0,0,0.3);
        z-index: 1000;
      }
      .gh-page-loader--active { display: grid; }
      .gh-page-loader__spinner {
        width: 56px; 
        height: 56px;
        border: 5px solid rgba(0,86,255,0.20);
        border-top-color: #0056ff;
        border-radius: 50%;
        animation: gh-page-spin 1s linear infinite;
      }
      @keyframes gh-page-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(st);
  }

  _ensurePageLoader() {
    if (this._pageLoader?.el?.isConnected) return this._pageLoader;
    const el = document.createElement('div');
    el.className = 'gh-page-loader';
    el.innerHTML = `<div class="gh-page-loader__spinner" role="status" aria-label="Loading"></div>`;
    document.body.appendChild(el);
    this._pageLoader = {
      el,
      show: () => {
        el.classList.add('gh-page-loader--active');
        document.documentElement.classList.add('gh-no-scroll');
      },
      hide: () => {
        el.classList.remove('gh-page-loader--active');
        document.documentElement.classList.remove('gh-no-scroll');
      },
      remove: () => {
        try { el.remove(); } catch {}
        document.documentElement.classList.remove('gh-no-scroll');
      }
    };
    return this._pageLoader;
  }

  _showPageLoader() {
    this._ensurePageLoader().show();
  }
  _hidePageLoader(remove = false) {
    if (!this._pageLoader) return;
    if (remove) this._pageLoader.remove();
    else this._pageLoader.hide();
  }

  _captureInitial() {
    if (!this.editor?.canvas) return;
    try {
      this._initialCanvasJSON = JSON.stringify(this.editor.canvas.toJSON());
    } catch {
      this._initialCanvasJSON = null;
    }
  }

  _hasUnsavedChanges() {
    if (!this.editor?.canvas || this._initialCanvasJSON == null) return false;
    try {
      return JSON.stringify(this.editor.canvas.toJSON()) !== this._initialCanvasJSON;
    } catch {
      return false;
    }
  }

  _wireModal() {
    if (this._modalWired) return;
    this._modal = this.querySelector('#unsavedModal');
    this._modalContinueBtn = this.querySelector('#modalContinueBtn');
    this._modalDiscardBtn = this.querySelector('#modalDiscardBtn');
    if (!this._modal) return;

    this._modal.addEventListener('click', (e) => {
      if (e.target === this._modal) this._hideModal();
    });

    this._modalContinueBtn?.addEventListener('click', () => this._hideModal());

    this._modalDiscardBtn?.addEventListener('click', () => {
      this._hideModal();
      this.dispatchEvent(new CustomEvent('editor:cancel', { bubbles: true, composed: true }));
    });

    this._escHandler = (e) => {
      if (e.key === 'Escape' && this._modal?.classList.contains('unsaved-modal--active')) {
        this._hideModal();
      }
    };
    document.addEventListener('keydown', this._escHandler);

    this._modalWired = true;
  }

  _showModal() {
    this._wireModal();
    if (this._modal) {
      this._modal.classList.add('unsaved-modal--active');
      this._modalContinueBtn?.focus();
    }
  }

  _hideModal() {
    if (this._modal) {
      this._modal.classList.remove('unsaved-modal--active');
    }
  }

  _sanitizeCanvasPaths() {
    const c = this.editor?.canvas;
    if (!c) return;
    try {
      c.getObjects().forEach(obj => {
        if (obj.type === 'path') obj.set({ fill: null });
      });
    } catch {}
  }

  async init() {
    const slideId = this.getAttribute('slide-id');
    const storageKey = this.getAttribute('storage-key') || 'slides';

    this._showPageLoader();

    let slides = await slidesServiceDM.getDataWithSlides(this.documentAddress);
    this.currentSlideIndex = Array.isArray(slides) ? slides.findIndex(s => s.id === slideId) : -1;

    this.editor = new PaintEditor(this);

    const finishInitial = () => {
      resetHistory(this.editor);
      this._captureInitial();
      this._hidePageLoader();
    };

    if (this.currentSlideIndex !== -1 && Array.isArray(slides)) {
      const slide = slides[this.currentSlideIndex];

      if (slide.canvasJSON) {
        this.editor.isRestoring = true;
        this.editor.canvas.loadFromJSON(slide.canvasJSON, () => {
          this._sanitizeCanvasPaths();
          this.editor.canvas.renderAll();
          this.editor.isRestoring = false;
          finishInitial();
        });
      } else if (slide.bgUrl && typeof this.editor.setBackgroundImageFromURL === 'function') {
        this.editor.setBackgroundImageFromURL(slide.bgUrl);
        const once = () => {
          this.editor.canvas.off('after:render', once);
          finishInitial();
        };
        this.editor.canvas.on('after:render', once);
      } else {
        finishInitial();
      }
    } else {
      finishInitial();
    }

    this.querySelector('#cancelBtn')?.addEventListener('click', () => {
      if (this._hasUnsavedChanges()) {
        this._showModal();
        return;
      }
      this.dispatchEvent(new CustomEvent('editor:cancel', { bubbles: true, composed: true }));
    });

    this._onSaved = () => this._hidePageLoader();
    this.addEventListener('editor:saved', this._onSaved);

    this.querySelector('#finalSaveBtn')?.addEventListener('click', () => {
      const json = this.editor.canvas.toJSON();
      const dataUrl = this.editor.canvas.toDataURL({
        format: 'png',
        quality: 1,
        width: 1920,
        height: 1080,
        multiplier: 1
      });

      this._showPageLoader();
      this.dispatchEvent(new CustomEvent('editor:save', {
        detail: { json, dataUrl, currentSlideIndex: this.currentSlideIndex },
        bubbles: true,
        composed: true
      }));
    });
  }
}

if (!window.customElements.get('gh-annotations-editor')) {
  window.customElements.define('gh-annotations-editor', GhAnnotationsEditor);
}
