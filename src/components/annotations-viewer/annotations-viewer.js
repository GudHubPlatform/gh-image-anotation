import html from './annotations-viewer.html';
import styles from './annotations-viewer.scss';
import { ViewerManager } from './viewer/ViewerManager.js';
import { slidesServiceDM } from '../../services/slidesServiceDM.js';

class GhAnnotationsViewer extends HTMLElement {
  constructor() {
    super();

    this.appId = null;
    this.fieldId = null;
    this.itemId = null;
    this.documentAddress = {};

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

    this.appId = this.getAttribute('data-app-id') || '';
    this.itemId = this.getAttribute('data-item-id') || '';
    this.fieldId = this.getAttribute('data-field-id') || '';
    this.documentAddress = {
      app_id: this.appId,
      item_id: this.itemId,
      element_id: this.fieldId
    };
  }

  async init() {
    const slideList = this.querySelector('#slideList');
    const previewWrapper = this.querySelector('#previewWrapper');
    const addSlideBtn = this.querySelector('#addSlideBtn');
    const editBtn = this.querySelector('#editBtn');

    const storageKey = this.getAttribute('storage-key') || 'slides';

    if (this.appId) {
      try {
        const gudhubImagesFieldValue = await gudhub.getFieldValue(this.appId, this.itemId, this.fieldId);
        const idsArray = (gudhubImagesFieldValue || '')
          .split(',')
          .map(id => id.trim())
          .filter(Boolean);

        const gudhubImagesDataFiles = await gudhub.getFiles(this.appId, idsArray);

        const requiredFiles = (gudhubImagesDataFiles || [])
          .map(f => ({
            fileId: f?.id ?? f?.file_id,
            url: f?.url ?? null
          }))
          .filter(x => x.fileId && x.url);

        const requiredIdsSet = new Set(requiredFiles.map(x => x.fileId));
        const urlById = new Map(requiredFiles.map(x => [x.fileId, x.url]));

        let slides = await slidesServiceDM.getDataWithSlides(this.documentAddress);
        if (!Array.isArray(slides)) slides = [];

        const validateImage = (url, timeoutMs = 5000) => {
          return new Promise(resolve => {
            try {
              const img = new Image();
              let done = false;
              const finish = (ok) => {
                if (!done) {
                  done = true;
                  resolve(ok);
                }
              };
              const timer = setTimeout(() => finish(false), timeoutMs);
              img.onload = () => { clearTimeout(timer); finish(true); };
              img.onerror = () => { clearTimeout(timer); finish(false); };

              const bust = url.includes('?') ? '&' : '?';
              img.src = `${url}${bust}t=${Date.now()}`;
            } catch {
              resolve(false);
            }
          });
        };

        const existingIds = new Set(slides.map(s => s?.fileId).filter(Boolean));
        const toAdd = [];
        for (const rf of requiredFiles) {
          if (!existingIds.has(rf.fileId)) {
            const nextNumber = slides.length + toAdd.length + 1;
            toAdd.push({
              id: `slide-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
              name: `slide-${nextNumber}`,
              type: 'normal',
              bgUrl: rf.url,
              previewDataUrl: rf.url,
              fileId: rf.fileId
            });
          }
        }
        if (toAdd.length > 0) {
          slides = slides.concat(toAdd);
        }

        const filtered = [];
        for (const s of slides) {
          const hasFileId = !!s?.fileId;

          if (!hasFileId) {
            filtered.push(s);
            continue;
          }

          if (!requiredIdsSet.has(s.fileId)) {
            continue;
          }

          const expectedUrl = urlById.get(s.fileId);
          if (!expectedUrl) {
            continue;
          }

          const looksEdited =
            (typeof s?.previewDataUrl === 'string' && s.previewDataUrl.startsWith('data:')) ||
            (typeof s?.bgUrl === 'string' && s.bgUrl.startsWith('data:'));

          if (looksEdited) {
            filtered.push(s);
            continue;
          }

          if (s.bgUrl !== expectedUrl || s.previewDataUrl !== expectedUrl) {
            s.bgUrl = expectedUrl;
            s.previewDataUrl = expectedUrl;
          }

          const ok = await validateImage(expectedUrl);
          if (!ok) {
            continue;
          }

          filtered.push(s);
        }

        const changed = filtered.length !== slides.length || toAdd.length > 0;
        if (changed) {
          await slidesServiceDM.createDataWithSlides(this.documentAddress, filtered);
        }
      } catch (e) {
        console.error('Failed to bootstrap slides from Gudhub:', e);
      }
    }

    this.manager = new ViewerManager(this.appId, this.itemId, this.fieldId, {
      slideList,
      previewWrapper,
      editBtn,
      storageKey,
      onSlideSelect: () => {},
      onSlideEdit: (slide) => {
        this.dispatchEvent(new CustomEvent('edit', {
          bubbles: true,
          composed: true,
          detail: { slideId: slide.id }
        }));
      }
    });

    addSlideBtn?.addEventListener('click', async () => {
      await this.manager.addSlide();
    });
  }

  refreshSlides() {
    this.manager.renderSlides();
  }
}

if (!window.customElements.get('gh-annotations-viewer')) {
  window.customElements.define('gh-annotations-viewer', GhAnnotationsViewer);
}
