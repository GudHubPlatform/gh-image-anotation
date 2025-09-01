import PaintEditor from './PaintEditor.js';
import { SlidesServiceDM } from './services/slidesServiceDM.js';

const urlParams = new URLSearchParams(window.location.search);
const slideId = urlParams.get('id');
const appId = urlParams.get('app');
const fieldId = urlParams.get('field');
const itemId = urlParams.get('item');

// const appId = '36609';
// const fieldId = '863613';
// const itemId = '4368318';

// let slides = JSON.parse(localStorage.getItem('slides') || '[]');
// let currentSlideIndex = slides.findIndex(s => s.id === slideId);
const svc = new SlidesServiceDM({ appId, fieldId, itemId, gudhub });
let slides = await svc.loadIndex();
let currentSlideIndex = slides.findIndex(s => s.id === slideId);

const editor = new PaintEditor();

// if (currentSlideIndex !== -1 && slides[currentSlideIndex].canvasJSON) {
//   setTimeout(() => {
//     editor.canvas.loadFromJSON(slides[currentSlideIndex].canvasJSON, () => {
//       editor.canvas.renderAll();
//     });
//   }, 100);
// }

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
  const dataUrl = editor.canvas.toDataURL({
    format: "png",
    quality: 1,
    width: 1920,
    height: 1080,
    multiplier: 1
  });

  // if (currentSlideIndex !== -1) {
  //   slides[currentSlideIndex].canvasJSON = json;
  //   slides[currentSlideIndex].previewDataUrl = dataUrl;

  //   localStorage.setItem('slides', JSON.stringify(slides));

  //   window.location.href = 'slides.html';
  // } else {
  //   alert("Slide not found. Unable to save.");
  // }

  (async () => {
    if (currentSlideIndex !== -1) {
      const meta = slides[currentSlideIndex];
      slides[currentSlideIndex] = { ...meta, previewDataUrl: dataUrl };
      await svc.upsertSlide({ ...meta, previewDataUrl: dataUrl, canvasJSON: json });
      await svc.saveIndex(slides);
      window.location.href = 'slides.html';
    } else {
      alert("Slide not found. Unable to save.");
    }
  })();
});
