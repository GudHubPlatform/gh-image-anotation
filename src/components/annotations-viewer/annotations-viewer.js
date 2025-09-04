import html from './annotations-viewer.html';
import styles from './annotations-viewer.scss';
import { ViewerManager } from './viewer/ViewerManager.js';
import { SlidesServiceDM } from '../../services/slidesServiceDM.js';
import { generateCanvasPreviewFromUrl } from '../../lib/generateCanvasPreviewFromUrl.js';

class GhAnnotationsViewer extends HTMLElement {
  constructor() {
    super();
    this.manager = null;
    this._syncInFlight = false;

    this._appId = null;
    this._fieldId = null;
    this._itemId = null;

    this._onFocus = this._onFocus.bind(this);
  }

  connectedCallback() {
    this.render();
    this.init();
    // коли повертаємось у вкладку — перевіряємо, чи не змінилось поле images
    window.addEventListener('focus', this._onFocus, { passive: true });
  }

  disconnectedCallback() {
    window.removeEventListener('focus', this._onFocus);
  }

  _onFocus() {
    // легкий спосіб оновлювати список, якщо поле images могли змінити ззовні
    this.refreshSlides();
  }

  render() {
    this.innerHTML = `
      <style>${styles}</style>
      ${html}
    `;
  }

  /**
   * Отримати масив { fileId, url } з Gudhub images-поля
   */
  async _fetchImagesFromGudhub({ appId, itemId, fieldId }) {
    let images = [];
    try {
      // 1) значення поля: може бути "1143919,1143920" або ["1143919","1143920"] або "1143919;1143920"
      const rawValue = await gudhub.getFieldValue(appId, itemId, fieldId);

      let idsArray = [];
      if (Array.isArray(rawValue)) {
        idsArray = rawValue.map(String);
      } else if (typeof rawValue === 'string') {
        // спробуємо JSON.parse, якщо це JSON-рядок
        try {
          const parsed = JSON.parse(rawValue);
          if (Array.isArray(parsed)) {
            idsArray = parsed.map(String);
          } else {
            idsArray = String(rawValue)
              .split(/[,\s;]+/) // кома, пробіл або ;
              .map(id => id.trim())
              .filter(Boolean);
          }
        } catch {
          idsArray = String(rawValue)
            .split(/[,\s;]+/)
            .map(id => id.trim())
            .filter(Boolean);
        }
      }

      if (!idsArray.length) return [];

      // 2) getFiles: буває, що очікує числа
      const numericIds = idsArray
        .map(x => Number(x))
        .filter(n => Number.isFinite(n));

      const gudhubFiles = await gudhub.getFiles(appId, numericIds);

      // 3) у відповіді id може бути file_id або id; url може бути url або file_url
      images = (gudhubFiles || [])
        .map(f => {
          const fid = f?.file_id ?? f?.id ?? null;
          const url = f?.url ?? f?.file_url ?? null;
          return fid && url ? { fileId: String(fid), url: String(url) } : null;
        })
        .filter(Boolean);

      // (не обов'язково) прибираємо дублікати за fileId
      const byId = new Map(images.map(x => [x.fileId, x]));
      images = Array.from(byId.values());

      // DEBUG:
      // console.log('GUDHUB FILES:', gudhubFiles);
      // console.log('IMAGES:', images);
    } catch (e) {
      console.error('Failed to fetch images from Gudhub:', e);
    }
    return images;
  }

  /**
   * Синхронізація слайдів з images-полем:
   * - видаляємо слайди з fileId, яких немає у полі
   * - додаємо слайди для нових fileId (ініціалізуємо canvasJSON із bgUrl)
   * - оновлюємо index в одному state-документі
   */
  async _syncSlidesWithImages(current, { appId, itemId, fieldId, slidesService }) {
    const images = await this._fetchImagesFromGudhub({ appId, itemId, fieldId });

    const byFile = new Map(current.filter(s => s.fileId).map(s => [String(s.fileId), s]));
    const ghSet = new Set(images.map(x => String(x.fileId)));

    // 1) ВИДАЛЕННЯ: якщо зображення прибрали з поля — видаляємо відповідний слайд
    const toRemove = current.filter(m => m.fileId && !ghSet.has(String(m.fileId)));
    if (toRemove.length) {
      for (const meta of toRemove) {
        try { await slidesService.hardDelete(meta.id); } catch (_) {}
      }
      const rmIds = new Set(toRemove.map(m => m.id));
      current = current.filter(m => !rmIds.has(m.id));
    }

    // 2) ДОДАВАННЯ: для нових fileId створюємо слайди
    const toAdd = images.filter(x => !byFile.has(String(x.fileId)));
    if (toAdd.length) {
      const base = current.length;
      for (let i = 0; i < toAdd.length; i++) {
        const { fileId, url } = toAdd[i];
        const id = `slide-${Date.now()}-${i + 1}`;

        let canvasJSON = null;
        try {
          // ініціалізуємо початковий канвас із BG зображення
          const pre = await generateCanvasPreviewFromUrl(url, {
            width: 1920, height: 1080, marginRatio: 0.10, background: null
          });
          canvasJSON = pre.canvasJSON;
        } catch (_) {}

        const meta = { id, name: `Slide ${base + i + 1}`, bgUrl: url, fileId: String(fileId) };

        // зберігаємо ПОВНИЙ слайд (без preview PNG) + обновлюємо index
        await slidesService.saveSlideAndIndex({
          slide: { ...meta, canvasJSON },
          updateMeta: true
        }).catch(() => {});

        current.push({ ...meta, canvasJSON });
      }
    }

    // 3) Переписати index (без preview)
    const metaIndex = current.map(({ id, name, bgUrl, fileId }) => ({
      id, name: name ?? 'Slide', bgUrl: bgUrl ?? null, ...(fileId ? { fileId } : {})
    }));
    await slidesService.replaceIndex(metaIndex).catch(() => {});

    return current;
  }

  async init() {
    const slideList = this.querySelector('#slideList');
    const previewWrapper = this.querySelector('#previewWrapper');
    const addSlideBtn = this.querySelector('#addSlideBtn');
    const editBtn = this.querySelector('#editBtn');

    // ваші дефолтні айді (можете винести в атрибути)
    const appId = '36609';
    const fieldId = '863613';
    const itemId = '4898526';

    this._appId = appId;
    this._fieldId = fieldId;
    this._itemId = itemId;

    const storageKey = this.getAttribute('storage-key') || 'slides';
    const slidesService = new SlidesServiceDM({ appId, fieldId, itemId });

    // 1) прочитати всі слайди з одного state-документа
    let slides = await slidesService.loadAllSlidesFromSingleDocument().catch(() => []);

    // 2) синхронізувати з images: ВИДАЛИТИ вилучені, ДОДАТИ нові
    slides = await this._syncSlidesWithImages(slides, { appId, itemId, fieldId, slidesService });

    // 3) запустити менеджер перегляду
    this.manager = new ViewerManager({
      slideList,
      previewWrapper,
      editBtn,
      storageKey,
      slidesService,
      initialSlidesMeta: slides,
      onSlideSelect: () => {},
      onSlideEdit: (slide) => {
        this.dispatchEvent(new CustomEvent('edit', {
          bubbles: true,
          composed: true,
          detail: { slideId: slide.id }
        }));
      }
    });

    addSlideBtn?.addEventListener('click', async () => {
      const added = this.manager.addSlide(); // пустий «ручний» слайд
      await slidesService.saveSlideAndIndex({ slide: added, updateMeta: true }).catch(() => {});
    });
  }

  /**
   * Публічне оновлення: перечитує документ і знову синхронізує з images
   * Викликається:
   *  - при поверненні на вкладку (focus)
   *  - після збереження з редактора (ваш контейнер уже викликає refresh)
   */
  async refreshSlides({ select } = {}) {
    if (this._syncInFlight) return;
    this._syncInFlight = true;
    try {
      const slidesService = new SlidesServiceDM({
        appId: this._appId, fieldId: this._fieldId, itemId: this._itemId
      });

      // перечитати state
      let fresh = await slidesService.loadAllSlidesFromSingleDocument().catch(() => []);
      // ще раз синхронізувати з images (видалення/додавання)
      fresh = await this._syncSlidesWithImages(fresh, {
        appId: this._appId, itemId: this._itemId, fieldId: this._fieldId, slidesService
      });

      // оновити UI
      this.manager.slides = Array.isArray(fresh) ? fresh : [];
      this.manager.renderSlides();

      const keep = select || this.manager.selectedSlide?.id || this.manager.slides[0]?.id;
      if (keep) this.manager.selectSlide(keep);
    } finally {
      this._syncInFlight = false;
    }
  }
}

if (!window.customElements.get('gh-annotations-viewer')) {
  window.customElements.define('gh-annotations-viewer', GhAnnotationsViewer);
}
