export function clearCanvas(editor) {
	editor.canvas.clear();

	const page = editor.pages[editor.currentPageIndex];
	page.history = [];
	page.redoStack = [];

	editor.saveState();
};

export function saveImage(editor) {
	const svgString = editor.canvas.toSVG();
	const blob = new Blob([svgString], { type: 'image/svg+xml' });
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = 'canvas-image.svg';
	link.click();

	setTimeout(() => {
		URL.revokeObjectURL(link.href);
	}, 100);
};
