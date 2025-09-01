const SCHEMA_VERSION = 1;

function parseData(doc) {
  const raw = doc?.data;
  if (raw == null) return null;
  return (typeof raw === 'string') ? JSON.parse(raw) : raw;
}

export class SlidesServiceDM {
  /**
   * @param {{ appId: string|number, fieldId: string|number, gudhub: any }}
   */
  constructor({ appId, fieldId, itemId, gudhub }) {
    if (!appId || !fieldId || !itemId || !gudhub) throw new Error('SlidesServiceDM: appId, fieldId, gudhub are required');
    this.appId = String(appId);
    this.fieldId = String(fieldId);
    this.itemId = String(itemId);
    this.gh = gudhub;
    this._saveMutex = Promise.resolve();
  }

  async _get() {
    try {
      const doc = await this.gh.getDocument({
        app_id: this.appId, element_id: this.fieldId, item_id: this.itemId
      });
      return parseData(doc);
    } catch {
      return null;
    }
  }

  async _set(data) {
    this._saveMutex = this._saveMutex.then(() =>
      this.gh.createDocument({
        app_id: this.appId, element_id: this.fieldId, item_id: this.itemId, data
      })
    );
    return this._saveMutex;
  }

  async loadIndex() {
    const arr = await this._get();
    return Array.isArray(arr) ? arr : [];
  }

  async saveIndex(slidesMeta) {
    return this._set(slidesMeta);
  }

  async getSlide(slideId) {
    const s = await this._get(slideId);
    if (!s) return null;
    if (!('schemaVersion' in s)) s.schemaVersion = SCHEMA_VERSION;
    return s;
  }

  async upsertSlide(slide) {
    const safe = { schemaVersion: SCHEMA_VERSION, ...slide };
    return this._set(slide.id, safe);
  }

  async softDelete(slideId) {
    const idx = await this.loadIndex();
    const next = idx.filter(s => s.id !== slideId);
    await this.saveIndex(next);
    await this.upsertSlide({ id: slideId, deleted: true });
  }

  createEmptyMeta() {
    return { id: 'slide-' + Date.now(), name: 'Slide', previewDataUrl: null, bgUrl: null };
  }
}
