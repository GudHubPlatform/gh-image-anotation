import html from './annotations-editor.html';
import styles from './annotations-editor.scss';
import PaintEditor from './editor/PaintEditor.js';
import { resetHistory } from './editor/state/history.js';
import { SlidesServiceDM } from '../../services/slidesServiceDM.js';

class GhAnnotationsEditor extends HTMLElement {
  constructor() {
    super();
    this.editor = null;
    this.currentSlideIndex = -1;

    this._initialCanvasJSON = null;
    this._modal = null;
    this._modalContinueBtn = null;
    this._modalDiscardBtn = null;
    this._modalWired = false;

    this.svc = null;           // інʼєктується контейнером (або створюється тут)
    this.initialSlide = null;  // інʼєктується контейнером: повний слайд
    this._cachedMeta = null;   // meta для збереження без зайвих читань
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

  _captureInitial() {
    if (!this.editor?.canvas) return;
    try { this._initialCanvasJSON = JSON.stringify(this.editor.canvas.toJSON()); }
    catch { this._initialCanvasJSON = null; }
  }

  _hasUnsavedChanges() {
    if (!this.editor?.canvas || this._initialCanvasJSON == null) return false;
    try { return JSON.stringify(this.editor.canvas.toJSON()) !== this._initialCanvasJSON; }
    catch { return false; }
  }

  _wireModal() {
    if (this._modalWired) return;
    this._modal = this.querySelector('#unsavedModal');
    this._modalContinueBtn = this.querySelector('#modalContinueBtn');
    this._modalDiscardBtn = this.querySelector('#modalDiscardBtn');
    if (!this._modal) return;

    this._modal.addEventListener('click', (e) => { if (e.target === this._modal) this._hideModal(); });
    this._modalContinueBtn?.addEventListener('click', () => this._hideModal());
    this._modalDiscardBtn?.addEventListener('click', () => {
      this._hideModal();
      this.dispatchEvent(new CustomEvent('editor:cancel', { bubbles: true, composed: true }));
    });

    this._escHandler = (e) => {
      if (e.key === 'Escape' && this._modal?.classList.contains('unsaved-modal--active')) this._hideModal();
    };
    document.addEventListener('keydown', this._escHandler);
    this._modalWired = true;
  }

  _showModal()  { this._wireModal(); this._modal?.classList.add('unsaved-modal--active'); this._modalContinueBtn?.focus(); }
  _hideModal()  { this._modal?.classList.remove('unsaved-modal--active'); }

  async init() {
    const slideId = this.getAttribute('slide-id');

    // Якщо сервіс не інʼєктували — створюємо локально.
    const appId = '36609', fieldId = '863613', itemId = '4898526';
    this.svc = this.svc || new SlidesServiceDM({ appId, fieldId, itemId });

    this.editor = new PaintEditor(this);

    // 1) Якщо контейнер дав повний слайд — взагалі не читаємо мережу.
    if (this.initialSlide && this.initialSlide.id === slideId) {
      this._cachedMeta = {
        id: this.initialSlide.id,
        name: this.initialSlide.name,
        bgUrl: this.initialSlide.bgUrl ?? null,
        ...(this.initialSlide.fileId ? { fileId: this.initialSlide.fileId } : {}),
        ...(this.initialSlide.isCopy ? { isCopy: true } : {}),
        ...(this.initialSlide.copyOf ? { copyOf: this.initialSlide.copyOf } : {}),
        ...(typeof this.initialSlide.copyNumber === 'number' ? { copyNumber: this.initialSlide.copyNumber } : {})
      };

      if (this.initialSlide.canvasJSON) {
        this.editor.isRestoring = true;
        this.editor.canvas.loadFromJSON(this.initialSlide.canvasJSON, () => {
          this.editor.canvas.renderAll();
          this.editor.isRestoring = false;
          resetHistory(this.editor);
          this._captureInitial();
        });
      } else if (this.initialSlide.bgUrl && typeof this.editor.setBackgroundImageFromURL === 'function') {
        this.editor.setBackgroundImageFromURL(this.initialSlide.bgUrl);
        resetHistory(this.editor);
        const once = () => { this.editor.canvas.off('after:render', once); this._captureInitial(); };
        this.editor.canvas.on('after:render', once);
      } else {
        resetHistory(this.editor);
        setTimeout(() => this._captureInitial(), 0);
      }
    } else {
      // 2) Фолбек: один раз читаємо індекс, шукаємо meta і (за потреби) добираємо повний слайд
      let slides = [];
      await this.svc.loadIndex().then(idx => {
        slides = idx;
        const i = slides.findIndex(s => s.id === slideId);
        if (i !== -1) this._cachedMeta = slides[i];
      });

      if (this._cachedMeta) {
        const full = await this.svc.getSlide(this._cachedMeta.id).catch(() => null);
        if (full?.canvasJSON) {
          this.editor.isRestoring = true;
          this.editor.canvas.loadFromJSON(full.canvasJSON, () => {
            this.editor.canvas.renderAll();
            this.editor.isRestoring = false;
            resetHistory(this.editor);
            this._captureInitial();
          });
        } else if (this._cachedMeta.bgUrl && typeof this.editor.setBackgroundImageFromURL === 'function') {
          this.editor.setBackgroundImageFromURL(this._cachedMeta.bgUrl);
          resetHistory(this.editor);
          const once = () => { this.editor.canvas.off('after:render', once); this._captureInitial(); };
          this.editor.canvas.on('after:render', once);
        } else {
          resetHistory(this.editor);
          setTimeout(() => this._captureInitial(), 0);
        }
      }
    }

    this.querySelector('#cancelBtn')?.addEventListener('click', () => {
      if (this._hasUnsavedChanges()) { this._showModal(); return; }
      this.dispatchEvent(new CustomEvent('editor:cancel', { bubbles: true, composed: true }));
    });

    this._saving = false;

    // SAVE: тільки canvasJSON, без preview. Жодних зайвих get перед записом.
    this.querySelector('#finalSaveBtn')?.addEventListener('click', async () => {
      if (this._saving) return;
      this._saving = true;
      const btn = this.querySelector('#finalSaveBtn');
      const cancelBtn = this.querySelector('#cancelBtn');
      btn?.setAttribute('disabled', 'true');
      cancelBtn?.setAttribute('disabled', 'true');

      try {
        const json = this.editor.canvas.toJSON();
        try { this._initialCanvasJSON = JSON.stringify(json); } catch {}

        if (this._cachedMeta) {
          const updated = { ...this._cachedMeta, canvasJSON: json };
          const state = await this.svc.saveSlideAndIndexThenReload({ slide: updated, updateMeta: true });
          // Після гарантованого get віддаємо state контейнеру (щоб він не робив додатковий get)
          this.dispatchEvent(new CustomEvent('editor:save', {
            bubbles: true, composed: true,
            detail: { state, slideId: updated.id }
          }));
        }
      } catch (e) {
        console.error('Save failed:', e);
      } finally {
        this._saving = false;
        btn?.removeAttribute('disabled');
        cancelBtn?.removeAttribute('disabled');
      }
    });
  }
}

if (!window.customElements.get('gh-annotations-editor')) {
  window.customElements.define('gh-annotations-editor', GhAnnotationsEditor);
}
