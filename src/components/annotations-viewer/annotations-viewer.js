import html from './annotations-viewer.html';
import styles from './annotations-viewer.scss';
import { ViewerManager } from './viewer/ViewerManager.js';
import { SlidesServiceDM } from '../../services/slidesServiceDM.js';
import { generateCanvasPreviewFromUrl } from '../../lib/generateCanvasPreviewFromUrl.js';

class GhAnnotationsViewer extends HTMLElement {
  constructor() {
    super();
    this.manager = null;
    this._syncInFlight = false;

    this._appId = null;
    this._fieldId = null;
    this._itemId = null;

    this.svc = null; // єдиний інстанс сервісу

    this._onFocus = this._onFocus.bind(this);
  }

  connectedCallback() {
    this.render();
    this.init();
    window.addEventListener('focus', this._onFocus, { passive: true });
  }

  disconnectedCallback() {
    window.removeEventListener('focus', this._onFocus);
  }

  _onFocus() {
    // Оновлення при поверненні у вкладку: синк з images лише якщо є зміни
    this.refreshSlides({ sync: true });
  }

  render() {
    this.innerHTML = `
      <style>${styles}</style>
      ${html}
    `;
  }

  /** Прочитати images з GudHub у вигляді [{fileId, url}] */
  async _fetchImagesFromGudhub({ appId, itemId, fieldId }) {
    let images = [];
    try {
      const rawValue = await gudhub.getFieldValue(appId, itemId, fieldId);

      let idsArray = [];
      if (Array.isArray(rawValue)) {
        idsArray = rawValue.map(String);
      } else if (typeof rawValue === 'string') {
        try {
          const parsed = JSON.parse(rawValue);
          if (Array.isArray(parsed)) idsArray = parsed.map(String);
          else {
            idsArray = String(rawValue).split(/[,\s;]+/).map(id => id.trim()).filter(Boolean);
          }
        } catch {
          idsArray = String(rawValue).split(/[,\s;]+/).map(id => id.trim()).filter(Boolean);
        }
      }

      if (!idsArray.length) return [];

      const numericIds = idsArray.map(Number).filter(Number.isFinite);
      const gudhubFiles = await gudhub.getFiles(appId, numericIds);

      images = (gudhubFiles || [])
        .map(f => {
          const fid = f?.file_id ?? f?.id ?? null;
          const url = f?.url ?? f?.file_url ?? null;
          return fid && url ? { fileId: String(fid), url: String(url) } : null;
        })
        .filter(Boolean);

      const byId = new Map(images.map(x => [x.fileId, x]));
      images = Array.from(byId.values());
    } catch (e) {
      console.error('Failed to fetch images from Gudhub:', e);
    }
    return images;
  }

  /**
   * Синхронізація слайдів з images:
   * - формує локальний current з видаленнями/додаваннями
   * - якщо applyWrites=true і є actual diff → робимо один create→get state
   */
  async _syncSlidesWithImages(current, { appId, itemId, fieldId, slidesService, applyWrites = false }) {
    const images = await this._fetchImagesFromGudhub({ appId, itemId, fieldId });

    const byFile = new Map(current.filter(s => s.fileId).map(s => [String(s.fileId), s]));
    const ghSet = new Set(images.map(x => String(x.fileId)));

    // ВИДАЛЕННЯ
    const toRemove = current.filter(m => m.fileId && !ghSet.has(String(m.fileId)));
    if (toRemove.length) {
      const rmIds = new Set(toRemove.map(m => m.id));
      current = current.filter(m => !rmIds.has(m.id));
    }

    // ДОДАВАННЯ
    const toAdd = images.filter(x => !byFile.has(String(x.fileId)));
    if (toAdd.length) {
      const base = current.length;
      for (let i = 0; i < toAdd.length; i++) {
        const { fileId, url } = toAdd[i];
        const id = `slide-${Date.now()}-${i + 1}`;
        let canvasJSON = null;
        try {
          const pre = await generateCanvasPreviewFromUrl(url, {
            width: 1920, height: 1080, marginRatio: 0.10, background: null
          });
          canvasJSON = pre.canvasJSON;
        } catch {}
        current.push({ id, name: `Slide ${base + i + 1}`, bgUrl: url, fileId: String(fileId), canvasJSON });
      }
    }

    const noDiff = toAdd.length === 0 && toRemove.length === 0;

    if (applyWrites && !noDiff) {
      // Побудуємо state з локального current і запишемо його одним create→get
      const metaIndex = current.map(({ id, name, bgUrl, fileId, isCopy, copyOf, copyNumber }) => ({
        id, name: name ?? 'Slide', bgUrl: bgUrl ?? null,
        ...(fileId ? { fileId } : {}),
        ...(isCopy ? { isCopy: true } : {}),
        ...(copyOf ? { copyOf } : {}),
        ...(typeof copyNumber === 'number' ? { copyNumber } : {})
      }));
      const slidesMap = {};
      for (const s of current) {
        if (!s?.id) continue;
        const entry = { id: s.id };
        if (s.canvasJSON) entry.canvasJSON = s.canvasJSON;
        if (s.bgUrl != null) entry.bgUrl = s.bgUrl;
        if (s.fileId != null) entry.fileId = s.fileId;
        if (s.isCopy) entry.isCopy = true;
        if (s.copyOf) entry.copyOf = s.copyOf;
        if (typeof s.copyNumber === 'number') entry.copyNumber = s.copyNumber;
        slidesMap[s.id] = entry;
      }

      const state = await slidesService.replaceStateThenReload({ index: metaIndex, slides: slidesMap }).catch(() => null);
      if (state) {
        const idx = Array.isArray(state.index) ? state.index : [];
        const fresh = [];
        for (const meta of idx) {
          const full = state.slides?.[meta.id] || meta;
          if (full?.id) fresh.push(full);
        }
        current = fresh;
      }
    }

    return current;
  }

  async init() {
    const slideList = this.querySelector('#slideList');
    const previewWrapper = this.querySelector('#previewWrapper');
    const addSlideBtn = this.querySelector('#addSlideBtn');
    const editBtn = this.querySelector('#editBtn');

    const appId  = this.getAttribute('data-app-id')  || '36609';
    const fieldId= this.getAttribute('data-field-id')|| '863613';
    const itemId = this.getAttribute('data-item-id') || '4898526';

    // Один інстанс сервісу
    this.svc = this.svc || new SlidesServiceDM({ appId, fieldId, itemId });
    this._appId = this.svc.appId;
    this._fieldId = this.svc.fieldId;
    this._itemId = this.svc.itemId;

    // 1) Перший рендер — рівно один getDocument
    let slides = await this.svc.loadAllSlidesFromSingleDocument().catch(() => []);

    // 2) Dry-run синхронізації з images (без записів)
    slides = await this._syncSlidesWithImages(slides, {
      appId: this._appId, itemId: this._itemId, fieldId: this._fieldId, slidesService: this.svc, applyWrites: false
    });

    // 3) Запускаємо менеджер
    this.manager = new ViewerManager({
      slideList,
      previewWrapper,
      editBtn,
      storageKey: this.getAttribute('storage-key') || 'slides',
      slidesService: this.svc,
      initialSlidesMeta: slides,
      onSlideSelect: () => {},
      onSlideEdit: (slide) => {
        // Віддаємо ПОВНИЙ слайд у подію (щоб Editor не робив зайвий get)
        this.dispatchEvent(new CustomEvent('edit', {
          bubbles: true, composed: true, detail: { slide }
        }));
      }
    });

    addSlideBtn?.addEventListener('click', () => {
      this.manager.addSlide(); // write→read усередині Manager
    });
  }

  /** Публічна аплікація стану без мережі після успішного save (editor). */
  applyState(state, { select } = {}) {
    if (!state) return;
    const idx = Array.isArray(state.index) ? state.index : [];
    const fresh = [];
    for (const meta of idx) {
      const full = state.slides?.[meta.id] || meta;
      if (full?.id) fresh.push(full);
    }
    this.manager.slides = fresh;
    this.manager.renderSlides();
    const keep = select || this.manager.selectedSlide?.id || this.manager.slides[0]?.id;
    if (keep) this.manager.selectSlide(keep);
  }

  /**
   * Оновлення зі зчитуванням (та опційним записом при sync=true).
   * Використовується при поверненні у вкладку або явному рефреші.
   */
  async refreshSlides({ select, sync = true } = {}) {
    if (this._syncInFlight) return;
    this._syncInFlight = true;
    try {
      let fresh = await this.svc.loadAllSlidesFromSingleDocument().catch(() => []);
      fresh = await this._syncSlidesWithImages(fresh, {
        appId: this._appId, itemId: this._itemId, fieldId: this._fieldId,
        slidesService: this.svc, applyWrites: !!sync
      });

      this.manager.slides = Array.isArray(fresh) ? fresh : [];
      this.manager.renderSlides();

      const keep = select || this.manager.selectedSlide?.id || this.manager.slides[0]?.id;
      if (keep) this.manager.selectSlide(keep);
    } finally {
      this._syncInFlight = false;
    }
  }
}

if (!window.customElements.get('gh-annotations-viewer')) {
  window.customElements.define('gh-annotations-viewer', GhAnnotationsViewer);
}
