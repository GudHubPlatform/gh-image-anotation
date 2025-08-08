export function setupDrawingTools(editor) {
    editor.activateDrawingMode = () => {
        editor.isDrawingMode = !editor.isDrawingMode;
        editor.canvas.isDrawingMode = editor.isDrawingMode;
        if (editor.isDrawingMode) {
            editor.canvas.freeDrawingBrush.color = editor.currentColor;
        }
    };

    editor.disableDrawingMode = () => {
        if (editor.canvas.isDrawingMode) {
            editor.canvas.isDrawingMode = false;
            editor.canvas.discardActiveObject();
            editor.canvas.requestRenderAll();
        }
    };

    editor.lockCanvasInteractions = () => {
        editor.canvas.selection = false;
        editor.canvas.forEachObject(obj => {
            obj.selectable = true;
            obj.evented = false;
        });
        editor.canvas.discardActiveObject();
        editor.canvas.requestRenderAll();
    };

    editor.unlockCanvasInteractions = () => {
        editor.canvas.selection = true;
        editor.canvas.forEachObject(obj => {
            obj.selectable = true;
            obj.evented = true;
        });
        editor.canvas.requestRenderAll();
    };

    editor.addObjectSilently = (obj) => {
        editor.canvas.off('object:added', editor.saveStateBound);
        editor.canvas.add(obj);
        editor.canvas.on('object:added', editor.saveStateBound);
    };
};
