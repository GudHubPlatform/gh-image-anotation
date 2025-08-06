export function renderSlides(slides, container, getHandlers) {
  container.innerHTML = '';

  slides.forEach(slide => {
    const handlers = getHandlers(slide);
    const slideEl = renderPreview(slide, handlers);
    container.appendChild(slideEl);
  });
}

export function renderPreview(slide, { onDelete, onDuplicate, onSelect }) {
  const container = document.createElement('div');
  container.className = 'slide-preview-container';

  if (slide.previewDataUrl) {
    const img = document.createElement('img');
    img.src = slide.previewDataUrl;
    container.appendChild(img);
  } else {
    container.innerHTML = '<p>No preview available</p>';
  }

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑️';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onDelete();
  });

  const duplicateBtn = document.createElement('button');
  duplicateBtn.textContent = '📋';
  duplicateBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onDuplicate();
  });

  container.appendChild(deleteBtn);
  container.appendChild(duplicateBtn);

  container.addEventListener('click', () => {
    onSelect();
  });

  return container;
}
