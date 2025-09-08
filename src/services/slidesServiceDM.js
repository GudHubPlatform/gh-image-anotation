class SlidesServiceDM {
  constructor() {
    this._cacheData = null;
    console.log("[SlidesServiceDM] Initialized with empty cache");
  }

  getDataWithSlides() {
    console.log("[SlidesServiceDM] getDataWithSlides called");
    console.log("  loadedData:", this._cacheData);
    return this._cacheData;
  }

  createDataWithSlides(slidesData) {
    this._cacheData = slidesData;

    console.log("[SlidesServiceDM] createDataWithSlides called");
    console.log("  savedData:", slidesData);
  }

  clearData() {
    this._cacheData = null;
    console.log("[SlidesServiceDM] clearData called, cache cleared");
  }
}

export const slidesServiceDM = new SlidesServiceDM();
