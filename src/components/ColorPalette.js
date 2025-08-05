export function setupColorPalette(editor) {
	document.querySelectorAll('.color-btn').forEach(btn => {
		btn.addEventListener('click', () => {
		editor.currentColor = btn.getAttribute('data-color');
		if (editor.canvas?.isDrawingMode) {
			editor.canvas.freeDrawingBrush.color = editor.currentColor;
		} else {
			editor.updateActiveObjectColor(editor.currentColor);
		}
		});
	});

	document.getElementById('customColor')?.addEventListener('input', (e) => {
		editor.currentColor = e.target.value;
		if (editor.canvas?.isDrawingMode) {
			editor.canvas.freeDrawingBrush.color = editor.currentColor;
		} else {
			editor.updateActiveObjectColor(editor.currentColor);
		}
	});
};
