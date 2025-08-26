export function undo(editor) {
    const page = editor.pages[editor.currentPageIndex];
    if (page.history.length > 1) {
        const currentState = JSON.stringify(editor.canvas.toJSON());
        page.redoStack.push(currentState);
        page.history.pop();

        const previous = page.history[page.history.length - 1];
        editor.isRestoring = true;
        editor.canvas.loadFromJSON(previous, () => {
            editor.restoreBackgroundImageScale?.();
            editor.rebuildTextHelpers?.();
            editor.isRestoring = false;
            editor.canvas.renderAll();
        });
    }
};

export function redo(editor) {
    const page = editor.pages[editor.currentPageIndex];
    if (page.redoStack.length > 0) {
        const next = page.redoStack.pop();
        page.history.push(next);

        editor.isRestoring = true;
        editor.canvas.loadFromJSON(next, () => {
            editor.restoreBackgroundImageScale?.();
            editor.rebuildTextHelpers?.();
            editor.isRestoring = false;
            editor.canvas.renderAll();
        });
    }
};
