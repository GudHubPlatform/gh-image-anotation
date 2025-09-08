// src/services/SlidesService.js
import GudHub from '@gudhub/core';

/**
 * Простіший сервіс для роботи зі слайдами.
 * - В пам'яті тримає увесь стан (index + slides)
 * - Завантаження: 1 запит getDocument
 * - Будь-яка зміна: 1 запит createDocument з усіма слайдами
 * - Працює або з переданим gudhubInstance, або створює свій через authKey
 */
export default class SlidesService {
  constructor({ authKey, app_id, element_id, item_id, storageKey = 'slides', gudhubInstance } = {}) {
    this._addr = {
      app_id: Number(app_id),
      element_id: Number(element_id),
      item_id: Number(item_id),
    };
    this._storageKey = storageKey;
    this._cache = { index: [], slides: {} };
    this._ready = false;

    if (gudhubInstance) {
      this._ghPromise = Promise.resolve(gudhubInstance);
    } else if (authKey) {
      this._ghPromise = (async () => new GudHub(authKey))();
    } else {
      throw new Error('SlidesService: provide either gudhubInstance or authKey');
    }
  }

  // ------------ helpers ------------
  _normalizeData(data) {
    if (!data) return { index: [], slides: {} };
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch { return { index: [], slides: {} }; }
    }
    return data;
  }

  _stringifyData() {
    return JSON.stringify(this._cache);
  }

  // ------------ public API ------------
  async load() {
    const gh = await this._ghPromise;
    try {
      const doc = await gh.getDocument(this._addr); // 1) стартове завантаження
      this._cache = this._normalizeData(doc?.data);
    } catch {
      // документа може ще не бути
      this._cache = { index: [], slides: {} };
    }
    this._ready = true;
    return this.getAllSlides();
  }

  isReady() {
    return this._ready;
  }

  getAllSlides() {
    return this._cache.index.map(({ id }) => this._cache.slides[id]).filter(Boolean);
  }

  getSlide(id) {
    return this._cache.slides[id] || null;
  }

  addSlide(initial = {}) {
    const id = initial.id || `slide-${Date.now()}`;
    const slide = {
      id,
      name: initial.name || 'Slide',
      canvasJSON: initial.canvasJSON ?? null,
      previewDataUrl: initial.previewDataUrl ?? null,
      bgUrl: initial.bgUrl ?? null,
    };
    this._cache.slides[id] = slide;
    if (!this._cache.index.find((x) => x.id === id)) {
      this._cache.index.push({ id, name: slide.name });
    }
    return slide;
  }

  updateSlide(id, patch) {
    const s = this._cache.slides[id];
    if (!s) return null;
    Object.assign(s, patch);
    if (patch.name) {
      const idx = this._cache.index.find((i) => i.id === id);
      if (idx) idx.name = patch.name;
    }
    return s;
  }

  duplicateSlide(id) {
    const orig = this._cache.slides[id];
    if (!orig) return null;
    const copy = { ...orig, id: `slide-${Date.now()}`, name: `${orig.name} (copy)` };
    this._cache.slides[copy.id] = copy;
    const i = this._cache.index.findIndex((x) => x.id === id);
    this._cache.index.splice(i + 1, 0, { id: copy.id, name: copy.name });
    return copy;
  }

  deleteSlide(id) {
    delete this._cache.slides[id];
    this._cache.index = this._cache.index.filter((x) => x.id !== id);
  }

  /**
   * 1 запит на бекенд з усім станом слайдів
   */
  async persist() {
    const gh = await this._ghPromise;
    const payload = {
      ...this._addr,
      data: this._cache, // зберігаємо увесь набір
    };
    return gh.createDocument(payload);
  }
}
