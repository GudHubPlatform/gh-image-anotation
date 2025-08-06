import html from './anotations-viewer.html';
import './anotations-viewer.scss'; // Ensure this compiles to CSS and is injected properly
import PaintEditor from '../anotations-editor/editor/PaintEditor.js';

class GhAnotationsViewer extends HTMLElement {
  constructor() {
    super();

    // Create and attach shadow DOM
    this.attachShadow({ mode: 'open' });

    // Core state
    this.editor = null;
    this.slideId = null;
    this.slides = [];
    this.currentSlideIndex = -1;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    // Inject HTML into shadow DOM
    this.shadowRoot.innerHTML = html;

    // You might need to ensure CSS is compiled/injected with <style> tag or as string
    // Example if you're using Vite/Webpack with css-loader:
    // import styles from './anotations-viewer.scss';
    // const style = document.createElement('style');
    // style.textContent = styles;
    // this.shadowRoot.appendChild(style);

    this.initComponent();
  }

  initComponent() {
    this.slideId = new URLSearchParams(window.location.search).get('id');
    this.slides = JSON.parse(localStorage.getItem('slides') || '[]');
    this.currentSlideIndex = this.slides.findIndex(s => s.id === this.slideId);

    this.editor = new PaintEditor();

    const canvasContainer = this.shadowRoot.querySelector('#canvasContainer');
    canvasContainer.appendChild(this.editor.container);

    // Load slide if available
    if (this.currentSlideIndex !== -1 && this.slides[this.currentSlideIndex].canvasJSON) {
      setTimeout(() => {
        this.editor.canvas.loadFromJSON(this.slides[this.currentSlideIndex].canvasJSON, () => {
          this.editor.canvas.renderAll();
        });
      }, 100);
    }

    // Button events
    this.shadowRoot.querySelector('#cancelBtn').addEventListener('click', () => {
      window.location.href = 'slides.html';
    });

    this.shadowRoot.querySelector('#finalSaveBtn').addEventListener('click', () => {
      const json = this.editor.canvas.toJSON();
      const dataUrl = this.editor.canvas.toDataURL({ format: 'png' });

      if (this.currentSlideIndex !== -1) {
        this.slides[this.currentSlideIndex].canvasJSON = json;
        this.slides[this.currentSlideIndex].previewDataUrl = dataUrl;
        localStorage.setItem('slides', JSON.stringify(this.slides));
        window.location.href = 'slides.html';
      } else {
        alert("Slide not found. Unable to save.");
      }
    });
  }
}

// Define custom element
if (!window.customElements.get('gh-anotations-viewer')) {
  window.customElements.define('gh-anotations-viewer', GhAnotationsViewer);
}
