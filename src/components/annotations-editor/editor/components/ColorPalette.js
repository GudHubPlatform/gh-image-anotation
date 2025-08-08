export function setupColorPalette(editor) {
	editor.root.querySelectorAll('.color-btn').forEach(btn => {
		btn.addEventListener('click', () => {
		editor.currentColor = btn.getAttribute('data-color');
		if (editor.canvas?.isDrawingMode) {
			editor.canvas.freeDrawingBrush.color = editor.currentColor;
		} else {
			editor.updateActiveObjectColor(editor.currentColor);
		}
		});
	});

	editor.root.querySelector('#customColor')?.addEventListener('input', (e) => {
		editor.currentColor = e.target.value;
		if (editor.canvas?.isDrawingMode) {
			editor.canvas.freeDrawingBrush.color = editor.currentColor;
		} else {
			editor.updateActiveObjectColor(editor.currentColor);
		}
	});
};
