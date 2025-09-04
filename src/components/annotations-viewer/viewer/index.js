import PaintEditor from './PaintEditor.js';
import { SlidesServiceDM } from '../../../services/slidesServiceDM.js';

const urlParams = new URLSearchParams(window.location.search);
const slideId = urlParams.get('id');

const appId = '36609';
const fieldId = '863613';
const itemId = '4898085';

const svc = new SlidesServiceDM({ appId, fieldId, itemId });
let slides = await svc.loadIndex();
let currentSlideIndex = slides.findIndex(s => s.id === slideId);

const editor = new PaintEditor();

if (currentSlideIndex !== -1) {
  const full = await svc.getSlide(slideId).catch(() => null);
  if (full?.canvasJSON) {
    setTimeout(() => {
      editor.canvas.loadFromJSON(full.canvasJSON, () => editor.canvas.renderAll());
    }, 100);
  }
}

document.getElementById('cancelBtn').addEventListener('click', () => {
  window.location.href = 'slides.html';
});

document.getElementById('finalSaveBtn').addEventListener('click', () => {
  const json = editor.canvas.toJSON();

  (async () => {
    if (currentSlideIndex !== -1) {
      const meta = slides[currentSlideIndex];
      await svc.upsertSlide({ ...meta, canvasJSON: json });
      await svc.saveIndex(slides);
      window.location.href = 'slides.html';
    } else {
      alert("Slide not found. Unable to save.");
    }
  })();
});
