class SlidesServiceDM {
  constructor() {
    this._cache = null;
    this._loaded = false;
  }

  async getDataWithSlides({ appId, fieldId, itemId }) {
    if (this._loaded) return this._cache;

    const data = await gudhub.getDocument(appId, fieldId, itemId);
    this._cache = data ?? null;
    this._loaded = true;
    return this._cache;
  }

  async createDataWithSlides({ appId, fieldId, itemId }, slidesData) {
    const resultDataFromDocumentManager = await gudhub.createDocument(appId, fieldId, itemId, slidesData);
    console.log("resultDataFromDocumentManager:", resultDataFromDocumentManager);

    this._cache = slidesData ?? null;
    this._loaded = true;
    return this._cache;
  }

  clearData() {
    this._cache = null;
    this._loaded = false;
  }
}

export const slidesServiceDM = new SlidesServiceDM();
