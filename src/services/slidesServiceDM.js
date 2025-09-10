class SlidesServiceDM {
  constructor() {
    this._cache = null;
    this._loaded = false;
  }

  async getDataWithSlides(documentAddress) {
    if (this._loaded) return this._cache;

    const documentManagerResponse = await gudhub.getDocument(documentAddress);
    console.log("getDataWithSlides:", documentManagerResponse?.data);
    
    this._cache = documentManagerResponse?.data ?? null;
    this._loaded = true;
    return this._cache;
  }

  async createDataWithSlides(documentAddress, slidesData) {
    const slidesDataForDocumentManager = { ...documentAddress, data: slidesData };
    const resultDataFromDocumentManager = await gudhub.createDocument(slidesDataForDocumentManager);
    console.log("createDataWithSlides:", resultDataFromDocumentManager);

    this._cache = resultDataFromDocumentManager?.data ?? null;
    this._loaded = true;
    return this._cache;
  }

  // clearData() {
  //   this._cache = null;
  //   this._loaded = false;
  // }
}

export const slidesServiceDM = new SlidesServiceDM();
