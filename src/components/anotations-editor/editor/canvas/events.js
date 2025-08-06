export function setupCanvasEvents(editor) {
    const canvas = editor.canvas;

    canvas.off();

    canvas.on('object:added', editor.saveStateBound);
    canvas.on('object:modified', editor.saveStateBound);
    canvas.on('object:removed', editor.saveStateBound);

    canvas.on('mouse:down', (e) => editor.onMouseDown(e));
    canvas.on('mouse:move', (e) => editor.onMouseMove(e));
    canvas.on('mouse:up', (e) => editor.onMouseUp(e));

    editor.saveState();
};
