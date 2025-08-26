export function setupColorPalette(editor) {
    const preview = editor.root.querySelector('.color-preview');

    editor.root.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            editor.currentColor = btn.getAttribute('data-color');

            if (preview) preview.style.background = editor.currentColor;

            if (editor.canvas?.isDrawingMode) {
                editor.canvas.freeDrawingBrush.color = editor.currentColor;
            } else {
                editor.updateActiveObjectColor(editor.currentColor);
            }
        });
    });

    const customColorInput = editor.root.querySelector('#customColor');
    customColorInput?.addEventListener('input', (e) => {
        editor.currentColor = e.target.value;

        if (preview) preview.style.background = editor.currentColor;

        if (editor.canvas?.isDrawingMode) {
            editor.canvas.freeDrawingBrush.color = editor.currentColor;
        } else {
            editor.updateActiveObjectColor(editor.currentColor);
        }
    });
};
