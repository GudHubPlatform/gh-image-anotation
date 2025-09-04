// src/services/slidesServiceDM.js

// -------- helpers ------------------------------------------------------------

/**
 * Безпечно дістає state з документа GudHub і розпаковує "матрьошку",
 * якщо в data випадково поклали цілий "конверт" документа.
 * Повертає об'єкт виду: { index: [], slides: {} }
 */
function parseDataSafe(doc) {
  let raw = doc?.data;

  // Якщо бек повертає рядок — парсимо
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = null; }
  }

  // РОЗПАКОВКА "КОНВЕРТІВ":
  // Поки бачимо структуру типу { app_id?, element_id?, item_id?, data }, заходимо у data.
  // Це виправляє ситуацію, коли в data випадково клали весь документ.
  while (
    raw &&
    typeof raw === 'object' &&
    raw.data &&
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

const DEFAULT_STATE = Object.freeze({
  index: [],
  slides: {}
});

/**
 * Прибирає "мертві"/видалені елементи з state, щоб не роздувати документ.
 */
function normalizeState(state) {
  const idx = Array.isArray(state.index) ? state.index : [];
  const keepIds = new Set(idx.filter(m => !m?.deleted).map(m => m.id));

  const nextIndex = idx.filter(m => keepIds.has(m.id));
  const srcSlides = state.slides || {};
  const nextSlides = {};

  for (const id of Object.keys(srcSlides)) {
    if (keepIds.has(id)) nextSlides[id] = srcSlides[id];
  }

  state.index = nextIndex;
  state.slides = nextSlides;
  return state;
}

// -------- service ------------------------------------------------------------

export class SlidesServiceDM {
  constructor({ appId, fieldId, itemId }) {
    if (!appId || !fieldId || !itemId) {
      throw new Error('SlidesServiceDM: appId, fieldId, itemId are required');
    }
    this.appId = parseInt(appId, 10);
    this.fieldId = parseInt(fieldId, 10);
    this.itemId = parseInt(itemId, 10);

    this.document = null;
  }

  // --- I/O з єдиним state-документом ----------------------------------------

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

    // ВАЖЛИВО: у data — ТІЛЬКИ чистий state (index/slides), без обгорток
    return gudhub.createDocument({
      app_id: this.appId,
      element_id: this.fieldId,
      item_id: this.itemId,
      data: cleaned
    });
  }

  // --- API індексу/слайдів (сумісно з існуючим кодом) -----------------------

  async loadIndex() {
    const s = await this._readState();
    return s.index;
  }

  async saveIndex(slidesMeta) {
    const s = await this._readState();
    s.index = Array.isArray(slidesMeta) ? slidesMeta : [];
    return this._writeState(s);
  }

  async replaceIndex(slidesMeta) {
    const s = await this._readState();
    s.index = Array.isArray(slidesMeta) ? slidesMeta : [];
    return this._writeState(s);
  }

  async getSlide(slideId) {
    const s = await this._readState();
    return s.slides?.[slideId] || null;
  }

  async upsertSlide(slide) {
    const s = await this._readState();
    if (!s.slides) s.slides = {};
    const merged = { ...(s.slides[slide.id] || {}), ...slide };

    // Не зберігаємо preview у state, якщо його не передали явно
    if (!Object.prototype.hasOwnProperty.call(slide, 'previewDataUrl')) {
      delete merged.previewDataUrl;
    }

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

  /**
   * Зберігає повний слайд і, за потреби, оновлює метадані в index.
   * НЕ кладемо previewDataUrl у документ (якщо його не передали явно).
   */
  async saveSlideAndIndex({ slide, updateMeta }) {
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

      if (i === -1) idx.push(nextMeta);
      else idx[i] = { ...idx[i], ...nextMeta };

      s.index = idx;
    }

    return this._writeState(s);
  }

  /**
   * Повертає масив повних слайдів із одного state-документа
   * (поєднує index і slides).
   */
  async loadAllSlidesFromSingleDocument() {
    const s = await this._readState();
    const index = Array.isArray(s.index) ? s.index : [];
    const out = [];
    for (const meta of index) {
      const full = s.slides?.[meta.id] || meta;
      if (full?.id) out.push(full);
    }
    return out;
  }
}
