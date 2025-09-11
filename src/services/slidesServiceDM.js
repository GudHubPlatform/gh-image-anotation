class SlidesServiceDM {
  constructor() {
    this._cache = null;
    this._loaded = false;
    this._loadingPromise = null;
  }

  async getDataWithSlides(documentAddress) {
    if (this._loaded) return this._cache;
    if (this._loadingPromise) return this._loadingPromise;

    this._loadingPromise = (async () => {
      const documentManagerResponse = await gudhub.getDocument(documentAddress);
      const data = documentManagerResponse?.data ?? null;
      console.log("getDataWithSlides:", data);

      this._cache = data;
      this._loaded = true;
      this._loadingPromise = null;
      return this._cache;
    })();

    return this._loadingPromise;
  }

  async createDataWithSlides(documentAddress, slidesData) {
    const payload = { ...documentAddress, data: slidesData };
    const result = await gudhub.createDocument(payload);
    console.log("createDataWithSlides:", result);

    this._cache = result?.data ?? null;
    this._loaded = true;
    this._loadingPromise = null;
    return this._cache;
  }

  // clearData() {
  //   this._cache = null;
  //   this._loaded = false;
  //   this._loadingPromise = null;
  // }
}

export const slidesServiceDM = new SlidesServiceDM();
