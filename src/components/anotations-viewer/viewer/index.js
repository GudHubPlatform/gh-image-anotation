import PaintEditor from './PaintEditor.js';

const urlParams = new URLSearchParams(window.location.search);
const slideId = urlParams.get('id');

let slides = JSON.parse(localStorage.getItem('slides') || '[]');
let currentSlideIndex = slides.findIndex(s => s.id === slideId);

const editor = new PaintEditor();
window.editor = editor;

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

document.getElementById('finalSaveBtn').addEventListener('click', () => {
  const json = editor.canvas.toJSON();
  const dataUrl = editor.canvas.toDataURL({ format: 'png' });

  if (currentSlideIndex !== -1) {
    slides[currentSlideIndex].canvasJSON = json;
    slides[currentSlideIndex].previewDataUrl = dataUrl;

    localStorage.setItem('slides', JSON.stringify(slides));

    window.location.href = 'slides.html';
  } else {
    alert("Slide not found. Unable to save.");
  }
});
