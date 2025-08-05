export function setupToolbar(editor) {
    document.getElementById('btn-undo')?.addEventListener('click', () => editor.undo());
    document.getElementById('btn-redo')?.addEventListener('click', () => editor.redo());
    document.getElementById('btn-clear')?.addEventListener('click', () => editor.clearCanvas());
    document.getElementById('btn-save')?.addEventListener('click', () => editor.saveImage());
    document.getElementById('btn-text')?.addEventListener('click', () => editor.addText());
    document.getElementById('btn-arrow')?.addEventListener('click', () => editor.addArrow());
    document.getElementById('btn-link')?.addEventListener('click', () => editor.addLink());
    document.getElementById('btn-bg')?.addEventListener('click', () => editor.setBackgroundImage());
    document.getElementById('btn-draw')?.addEventListener('click', () => editor.activateDrawingMode());
    document.getElementById('btn-add-page')?.addEventListener('click', () => editor.addPage());
};
