export function setupLinkTools(editor) {
    editor.addLink = () => {
        editor.disableDrawingMode();
        editor.lockCanvasInteractions();

        const url = prompt("Enter URL:", "https://example.com");
        if (!url) return editor.unlockCanvasInteractions();

        const linkText = prompt("Enter link text:", "Click here");
        if (!linkText) return editor.unlockCanvasInteractions();

        const textbox = new fabric.Textbox(linkText, {
            left: 150,
            top: 150,
            width: 200,
            fontSize: 18,
            fill: '#0000EE',
            underline: true,
            editable: true,
            cursorColor: '#0000EE',
            selectable: true,
            hasBorders: true,
            hasControls: true,
            hoverCursor: 'pointer',
            objectCaching: false,
            padding: 4
        });

        textbox.customUrl = url;

        textbox.on('mousedblclick', () => {
            window.open(textbox.customUrl, '_blank');
        });

        textbox.on('mousedown', () => {
            editor.hideLinkToolbar();
        });

        textbox.on('mouseup', () => {
            setTimeout(() => {
                if (editor.canvas.getObjects().includes(textbox)) {
                    editor.showLinkToolbar(textbox);
                }
            }, 50);
        });

        editor.canvas.add(textbox).setActiveObject(textbox);
        textbox.enterEditing();
        textbox.hiddenTextarea && textbox.hiddenTextarea.focus();

        editor.unlockCanvasInteractions();
    };

    editor.showLinkToolbar = (textbox) => {
        const toolbar = document.querySelector('#linkToolbar');
        const canvasRect = editor.canvas.upperCanvasEl.getBoundingClientRect();
        const zoom = editor.canvas.getZoom();

        const top = canvasRect.top + textbox.top * zoom - 100;
        const left = canvasRect.left + textbox.left * zoom;

        toolbar.style.top = `${top}px`;
        toolbar.style.left = `${left}px`;
        toolbar.style.display = 'flex';

        editor.activeLinkTextbox = textbox;
    };

    editor.hideLinkToolbar = () => {
        document.querySelector('#linkToolbar').style.display = 'none';
        editor.activeLinkTextbox = null;
    };

    editor.editLinkText = () => {
        if (!editor.activeLinkTextbox) return;
        const newText = prompt("Edit link text:", editor.activeLinkTextbox.text);
        if (newText !== null) {
            editor.activeLinkTextbox.set({ text: newText });
            editor.canvas.requestRenderAll();
        }
    };

    editor.editLinkUrl = () => {
        if (!editor.activeLinkTextbox) return;
        const newUrl = prompt("Edit URL:", editor.activeLinkTextbox.customUrl || "https://");
        if (newUrl !== null) {
            editor.activeLinkTextbox.customUrl = newUrl;
        }
    };

    editor.openLinkUrl = () => {
        if (!editor.activeLinkTextbox || !editor.activeLinkTextbox.customUrl) return;
        window.open(editor.activeLinkTextbox.customUrl, '_blank');
    };

    editor.deleteLink = () => {
        if (!editor.activeLinkTextbox) return;
        editor.canvas.remove(editor.activeLinkTextbox);
        editor.hideLinkToolbar();
        editor.canvas.requestRenderAll();
    };
}
