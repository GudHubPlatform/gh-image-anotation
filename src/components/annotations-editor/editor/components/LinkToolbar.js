export function setupLinkToolbar(editor) {
    const toolbar = editor.root.querySelector('#linkToolbar');

    if (!toolbar) return;

    toolbar.innerHTML = `
        <button id="linkEditText">Edit Text</button>
        <button id="linkEditUrl">Edit URL</button>
        <button id="linkOpen">Open</button>
        <button id="linkDelete">Delete</button>
    `;

    editor.root.querySelector('#linkEditText')?.addEventListener('click', () => editor.editLinkText());
    editor.root.querySelector('#linkEditUrl')?.addEventListener('click', () => editor.editLinkUrl());
    editor.root.querySelector('#linkOpen')?.addEventListener('click', () => editor.openLinkUrl());
    editor.root.querySelector('#linkDelete')?.addEventListener('click', () => editor.deleteLink());
};
