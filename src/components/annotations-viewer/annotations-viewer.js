import html from './annotations-viewer.html';
import styles from './annotations-viewer.scss';
import { ViewerManager } from './viewer/ViewerManager.js';
import { SlidesServiceDM } from '../../services/slidesServiceDM.js';
import { generateCanvasPreviewFromUrl } from '../../lib/generateCanvasPreviewFromUrl.js';

class GhAnnotationsViewer extends HTMLElement {
  constructor() {
    super();
    this.manager = null;
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

  async init() {
    const slideList = this.querySelector('#slideList');
    const previewWrapper = this.querySelector('#previewWrapper');
    const addSlideBtn = this.querySelector('#addSlideBtn');
    const editBtn = this.querySelector('#editBtn');

    // const appId = this.getAttribute('data-app-id');
    // const itemId = this.getAttribute('data-item-id')?.split('.')[1];
    // const fieldId = this.getAttribute('data-field-id');

    const appId = '36609';
    const fieldId = '863613';
    const itemId = '4368318';

    const storageKey = this.getAttribute('storage-key') || 'slides';

    const slidesService = new SlidesServiceDM({ appId, fieldId, itemId });

    if (appId) {
      try {
        // const gudhubImagesFieldValue = await gudhub.getFieldValue(appId, itemId, fieldId);
        // const idsArray = gudhubImagesFieldValue
        //   .split(",")
        //   .map(id => id.trim())
        //   .filter(Boolean);

        // const gudhubImagesDataFiles = await gudhub.getFiles(appId, idsArray);
        // const imagesUrl = gudhubImagesDataFiles?.map(file => file?.url);

        // const slides = imagesUrl.map((url, i) => ({
        //   id: `slide-${Date.now()}-${i}`,
        //   name: `Slide ${i + 1}`,
        //   canvasJSON: null,
        //   previewDataUrl: url,
        //   bgUrl: url
        // })).filter(s => !!s.bgUrl);

        // if (slides.length) {
        //   localStorage.setItem(storageKey, JSON.stringify(slides));
        // }

        const current = await slidesService.loadIndex();
        if (!current.length) {
          try {
            const gudhubImagesFieldValue = await gudhub.getFieldValue(appId, itemId, fieldId);
            const idsArray = gudhubImagesFieldValue.split(",").map(id => id.trim()).filter(Boolean);
            const gudhubImagesDataFiles = await gudhub.getFiles(appId, idsArray);
            const imagesUrl = gudhubImagesDataFiles?.map(file => file?.url).filter(Boolean) || [];

            const now = Date.now();
            const boot = [];

            for (let i = 0; i < imagesUrl.length; i++) {
              const url = imagesUrl[i];
              const id = `slide-${now}-${i}`;

              const { previewDataUrl, canvasJSON } = await generateCanvasPreviewFromUrl(url, {
                width: 1920, height: 1080, marginRatio: 0.10, background: null
              });

              await slidesService.upsertSlide({
                id,
                name: `Slide ${i + 1}`,
                previewDataUrl,
                bgUrl: url,
                canvasJSON
              });

              boot.push({ id, name: `Slide ${i + 1}`, previewDataUrl, bgUrl: url });
            }

            if (boot.length) await slidesService.saveIndex(boot);
          } catch (e) {
            console.error('Failed to bootstrap slides from Gudhub:', e);
          }
        }
      } catch (e) {
        console.error('Failed to bootstrap slides from Gudhub:', e);
      }
    }

    const initialSlidesMeta = await slidesService.loadIndex();
    this.manager = new ViewerManager({
      slideList,
      previewWrapper,
      editBtn,
      storageKey,
      slidesService,
      initialSlidesMeta,
      onSlideSelect: () => {},
      onSlideEdit: (slide) => {
        this.dispatchEvent(new CustomEvent('edit', {
          bubbles: true,
          composed: true,
          detail: { slideId: slide.id }
        }));
      }
    });

    addSlideBtn?.addEventListener('click', () => this.manager.addSlide());
  }

  async refreshSlides({ select } = {}) {
    const freshMeta = await this.manager.svc.loadIndex();
    this.manager.slides = Array.isArray(freshMeta) ? freshMeta : [];
    this.manager.renderSlides();

    const keep = select || this.manager.selectedSlide?.id || this.manager.slides[0]?.id;
    if (keep) this.manager.selectSlide(keep);
  }
}

if (!window.customElements.get('gh-annotations-viewer')) {
  window.customElements.define('gh-annotations-viewer', GhAnnotationsViewer);
}
