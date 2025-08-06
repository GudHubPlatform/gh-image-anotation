export function initPages(editor) {
    return [];
};

export function addPage(editor) {
    const canvasWrapper = document.querySelector('#canvasWrapper');

    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'canvas-page';
    pageWrapper.style.display = 'none';

    const canvasEl = document.createElement('canvas');
    canvasEl.width = 1200;
    canvasEl.height = 700;

    pageWrapper.appendChild(canvasEl);
    canvasWrapper.appendChild(pageWrapper);

    const newCanvas = new fabric.Canvas(canvasEl, { selection: true });

    editor.pages.push({
        canvas: newCanvas,
        element: canvasEl,
        wrapper: pageWrapper,
        history: [],
        redoStack: []
    });

    switchToPage(editor, editor.pages.length - 1);
    renderPageTabs(editor);
};

export function switchToPage(editor, index) {
    if (editor.currentPageIndex !== -1 && editor.pages[editor.currentPageIndex]) {
        editor.pages[editor.currentPageIndex].wrapper.style.display = 'none';
    }

    editor.currentPageIndex = index;
    const currentPage = editor.pages[index];

    editor.setCanvas(currentPage.canvas);
    currentPage.wrapper.style.display = 'block';
    editor.canvas.renderAll();

    editor.canvas.isDrawingMode = editor.isDrawingMode;
    if (editor.isDrawingMode) {
        editor.canvas.freeDrawingBrush.color = editor.currentColor;
    }

    editor.canvas.defaultCursor = editor.isTextInsertMode || editor.isDrawingArrow ? 'crosshair' : 'default';

    renderPageTabs(editor);
};

export function renderPageTabs(editor) {
    const container = document.querySelector('#pageTabs');
    container.innerHTML = '';

    editor.pages.forEach((_, i) => {
        const tab = document.createElement('div');
        tab.className = 'page-tab' + (i === editor.currentPageIndex ? ' active' : '');
        tab.innerText = `Page ${i + 1}`;
        tab.onclick = () => switchToPage(editor, i);

        if (editor.pages.length > 1) {
            const close = document.createElement('span');
            close.innerText = '×';
            close.className = 'close';
            close.onclick = (e) => {
                e.stopPropagation();
                deletePage(editor, i);
            };
            tab.appendChild(close);
        }

        container.appendChild(tab);
    });
};

export function deletePage(editor, index) {
    if (editor.pages.length <= 1) {
        alert('At least one page must remain.');
        return;
    }

    const page = editor.pages[index];

    page.canvas.dispose();
    page.wrapper.remove();

    editor.pages.splice(index, 1);

    if (editor.currentPageIndex === index) {
        editor.currentPageIndex = index === 0 ? 0 : index - 1;
    } else if (index < editor.currentPageIndex) {
        editor.currentPageIndex--;
    }

    switchToPage(editor, editor.currentPageIndex);
    renderPageTabs(editor);
};
