import html from './anotations-editor.html';
import './anotations-editor.scss';
import PaintEditor from './editor/PaintEditor.js';

class GhAnotationsEditor extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.editor = null;
    }

    connectedCallback() {
        this.render();

        const canvasElement = this.shadowRoot.querySelector('#canvas');
        const urlParams = new URLSearchParams(window.location.search);
        const slideId = urlParams.get('id');

        let slides = JSON.parse(localStorage.getItem('slides') || '[]');
        let currentSlideIndex = slides.findIndex(s => s.id === slideId);

        this.editor = new PaintEditor(this.shadowRoot);
        this.editor.setCanvas(new fabric.Canvas(canvasElement));

        if (currentSlideIndex !== -1 && slides[currentSlideIndex].canvasJSON) {
            setTimeout(() => {
                this.editor.canvas.loadFromJSON(slides[currentSlideIndex].canvasJSON, () => {
                    this.editor.canvas.renderAll();
                });
            }, 100);
        }

        this.shadowRoot.querySelector('#cancelBtn')?.addEventListener('click', () => {
            window.location.href = 'slides.html';
        });

        this.shadowRoot.querySelector('#finalSaveBtn')?.addEventListener('click', () => {
            const json = this.editor.canvas.toJSON();
            const dataUrl = this.editor.canvas.toDataURL({ format: 'png' });

            if (currentSlideIndex !== -1) {
                slides[currentSlideIndex].canvasJSON = json;
                slides[currentSlideIndex].previewDataUrl = dataUrl;
                localStorage.setItem('slides', JSON.stringify(slides));
                window.location.href = 'slides.html';
            } else {
                alert("Slide not found. Unable to save.");
            }
        });
    }

    render() {
        this.shadowRoot.innerHTML = html;
    }
}

if (!window.customElements.get('gh-anotations-editor')) {
    window.customElements.define('gh-anotations-editor', GhAnotationsEditor);
}
