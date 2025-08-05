export function setupLinkToolbar(editor) {
    const toolbar = document.getElementById('linkToolbar');

    if (!toolbar) return;

    toolbar.innerHTML = `
        <button id="linkEditText">Edit Text</button>
        <button id="linkEditUrl">Edit URL</button>
        <button id="linkOpen">Open</button>
        <button id="linkDelete">Delete</button>
    `;

    document.getElementById('linkEditText')?.addEventListener('click', () => editor.editLinkText());
    document.getElementById('linkEditUrl')?.addEventListener('click', () => editor.editLinkUrl());
    document.getElementById('linkOpen')?.addEventListener('click', () => editor.openLinkUrl());
    document.getElementById('linkDelete')?.addEventListener('click', () => editor.deleteLink());
};
