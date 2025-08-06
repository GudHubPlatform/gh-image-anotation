export function createPageTabsContainer() {
	const container = document.createElement('div');
	container.id = 'pageTabs';
	document.body.appendChild(container);
	return container;
};

export function renderPageTabs(editor) {
  const container = document.querySelector('#pageTabs');
  container.innerHTML = '';

	editor.pages.forEach((_, i) => {
		const tab = document.createElement('div');
		tab.className = 'page-tab' + (i === editor.currentPageIndex ? ' active' : '');
		tab.innerText = `Page ${i + 1}`;
		tab.onclick = () => editor.switchToPage(i);

		if (editor.pages.length > 1) {
			const close = document.createElement('span');
			close.innerText = '×';
			close.className = 'close';
			close.onclick = (e) => {
				e.stopPropagation();
				editor.deletePage(i);
			};
			tab.appendChild(close);
		}

		container.appendChild(tab);
	});
};
