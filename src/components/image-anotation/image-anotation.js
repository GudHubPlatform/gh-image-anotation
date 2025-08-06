import html from './image-anotation.html';
import './image-anotation.scss'; // Assumes bundler compiles this into usable CSS

class GhImageAnotation extends HTMLElement {
  constructor() {
    super();

    // Attach shadow DOM
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    // Inject HTML into shadow DOM
    this.shadowRoot.innerHTML = html;

    // OPTIONAL: If CSS isn't bundled into <style> in HTML, manually inject it
    // Example for Vite/Webpack + sass-loader setup:
    // import styles from './image-anotation.scss';
    // const style = document.createElement('style');
    // style.textContent = styles;
    // this.shadowRoot.appendChild(style);
  }
}

// Define the custom element
if (!window.customElements.get('gh-image-anotation')) {
  window.customElements.define('gh-image-anotation', GhImageAnotation);
}
