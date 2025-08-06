import { renderSlides, renderPreview } from './ViewerPreview.js';

let slides = [];
let selectedSlide = null;
let refs = {};

export function initSlides({ slideList, previewWrapper, editBtn, onSlideSelect }) {
  refs = { slideList, previewWrapper, editBtn, onSlideSelect };
  slides = loadSlides();
  renderSlides(slides, refs.slideList, handleSlideActions);
  return { slides, selectedSlide };
}

export function saveSlides() {
  localStorage.setItem('slides', JSON.stringify(slides));
}

export function addSlide() {
  const newSlide = createSlide();
  slides.push(newSlide);
  saveSlides();
  renderSlides(slides, refs.slideList, handleSlideActions);
  return newSlide;
}

export function deleteSlide(id) {
  slides = slides.filter(slide => slide.id !== id);
  saveSlides();
  renderSlides(slides, refs.slideList, handleSlideActions);

  if (selectedSlide?.id === id) {
    selectedSlide = null;
    refs.previewWrapper.innerHTML = '';
    refs.editBtn.style.display = 'none';
  }

  return slides;
}

export function duplicateSlide(id) {
  const original = slides.find(s => s.id === id);
  if (!original) return null;

  const copy = {
    ...original,
    id: 'slide-' + Date.now(),
    name: original.name + ' (copy)'
  };

  slides.push(copy);
  saveSlides();
  renderSlides(slides, refs.slideList, handleSlideActions);
  return copy;
}

export function selectSlide(id) {
  const slide = slides.find(s => s.id === id);
  if (!slide) return null;

  selectedSlide = slide;
  renderPreview(slide, refs.previewWrapper);
  refs.editBtn.style.display = 'inline-block';
  refs.onSlideSelect?.(slide);
  return slide;
}

export function loadSlides() {
  return JSON.parse(localStorage.getItem('slides') || '[]');
}

export function createSlide() {
  return {
    id: 'slide-' + Date.now(),
    name: 'Slide',
    canvasJSON: null,
    previewDataUrl: null
  };
}

function handleSlideActions(slide) {
  return {
    onDelete: () => deleteSlide(slide.id),
    onDuplicate: () => duplicateSlide(slide.id),
    onSelect: () => selectSlide(slide.id)
  };
}
