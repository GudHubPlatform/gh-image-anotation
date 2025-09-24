import html from './annotations-viewer.html';
import styles from './annotations-viewer.scss';
import { ViewerManager } from './viewer/ViewerManager.js';
import { slidesServiceDM } from '../../services/slidesServiceDM.js';

import PaintEditor from '../annotations-editor/editor/PaintEditor.js';

class GhAnnotationsViewer extends HTMLElement {
  constructor() {
    super();

    this.appId = null;
    this.fieldId = null;
    this.itemId = null;
    this.documentAddress = {};

    this.manager = null;
    this._loader = null;

    this._initKey = null;

    this._ghValueUpdateHandler = null;
  }

  connectedCallback() {
    this.render();
    this.init();

    this._subscribeToGudhubFieldUpdates();
  }

  disconnectedCallback() {
    try {
      this._unsubscribeFromGudhubFieldUpdates();
    } catch (e) {
      console.warn('Failed to destroy gh_value_update listener', e);
    }
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

    this._initKey = `gh-anno-init:${this.appId}:${this.itemId}:${this.fieldId}`;

    this._ensureLoader();
  }

  _ensureLoader() {
    if (this._loader) return this._loader;

    const el = document.createElement('div');
    el.className = 'gh-loader-overlay';
    el.innerHTML = `<div class="gh-loader-overlay__spinner" role="status" aria-label="Loading"></div>`;
    this.appendChild(el);

    let refCount = 0;
    const apply = () => {
      if (refCount > 0) el.classList.add('gh-loader-overlay--active');
      else el.classList.remove('gh-loader-overlay--active');
    };

    this._loader = {
      el,
      show: () => { refCount++; apply(); },
      hide: () => { refCount = Math.max(0, refCount - 1); apply(); },
      reset: () => { refCount = 0; apply(); }
    };
    return this._loader;
  }

  async refreshSlides({ preferSlideId = null, updated = null } = {}) {
    if (!this.manager) return;

    if (updated?.id && (updated.dataUrl || updated.json)) {
      this.manager.applyLocalUpdate?.(updated);
    }

    this._loader?.show();
    try {
      await this.manager.renderSlides();
      if (preferSlideId) {
        const ok = this.manager.slides?.some(s => s.id === preferSlideId);
        if (ok) this.manager.selectSlide(preferSlideId);
      }
    } finally {
      this._loader?.hide();
    }
  }

  async init() {
    const slideList = this.querySelector('#slideList');
    const previewWrapper = this.querySelector('#previewWrapper');
    const addSlideBtn = this.querySelector('#addSlideBtn');
    const editBtn = this.querySelector('#editBtn');

    const storageKey = this.getAttribute('storage-key') || 'slides';
    const loader = this._ensureLoader();

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

    const editorizeFromUrl = async (url) => {
      try {
        loader.show();
        if (typeof window.fabric === 'undefined') {
          return { dataUrl: url, json: null };
        }

        const offscreen = document.createElement('div');
        offscreen.style.position = 'fixed';
        offscreen.style.left = '-99999px';
        offscreen.style.top = '-99999px';
        offscreen.innerHTML = `<div class="canvas"><div id="canvasWrapper" class="canvas__wrapper"></div></div>`;
        document.body.appendChild(offscreen);

        const editor = new PaintEditor(offscreen);

        if (typeof editor.setBackgroundImageFromURL === 'function') {
          await new Promise((resolve) => {
            const once = () => {
              editor.canvas.off('after:render', once);
              resolve();
            };
            editor.canvas.on('after:render', once);
            editor.setBackgroundImageFromURL(url);
          });
        } else {
          const cw = 1920, ch = 1080;
          editor.canvas.setBackgroundColor('#ffffff', editor.canvas.renderAll.bind(editor.canvas));
          const image = await new Promise((resolve, reject) => {
            fabric.Image.fromURL(
              url,
              (img) => img ? resolve(img) : reject(new Error('Image load error')),
              { crossOrigin: 'anonymous' }
            );
          });
          const sx = cw / (image.width || cw);
          const sy = ch / (image.height || ch);
          const scale = Math.min(sx, sy) || 1;
          editor.canvas.setBackgroundImage(
            image,
            editor.canvas.renderAll.bind(editor.canvas),
            { originX: 'center', originY: 'center', left: cw/2, top: ch/2, scaleX: scale, scaleY: scale }
          );
          editor.canvas.renderAll();
        }

        const dataUrl = editor.canvas.toDataURL({
          format: 'png',
          quality: 1,
          width: 1920,
          height: 1080,
          multiplier: 1
        });
        const json = editor.canvas.toJSON();

        try { editor.canvas.dispose(); } catch {}
        offscreen.remove();

        return { dataUrl, json };
      } catch (e) {
        console.warn('Editorization via PaintEditor failed, fallback to original URL', e);
        return { dataUrl: url, json: null };
      } finally {
        loader.hide();
      }
    };

    if (this.appId) {
      try {
        loader.show();

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
              fileId: rf.fileId,
              canvasJSON: null
            });
          }
        }

        for (const s of toAdd) {
          try {
            const { dataUrl, json } = await editorizeFromUrl(s.bgUrl);
            s.bgUrl = dataUrl;
            s.previewDataUrl = dataUrl;
            s.canvasJSON = json;
          } catch (e) {
            console.warn('Editorization failed for', s.fileId, e);
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
          if (!ok) continue;

          filtered.push(s);
        }

        const changed = filtered.length !== slides.length || toAdd.length > 0;
        if (changed) {
          await slidesServiceDM.createDataWithSlides(this.documentAddress, filtered);
        }

        this.manager = new ViewerManager(this.appId, this.fieldId, this.itemId, {
          slideList,
          previewWrapper,
          editBtn,
          onSlideSelect: () => {},
          onSlideEdit: (slide) => {
            this.dispatchEvent(new CustomEvent('edit', { detail: { slideId: slide.id }, bubbles: true, composed: true }));
          },
          storageKey,
          loader
        });

        await this.manager.renderSlides();

        const wasInit = sessionStorage.getItem(this._initKey) === '1';
        if (!wasInit && this.manager.slides?.length) {
          this.manager.selectSlide(this.manager.slides[0].id);
          sessionStorage.setItem(this._initKey, '1');
        }

        addSlideBtn?.addEventListener('click', async () => {
          loader.show();
          try {
            await this.manager.addSlide();
          } finally {
            loader.hide();
          }
        });
      } catch (e) {
        console.warn(e);
      } finally {
        loader.hide();
      }
    }
  }

  _subscribeToGudhubFieldUpdates() {
    if (this._ghValueUpdateHandler) return;

    const filter = {
      app_id: this.appId,
      item_id: this.itemId,
      field_id: this.fieldId,
    };

    this._ghValueUpdateHandler = async (_event) => {
      try {
        await this.init();
      } catch (e) {
        console.warn('Slides reload on gh_value_update failed', e);
      }
    };

    gudhub.on('gh_value_update', filter, this._ghValueUpdateHandler);
  }

  _unsubscribeFromGudhubFieldUpdates() {
    if (!this._ghValueUpdateHandler) return;

    const filter = {
      app_id: this.appId,
      item_id: this.itemId,
      field_id: this.fieldId,
    };

    gudhub.destroy('gh_value_update', filter, this._ghValueUpdateHandler);
    this._ghValueUpdateHandler = null;
  }
}

if (!window.customElements.get('gh-annotations-viewer')) {
  window.customElements.define('gh-annotations-viewer', GhAnnotationsViewer);
}
