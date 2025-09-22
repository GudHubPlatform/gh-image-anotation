class SlidesServiceDM {
  constructor() {
    this._cache = null;
    this._loaded = false;
    this._loadingPromise = null;
  }

  _stripPreview(slides) {
    if (!Array.isArray(slides)) return slides;
    return slides.map(({ previewDataUrl, ...rest }) => rest);
  }

  async getDataWithSlides(documentAddress) {
    if (this._loaded) return this._cache;
    if (this._loadingPromise) return this._loadingPromise;

    this._loadingPromise = (async () => {
      const res = await gudhub.getDocument(documentAddress);
      const data = res?.data ?? null;

      this._cache = this._stripPreview(data);
      this._loaded = true;
      this._loadingPromise = null;
      return this._cache;
    })();

    return this._loadingPromise;
  }

  async createDataWithSlides(documentAddress, slidesData) {
    const payload = { ...documentAddress, data: this._stripPreview(slidesData) };
    const result = await gudhub.createDocument(payload);

    this._cache = this._stripPreview(result?.data ?? null);
    this._loaded = true;
    this._loadingPromise = null;
    return this._cache;
  }
}

export const slidesServiceDM = new SlidesServiceDM();
