export function saveState(editor) {
    if (editor.isRestoring || !editor.canvas) return;
    if (editor.isDrawingArrow && !editor.isAddingFinalArrow) return;

    const page = editor.pages[editor.currentPageIndex];
    if (!page) return;

    const currentState = JSON.stringify(editor.canvas);

    if (page.history.length === 0 || page.history[page.history.length - 1] !== currentState) {
        page.redoStack = [];
        page.history.push(currentState);
    }
}
