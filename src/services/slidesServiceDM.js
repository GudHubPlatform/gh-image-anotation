class SlidesServiceDM {
  constructor() {
    this._cacheData = null;
  }

  getDataWithSlides(storageKey) {
    const gudHubDocumentData = JSON.parse(localStorage.getItem(storageKey) || '[]');
    this._cacheData = gudHubDocumentData;
  }

  createDataWithSlides(storageKey, slidesData) {
    localStorage.setItem(storageKey, JSON.stringify(slidesData));
    this._cacheData = slidesData;
  }
}

export const slidesServiceDM = new SlidesServiceDM();
