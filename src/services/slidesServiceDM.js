function parseDataSafe(doc) {
  const raw = doc?.data;
  if (raw == null) return { index: [], slides: {} };
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return { index: [], slides: {} }; }
  }
  return raw;
}

const DEFAULT_STATE = Object.freeze({
  index: [],
  slides: {}
});

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

export class SlidesServiceDM {
  constructor({ appId, fieldId, itemId }) {
    if (!appId || !fieldId || !itemId) {
      throw new Error('SlidesServiceDM: appId, fieldId, itemId are required');
    }
    this.appId = parseInt(appId, 10);
    this.fieldId = parseInt(fieldId, 10);
    this.itemId = parseInt(itemId, 10);
  }

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
    s.slides[slide.id] = { ...(s.slides[slide.id] || {}), ...slide };
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
    return { id: 'slide-' + Date.now(), name: 'Slide', previewDataUrl: null, bgUrl: null };
  }

  async saveSlideAndIndex({ slide, updateMeta }) {
    const s = await this._readState();
    if (!s.slides) s.slides = {};
    s.slides[slide.id] = { ...(s.slides[slide.id] || {}), ...slide };

    if (updateMeta) {
      const idx = Array.isArray(s.index) ? s.index : [];
      const i = idx.findIndex(m => m.id === slide.id);
      const nextMeta = {
        id: slide.id,
        name: slide.name ?? 'Slide',
        previewDataUrl: slide.previewDataUrl ?? null,
        bgUrl: slide.bgUrl ?? null,
        ...(slide.fileId ? { fileId: slide.fileId } : {}),
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
}
