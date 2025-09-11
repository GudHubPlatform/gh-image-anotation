import PaintEditor from './PaintEditor.js';
import { slidesServiceDM } from '../../../services/slidesServiceDM.js';

//TODO: Need to remove this gudHub data below
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
  let currentSlideIndex = slides.findIndex(s => s.id === slideId);

  const editor = new PaintEditor();

  if (currentSlideIndex !== -1 && slides[currentSlideIndex].canvasJSON) {
    setTimeout(() => {
      editor.canvas.loadFromJSON(slides[currentSlideIndex].canvasJSON, () => {
        editor.canvas.renderAll();
      });
    }, 100);
  }

  document.getElementById('cancelBtn').addEventListener('click', () => {
    window.location.href = 'slides.html';
  });

  document.getElementById('finalSaveBtn').addEventListener('click', async () => {
    const json = editor.canvas.toJSON();
    const dataUrl = editor.canvas.toDataURL({
      format: "png",
      quality: 1,
      width: 1920,
      height: 1080,
      multiplier: 1
    });

    if (currentSlideIndex !== -1) {
      const slide = slides[currentSlideIndex];
      slide.canvasJSON = json;
      slide.previewDataUrl = dataUrl;

      if (slide.kind === 'empty') {
        slide.kind = 'normal';
        const base = Number.isInteger(slide.baseIndex) ? slide.baseIndex : 1;
        slide.name = `slide-${base}`;
        slide.copyIndex = 0;
      }

      await slidesServiceDM.createDataWithSlides(documentAddress, slides);

      window.location.href = 'slides.html';
    } else {
      alert("Slide not found. Unable to save.");
    }
  });
})();
