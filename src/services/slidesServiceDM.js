// src/services/slidesServiceDM.js

/**
 * Безпечно дістає state з документа GudHub і розпаковує "матрьошку",
 * якщо в data випадково поклали весь документ. Повертає { index: [], slides: {} }.
 */
function parseDataSafe(doc) {
  let raw = doc?.data;

  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = null; }
  }

  // Розпакування вкладених "конвертів"
  while (
    raw && typeof raw === 'object' && raw.data &&
    (Object.prototype.hasOwnProperty.call(raw, 'app_id') ||
     Object.prototype.hasOwnProperty.call(raw, 'element_id') ||
     Object.prototype.hasOwnProperty.call(raw, 'item_id'))
  ) {
    raw = typeof raw.data === 'string'
      ? (() => { try { return JSON.parse(raw.data); } catch { return raw.data; } })()
      : raw.data;
  }

  if (!raw || typeof raw !== 'object') return { index: [], slides: {} };

  const index = Array.isArray(raw.index) ? raw.index : [];
  const slides = raw.slides && typeof raw.slides === 'object' ? raw.slides : {};
  return { index, slides };
}

const DEFAULT_STATE = Object.freeze({ index: [], slides: {} });

/** Прибирає видалені елементи, щоб не роздувати документ. */
function normalizeState(state) {
  const idx = Array.isArray(state.index) ? state.index : [];
  const keepIds = new Set(idx.filter(m => !m?.deleted).map(m => m.id));

  state.index = idx.filter(m => keepIds.has(m.id));
  const srcSlides = state.slides || {};
  const nextSlides = {};
  for (const id of Object.keys(srcSlides)) {
    if (keepIds.has(id)) nextSlides[id] = srcSlides[id];
  }
  state.slides = nextSlides;
  return state;
}

export class SlidesServiceDM {
  constructor({ appId, fieldId, itemId }) {
    if (!appId || !fieldId || !itemId) {
      throw new Error('SlidesServiceDM: appId, fieldId, itemId are required');
    }
    this.appId = parseInt(appId, 10);
    this.fieldId = parseInt(fieldId, 10);
    this.itemId = parseInt(itemId, 10);

    // Проста серіалізація I/O-операцій (mutex через Promise)
    this._op = Promise.resolve();
  }

  _enqueue(fn) {
    this._op = this._op.then(fn, fn);
    return this._op;
  }

  // ---------------- low-level I/O з єдиним state-документом -----------------

  async _readState() {
    const doc = await gudhub.getDocument({
      app_id: this.appId,
      element_id: this.fieldId,
      item_id: this.itemId
    }).catch(() => null);

    const data = parseDataSafe(doc);
    return { ...DEFAULT_STATE, ...data };
  }

  async _writeState(state) {
    const cleaned = normalizeState({ ...state });
    return gudhub.createDocument({
      app_id: this.appId,
      element_id: this.fieldId,
      item_id: this.itemId,
      data: cleaned
    });
  }

  // ---------------- базові методи (зворотна сумісність) ---------------------

  async loadIndex()       { return (await this._readState()).index; }
  async replaceIndex(arr) { const s = await this._readState(); s.index = Array.isArray(arr) ? arr : []; return this._writeState(s); }
  async saveIndex(arr)    { return this.replaceIndex(arr); }

  async getSlide(slideId) {
    const s = await this._readState();
    return s.slides?.[slideId] || null;
  }

  async upsertSlide(slide) {
    const s = await this._readState();
    if (!s.slides) s.slides = {};
    const merged = { ...(s.slides[slide.id] || {}), ...slide };
    if (!Object.prototype.hasOwnProperty.call(slide, 'previewDataUrl')) delete merged.previewDataUrl;
    s.slides[slide.id] = merged;
    return this._writeState(s);
  }

  async softDelete(slideId) {
    const s = await this._readState();
    s.index = (s.index || []).filter(m => m.id !== slideId);
    if (!s.slides) s.slides = {};
    s.slides[slideId] = { ...(s.slides[slideId] || {}), id: slideId, deleted: true };
    return this._writeState(s);
  }

  async hardDelete(slideId) {
    const s = await this._readState();
    s.index = (s.index || []).filter(m => m.id !== slideId);
    if (s.slides) delete s.slides[slideId];
    return this._writeState(s);
  }

  createEmptySlide() {
    return { id: 'slide-' + Date.now(), name: 'Slide', bgUrl: null, canvasJSON: null };
  }

  async saveSlideAndIndex({ slide, updateMeta }) {
    const s = await this._readState();
    if (!s.slides) s.slides = {};
    const merged = { ...(s.slides[slide.id] || {}), ...slide };
    if (!Object.prototype.hasOwnProperty.call(slide, 'previewDataUrl')) delete merged.previewDataUrl;
    s.slides[slide.id] = merged;

    if (updateMeta) {
      const idx = Array.isArray(s.index) ? s.index : [];
      const i = idx.findIndex(m => m.id === slide.id);
      const base = i === -1 ? {} : idx[i];
      const next = {
        id: slide.id,
        name: slide.name ?? base.name ?? 'Slide',
        bgUrl: (Object.prototype.hasOwnProperty.call(slide, 'bgUrl') ? slide.bgUrl : base.bgUrl ?? null),
        ...(slide.fileId ? { fileId: slide.fileId } : (base.fileId ? { fileId: base.fileId } : {})),
        ...(slide.isCopy ? { isCopy: true } : {}),
        ...(slide.copyOf ? { copyOf: slide.copyOf } : {}),
        ...(typeof slide.copyNumber === 'number' ? { copyNumber: slide.copyNumber } : {})
      };
      if (i === -1) idx.push(next); else idx[i] = { ...idx[i], ...next };
      s.index = idx;
    }
    return this._writeState(s);
  }

  async loadAllSlidesFromSingleDocument() {
    const s = await this._readState();
    const idx = Array.isArray(s.index) ? s.index : [];
    const out = [];
    for (const meta of idx) {
      const full = s.slides?.[meta.id] || meta;
      if (full?.id) out.push(full);
    }
    return out;
  }

  // ---------------- нові transactional «write → read» -----------------------

  async saveIndexThenReload(slidesMeta) {
    return this._enqueue(async () => {
      const s = await this._readState();
      s.index = Array.isArray(slidesMeta) ? slidesMeta : [];
      await this._writeState(s);      // create
      return this._readState();       // get
    });
  }

  async saveSlideAndIndexThenReload({ slide, updateMeta, insertAfterId }) {
    return this._enqueue(async () => {
      const s = await this._readState();
      if (!s.slides) s.slides = {};

      const merged = { ...(s.slides[slide.id] || {}), ...slide };
      if (!Object.prototype.hasOwnProperty.call(slide, 'previewDataUrl')) {
        delete merged.previewDataUrl;
      }
      s.slides[slide.id] = merged;

      if (updateMeta) {
        const idx = Array.isArray(s.index) ? s.index : [];
        const i = idx.findIndex(m => m.id === slide.id);
        const baseMeta = i === -1 ? {} : idx[i];

        const nextMeta = {
          id: slide.id,
          name: slide.name ?? baseMeta.name ?? 'Slide',
          bgUrl: (Object.prototype.hasOwnProperty.call(slide, 'bgUrl') ? slide.bgUrl : baseMeta.bgUrl ?? null),
          ...(slide.fileId ? { fileId: slide.fileId } : (baseMeta.fileId ? { fileId: baseMeta.fileId } : {})),
          ...(slide.isCopy ? { isCopy: true } : {}),
          ...(slide.copyOf ? { copyOf: slide.copyOf } : {}),
          ...(typeof slide.copyNumber === 'number' ? { copyNumber: slide.copyNumber } : {})
        };

        if (i === -1) {
          // новий слайд: вставляємо відразу після insertAfterId (якщо задано)
          if (insertAfterId) {
            const pos = idx.findIndex(m => m.id === insertAfterId);
            if (pos !== -1) idx.splice(pos + 1, 0, nextMeta);
            else idx.push(nextMeta);
          } else {
            idx.push(nextMeta);
          }
        } else {
          // оновлення існуючого
          idx[i] = { ...idx[i], ...nextMeta };
        }

        s.index = idx;
      }

      await this._writeState(s);          // createDocument
      return this._readState();           // getDocument
    });
  }

  async hardDeleteThenReload(slideId) {
    return this._enqueue(async () => {
      const s = await this._readState();
      s.index = (s.index || []).filter(m => m.id !== slideId);
      if (s.slides) delete s.slides[slideId];
      await this._writeState(s);      // create
      return this._readState();       // get
    });
  }

  /** Повністю замінити state одним create → get. */
  async replaceStateThenReload({ index, slides }) {
    return this._enqueue(async () => {
      const next = {
        index: Array.isArray(index) ? index : [],
        slides: slides && typeof slides === 'object' ? slides : {}
      };
      await this._writeState(next);   // create
      return this._readState();       // get
    });
  }
}
