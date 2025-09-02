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

    try {
      let current = await slidesService.loadIndex();
      current = Array.isArray(current) ? current : [];

      let images = [];
      try {
        const gudhubImagesFieldValue = await gudhub.getFieldValue(appId, itemId, fieldId);
        const idsArray = (gudhubImagesFieldValue || '')
          .split(',')
          .map(id => id.trim())
          .filter(Boolean);

        const gudhubFiles = await gudhub.getFiles(appId, idsArray);
        images = (gudhubFiles || [])
          .map(f => ({ fileId: String(f?.id), url: f?.url }))
          .filter(x => !!x.fileId && !!x.url);
      } catch (e) {
        console.error('Failed to fetch images from Gudhub:', e);
      }

      const existingByFileId = new Map(
        current
          .filter(m => m.fileId)
          .map(m => [String(m.fileId), m])
      );

      let toAdd = images.filter(x => !existingByFileId.has(String(x.fileId)));
      if (current.length === 0 && images.length) {
        toAdd = images.slice();
      }

      if (toAdd.length) {
        const now = Date.now();
        const base = current.length;

        for (let i = 0; i < toAdd.length; i++) {
          const { fileId, url } = toAdd[i];
          const id = `slide-${now}-${i + 1}`;

          const { previewDataUrl, canvasJSON } = await generateCanvasPreviewFromUrl(url, {
            width: 1920,
            height: 1080,
            marginRatio: 0.10,
            background: null
          });

          const meta = {
            id,
            name: `Slide ${base + i + 1}`,
            previewDataUrl,
            bgUrl: url,
            fileId
          };

          await slidesService.upsertSlide({
            ...meta,
            canvasJSON,
            schemaVersion: 1
          });

          current.push(meta);
        }

        await slidesService.replaceIndex(current);
      }
    } catch (e) {
      console.error('Failed to bootstrap/sync slides from Gudhub:', e);
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
