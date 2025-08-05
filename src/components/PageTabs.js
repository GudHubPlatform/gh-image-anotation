export function setupPageTabs(editor) {
    const container = document.getElementById('pageTabs');
    if (!container) return;

    container.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('page-tab')) {
            const index = parseInt(target.getAttribute('data-index'));
            if (!isNaN(index)) {
                editor.switchToPage(index);
            }
        }

        if (target.classList.contains('close')) {
            const index = parseInt(target.parentElement.getAttribute('data-index'));
            if (!isNaN(index)) {
                editor.deletePage(index);
            }
        }
    });
};

export function renderPageTabs(editor) {
    const container = document.getElementById('pageTabs');
    if (!container) return;

    container.innerHTML = '';

    editor.pages.forEach((_, i) => {
        const tab = document.createElement('div');
        tab.className = 'page-tab' + (i === editor.currentPageIndex ? ' active' : '');
        tab.setAttribute('data-index', i);
        tab.innerText = `Page ${i + 1}`;

        if (editor.pages.length > 1) {
            const close = document.createElement('span');
            close.innerText = '×';
            close.className = 'close';
            tab.appendChild(close);
        }

        container.appendChild(tab);
    });
};
