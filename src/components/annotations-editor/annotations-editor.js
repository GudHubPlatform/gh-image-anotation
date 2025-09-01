import html from './annotations-editor.html';
import styles from './annotations-editor.scss';
import PaintEditor from './editor/PaintEditor.js';
import { resetHistory } from './editor/state/history.js';
import { SlidesServiceDM } from '../services/slidesServiceDM.js';

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

    init() {
        // const slideId = this.getAttribute('slide-id');
        // const storageKey = this.getAttribute('storage-key') || 'slides';

        // let slides = JSON.parse(localStorage.getItem(storageKey) || '[]');
        // this.currentSlideIndex = slides.findIndex(s => s.id === slideId);

        const slideId = this.getAttribute('slide-id');
        // const storageKey = this.getAttribute('storage-key') || 'slides';
        const appId = '36609';
        const fieldId = '863613';
        const itemId = '4368318';

        this.svc = new SlidesServiceDM({ appId, fieldId, itemId, gudhub });

        let slides = [];
        const initPromise = this.svc.loadIndex().then(idx => {
            slides = idx;
            this.currentSlideIndex = slides.findIndex(s => s.id === slideId);
        });

        this.editor = new PaintEditor(this);

        // if (this.currentSlideIndex !== -1) {
        //     const slide = slides[this.currentSlideIndex];

        //     if (slide.canvasJSON) {
        //         this.editor.isRestoring = true;
        //         this.editor.canvas.loadFromJSON(slide.canvasJSON, () => {
        //             this.editor.canvas.renderAll();
        //             this.editor.isRestoring = false;
        //             resetHistory(this.editor);
        //             this._captureInitial();
        //         });
        //     } else if (slide.bgUrl && typeof this.editor.setBackgroundImageFromURL === 'function') {
        //         this.editor.setBackgroundImageFromURL(slide.bgUrl);
        //         resetHistory(this.editor);
        //         const once = () => {
        //             this.editor.canvas.off('after:render', once);
        //             this._captureInitial();
        //         };
        //         this.editor.canvas.on('after:render', once);
        //     } else {
        //         resetHistory(this.editor);
        //         setTimeout(() => this._captureInitial(), 0);
        //     }
        // } else {
        //     resetHistory(this.editor);
        //     setTimeout(() => this._captureInitial(), 0);
        // }

        initPromise.then(async () => {
            if (this.currentSlideIndex !== -1) {
                const meta = slides[this.currentSlideIndex];
                const full = await this.svc.getSlide(meta.id).catch(() => null);

                if (full?.canvasJSON) {
                    this.editor.isRestoring = true;
                    this.editor.canvas.loadFromJSON(full.canvasJSON, () => {
                        this.editor.canvas.renderAll();
                        this.editor.isRestoring = false;
                        resetHistory(this.editor);
                        this._captureInitial();
                    });
                } else if (meta.bgUrl && typeof this.editor.setBackgroundImageFromURL === 'function') {
                    this.editor.setBackgroundImageFromURL(meta.bgUrl);
                    resetHistory(this.editor);
                    const once = () => {
                        this.editor.canvas.off('after:render', once);
                        this._captureInitial();
                    };
                    this.editor.canvas.on('after:render', once);
                } else {
                    resetHistory(this.editor);
                    setTimeout(() => this._captureInitial(), 0);
                }
            } else {
                resetHistory(this.editor);
                setTimeout(() => this._captureInitial(), 0);
            }
        });

        this.querySelector('#cancelBtn')?.addEventListener('click', () => {
            if (this._hasUnsavedChanges()) {
                this._showModal();
                return;
            }
            this.dispatchEvent(new CustomEvent('editor:cancel', { bubbles: true, composed: true }));
        });

        this.querySelector('#finalSaveBtn')?.addEventListener('click', async () => {
            const json = this.editor.canvas.toJSON();
            const dataUrl = this.editor.canvas.toDataURL({
                format: "png",
                quality: 1,
                width: 1920,
                height: 1080,
                multiplier: 1
            });

            try {
                this._initialCanvasJSON = JSON.stringify(json);
            } catch {}

            // this.dispatchEvent(new CustomEvent('editor:save', {
            //     bubbles: true,
            //     composed: true,
            //     detail: { json, dataUrl, currentSlideIndex: this.currentSlideIndex, storageKey }
            // }));

            const slides = await this.svc.loadIndex();
            if (this.currentSlideIndex !== -1) {
                const meta = slides[this.currentSlideIndex];
                slides[this.currentSlideIndex] = { ...meta, previewDataUrl: dataUrl };
                await this.svc.upsertSlide({ ...meta, previewDataUrl: dataUrl, canvasJSON: json });
                await this.svc.saveIndex(slides);
            }

            this.dispatchEvent(new CustomEvent('editor:save', { bubbles: true, composed: true }));
        });
    }
}

if (!window.customElements.get('gh-annotations-editor')) {
    window.customElements.define('gh-annotations-editor', GhAnnotationsEditor);
}
