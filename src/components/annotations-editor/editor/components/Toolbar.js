export function setupToolbar(editor, root) {
    root.querySelector('#btn-mouse')?.addEventListener('click', () => editor.enableMouseTool());
    root.querySelector('#btn-draw')?.addEventListener('click', () => editor.activateDrawingMode());
    root.querySelector('#btn-add-text')?.addEventListener('click', () => editor.addText());
    root.querySelector('#btn-add-link')?.addEventListener('click', () => editor.addLink());
    root.querySelector('#btn-add-arrow')?.addEventListener('click', () => editor.addArrow());
    root.querySelector('#input-image')?.addEventListener('change', (e) => editor.uploadImage(e));
    root.querySelector('#btn-undo')?.addEventListener('click', () => editor.undo());
    root.querySelector('#btn-redo')?.addEventListener('click', () => editor.redo());
    root.querySelector('#btn-clear')?.addEventListener('click', () => editor.clearCanvas());
    root.querySelector('#btn-save')?.addEventListener('click', () => editor.saveImage());
    root.querySelector('#btn-set-bg')?.addEventListener('click', () => editor.setBackgroundImage());
}
