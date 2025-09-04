export function renderSlides(slides, container, getHandlers) {
  container.innerHTML = '';
  slides.forEach(slide => {
    const handlers = getHandlers(slide);
    const slideEl = renderPreview(slide, handlers);
    container.appendChild(slideEl);
  });
}

/** Вирахувати, чи слайд копія */
function isCopySlide(slide) {
  return !!(slide?.isCopy || slide?.copyOf);
}

/** Вирахувати, чи слайд порожній (ручний “+”, нічого не збережено) */
function isEmptySlide(slide) {
  if (!slide) return false;
  if (slide.fileId || slide.bgUrl) return false;
  const json = slide.canvasJSON;
  if (!json) return true; // взагалі нічого не збережено
  try {
    const objs = Array.isArray(json.objects) ? json.objects : [];
    return objs.length === 0;
  } catch {
    return true;
  }
}

/**
 * Показує картку слайда в сайдбарі.
 * Мусорка відображається ТІЛЬКИ якщо (копія) АБО (порожній слайд).
 */
export function renderPreview(slide, { onDelete, onDuplicate, onSelect }) {
  const container = document.createElement('div');
  container.className = 'sidebar__slide-preview-container';
  container.dataset.id = slide.id;
  console.log("CONTAINER DATASET ID:", container.dataset.id);

  const title = document.createElement('div');
  title.className = 'sidebar__slide-title';
  title.textContent = slide.name || 'Slide';
  container.appendChild(title);

  const btnWrapper = document.createElement('div');
  btnWrapper.className = 'sidebar__slide-actions slide-actions';

  // Duplicate — завжди доступний
  const duplicateBtn = document.createElement('div');
  duplicateBtn.className = 'slide-actions__duplicate-button';
  duplicateBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="35" height="34" viewBox="0 0 35 34" fill="none">
      <path d="M8.89917 9.43103C9.44529 9.43103 9.88916 9.87422 9.8894 10.4203C9.8894 10.9666 9.44544 11.4105 8.89917 11.4105H8.3728C7.75817 11.4108 7.2577 11.9112 7.25757 12.5258V26.7377C7.25776 27.3522 7.75824 27.8527 8.3728 27.8529H21.532C22.1466 27.8528 22.647 27.3523 22.6472 26.7377V26.2113C22.6472 25.665 23.0912 25.222 23.6375 25.222C24.1836 25.2222 24.6267 25.6651 24.6267 26.2113V26.7377C24.6265 28.4448 23.2392 29.8323 21.532 29.8324H8.3728C6.6657 29.8322 5.27827 28.4448 5.27808 26.7377V12.5258C5.27821 10.8186 6.66568 9.43126 8.3728 9.43103H8.89917Z" fill="#767676" stroke="#767676" stroke-width="0.4"/>
      <path d="M25.7427 4.16751C27.45 4.16753 28.8372 5.55504 28.8374 7.26224V20.4214C28.8373 22.1287 27.45 23.5161 25.7427 23.5161H14.689C12.9818 23.5159 11.5944 22.1286 11.5942 20.4214V7.26224C11.5945 5.55516 12.9819 4.16774 14.689 4.16751H25.7427ZM14.689 6.147C14.0744 6.14724 13.574 6.6477 13.5737 7.26224V20.4214C13.5739 21.036 14.0744 21.5364 14.689 21.5367H25.7427C26.3574 21.5366 26.8578 21.0362 26.8579 20.4214V7.26224C26.8577 6.64753 26.3574 6.14702 25.7427 6.147H14.689Z" fill="#767676" stroke="#767676" stroke-width="0.4"/>
    </svg>
  `;
  duplicateBtn.addEventListener('click', (e) => { e.stopPropagation(); onDuplicate(); });
  btnWrapper.appendChild(duplicateBtn);

  // Delete — лише для копій або порожніх
  if (isCopySlide(slide) || isEmptySlide(slide)) {
    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'slide-actions__delete-button';
    deleteBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="31" height="30" viewBox="0 0 31 30" fill="none">
        <path d="M23.83 8.75C23.4985 8.75 23.1805 8.8817 22.9461 9.11612C22.7117 9.35054 22.58 9.66848 22.58 10V23.9888C22.5442 24.6209 22.26 25.2132 21.7894 25.6367C21.3188 26.0603 20.6999 26.2807 20.0675 26.25H10.0925C9.46013 26.2807 8.84124 26.0603 8.37064 25.6367C7.90004 25.2132 7.61587 24.6209 7.58001 23.9888V10C7.58001 9.66848 7.44831 9.35054 7.21389 9.11612C6.97947 8.8817 6.66153 8.75 6.33001 8.75C5.99849 8.75 5.68055 8.8817 5.44613 9.11612C5.21171 9.35054 5.08001 9.66848 5.08001 10V23.9888C5.11569 25.284 5.66324 26.5124 6.60273 27.4048C7.54223 28.2972 8.7971 28.7809 10.0925 28.75H20.0675C21.3629 28.7809 22.6178 28.2972 23.5573 27.4048C24.4968 26.5124 25.0443 25.284 25.08 23.9888V10C25.08 9.66848 24.9483 9.35054 24.7139 9.11612C24.4795 8.8817 24.1615 8.75 23.83 8.75Z" fill="#767676"/>
        <path d="M25.08 5H20.08V2.5C20.08 2.16848 19.9483 1.85054 19.7139 1.61612C19.4795 1.3817 19.1615 1.25 18.83 1.25H11.33C10.9985 1.25 10.6805 1.3817 10.4461 1.61612C10.2117 1.85054 10.08 2.16848 10.08 2.5V5H5.08001C4.74849 5 4.43055 5.1317 4.19613 5.36612C3.96171 5.60054 3.83001 5.91848 3.83001 6.25C3.83001 6.58152 3.96171 6.89946 4.19613 7.13388C4.43055 7.3683 4.74849 7.5 5.08001 7.5H25.08C25.4115 7.5 25.7295 7.3683 25.9639 7.13388C26.1983 6.89946 26.33 6.58152 26.33 6.25C26.33 5.91848 26.1983 5.60054 25.9639 5.36612C25.7295 5.1317 25.4115 5 25.08 5ZM12.58 5V3.75H17.58V5H12.58Z" fill="#767676"/>
        <path d="M13.83 21.25V12.5C13.83 12.1685 13.6983 11.8505 13.4639 11.6161C13.2295 11.3817 12.9115 11.25 12.58 11.25C12.2485 11.25 11.9305 11.3817 11.6961 11.6161C11.4617 11.8505 11.33 12.1685 11.33 12.5V21.25C11.33 21.5815 11.4617 21.8995 11.6961 22.1339C11.9305 22.3683 12.2485 22.5 12.58 22.5C12.9115 22.5 13.2295 22.3683 13.4639 22.1339C13.6983 21.8995 13.83 21.5815 13.83 21.25Z" fill="#767676"/>
        <path d="M18.83 21.25V12.5C18.83 12.1685 18.6983 11.8505 18.4639 11.6161C18.2295 11.3817 17.9115 11.25 17.58 11.25C17.2485 11.25 16.9305 11.3817 16.6961 11.6161C16.4617 11.8505 16.33 12.1685 16.33 12.5V21.25C16.33 21.5815 16.4617 21.8995 16.6961 22.1339C16.9305 22.3683 17.2485 22.5 17.58 22.5C17.9115 22.5 18.2295 22.3683 18.4639 22.1339C18.6983 21.8995 18.83 21.5815 18.83 21.25Z" fill="#767676"/>
      </svg>
    `;
    deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); onDelete(); });
    btnWrapper.appendChild(deleteBtn);
  }

  container.appendChild(btnWrapper);
  container.addEventListener('click', () => onSelect());
  return container;
}
