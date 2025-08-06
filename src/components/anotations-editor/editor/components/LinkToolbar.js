export function setupLinkToolbar(editor) {
    const toolbar = document.querySelector('#linkToolbar');

    if (!toolbar) return;

    toolbar.innerHTML = `
        <button id="linkEditText">Edit Text</button>
        <button id="linkEditUrl">Edit URL</button>
        <button id="linkOpen">Open</button>
        <button id="linkDelete">Delete</button>
    `;

    document.querySelector('#linkEditText')?.addEventListener('click', () => editor.editLinkText());
    document.querySelector('#linkEditUrl')?.addEventListener('click', () => editor.editLinkUrl());
    document.querySelector('#linkOpen')?.addEventListener('click', () => editor.openLinkUrl());
    document.querySelector('#linkDelete')?.addEventListener('click', () => editor.deleteLink());
};
