export function setupLinkToolbar(editor) {
    const toolbar = editor.root.querySelector('#linkToolbar');
    if (!toolbar) return;

    toolbar.innerHTML = `
        <button id="linkEditText" class="link-toolbar__button link-toolbar__button--edit">Edit</button>
        <button id="linkOpen" class="link-toolbar__button link-toolbar__button--open">Open</button>
        <button id="linkDelete" class="link-toolbar__button link-toolbar__button--delete">Delete</button>
    `;

    editor.root.querySelector('#linkEditText')?.addEventListener('click', () => editor.editLinkText());
    editor.root.querySelector('#linkOpen')?.addEventListener('click', () => editor.openLinkUrl());
    editor.root.querySelector('#linkDelete')?.addEventListener('click', () => editor.deleteLink());
}
