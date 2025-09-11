import PaintEditor from './PaintEditor.js';
import { slidesServiceDM } from '../../../services/slidesServiceDM.js';

// TODO: Need to remove this gudHub data below
const appId = '36609';
const fieldId = '863613';
const itemId = '4900015';
const documentAddress = {
  app_id: appId,
  item_id: itemId,
  element_id: fieldId
};

const urlParams = new URLSearchParams(window.location.search);
const slideId = urlParams.get('id');

(async () => {
  let slides = await slidesServiceDM.getDataWithSlides(documentAddress);
  if (!Array.isArray(slides)) slides = [];
  let currentSlideIndex = slides.findIndex(s => s.id === slideId);

  const editor = new PaintEditor();

  if (currentSlideIndex !== -1) {
    const slide = slides[currentSlideIndex];
    if (slide?.bgUrl && typeof editor.setBackgroundImageFromURL === 'function') {
      editor.setBackgroundImageFromURL(slide.bgUrl);
    }
  }

  document.getElementById('cancelBtn').addEventListener('click', () => {
    window.location.href = 'slides.html';
  });

  document.getElementById('finalSaveBtn').addEventListener('click', async () => {
    const dataUrl = editor.canvas.toDataURL({
      format: 'png',
      quality: 1,
      width: 1920,
      height: 1080,
      multiplier: 1
    });

    if (currentSlideIndex !== -1) {
      const prev = slides[currentSlideIndex];

      const parseNumber = (name = '') => {
        const m = String(name).match(/slide-(\d+)/i);
        return m ? parseInt(m[1], 10) : null;
      };
      const n = parseNumber(prev?.name) ?? (currentSlideIndex + 1);

      const newType = prev?.type === 'copy' ? 'copy' : 'normal';
      const newName = newType === 'copy' ? `slide-${n}--copy` : `slide-${n}`;

      slides[currentSlideIndex] = {
        id: prev?.id || `slide-${Date.now()}`,
        name: newName,
        bgUrl: dataUrl,
        previewDataUrl: dataUrl,
        type: newType
      };

      await slidesServiceDM.createDataWithSlides(documentAddress, slides);
      window.location.href = 'slides.html';
    } else {
      alert('Slide not found. Unable to save.');
    }
  });
})();
