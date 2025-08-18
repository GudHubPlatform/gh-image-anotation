export function handlePaste(e, editor) {
    const items = (e.clipboardData || window.clipboardData).items;
    if (!items) return;

    for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            const reader = new FileReader();

            reader.onload = (event) => {
                fabric.Image.fromURL(event.target.result, (img) => {
                    img.set({
                        left: editor.canvas.width / 2 - img.width / 2,
                        top: editor.canvas.height / 2 - img.height / 2,
                        scaleX: 1,
                        scaleY: 1,
                        selectable: true
                    });
                    editor.canvas.add(img);
                    editor.canvas.setActiveObject(img);
                    editor.canvas.requestRenderAll();
                });
            };

            reader.readAsDataURL(blob);
            e.preventDefault();
            return;
        }
    }
}

export async function handleCopy(e, editor) {
    const activeObject = editor.canvas.getActiveObject();
    if (activeObject && activeObject.type === 'image') {
        const dataUrl = activeObject.toDataURL({ format: 'png', multiplier: 1 });
        const blob = await (await fetch(dataUrl)).blob();

        try {
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
        } catch (err) {
            console.error('Clipboard write failed:', err);
        }

        e.preventDefault();
    }
}
