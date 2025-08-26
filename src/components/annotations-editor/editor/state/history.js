const EXTRA_PROPS = ['customUrl'];

function snapshot(editor) {
  const jsonObj = editor.canvas.toJSON(EXTRA_PROPS);
  return JSON.stringify(jsonObj);
}

export function resetHistory(editor, jsonString) {
  if (!editor?.canvas) return;
  const page = editor.pages[editor.currentPageIndex];
  if (!page) return;

  const state = jsonString ?? snapshot(editor);
  page.history = [state];
  page.redoStack = [];
}

export function saveState(editor) {
    if (!editor.canvas) return;

    if (editor.isDrawingArrow && !editor.isAddingFinalArrow) return;

    if (editor.isTypingText) return;

    if (editor.isRestoring) return;

    const page = editor.pages[editor.currentPageIndex];
    if (!page) return;

    const json = editor.canvas.toJSON();
    const currentState = JSON.stringify(json);

    if (page.history.length === 0 || page.history[page.history.length - 1] !== currentState) {
        page.redoStack = [];
        page.history.push(currentState);
    }
}
