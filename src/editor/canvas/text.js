export function setupTextTools(editor) {
    editor.addText = () => {
        editor.disableDrawingMode();
        editor.isTextInsertMode = true;
        editor.canvas.defaultCursor = 'crosshair';
        editor.lockCanvasInteractions();
    };

    const originalMouseDown = editor.onMouseDown;
    editor.onMouseDown = function (e) {
        if (editor.isTextInsertMode && !e.target) {
            const pointer = editor.canvas.getPointer(e.e);

            const textbox = new fabric.Textbox('', {
                left: pointer.x,
                top: pointer.y,
                width: 200,
                fontSize: 20,
                editable: true,
                cursorColor: editor.currentColor,
                fill: editor.currentColor,
                backgroundColor: 'white',
                padding: 4,
                objectCaching: false,
                originX: 'center',
                originY: 'center'
            });

            const rect = new fabric.Rect({
                left: textbox.left,
                top: textbox.top,
                width: textbox.width + 8,
                height: textbox.height + 8,
                fill: 'transparent',
                stroke: 'red',
                strokeWidth: 2,
                selectable: false,
                evented: false,
                angle: textbox.angle,
                originX: 'center',
                originY: 'center'
            });

            textbox.borderRect = rect;

            editor.addObjectSilently(rect);
            editor.addObjectSilently(textbox);
            editor.canvas.setActiveObject(textbox);
            editor.saveState();

            const syncRect = () => {
                rect.set({
                    left: textbox.left,
                    top: textbox.top,
                    width: textbox.width + 8,
                    height: textbox.height + 8,
                    angle: textbox.angle
                });
            };

            textbox.on('moving', syncRect);
            textbox.on('scaling', () => {
                textbox.set({
                    width: textbox.width * textbox.scaleX,
                    scaleX: 1,
                    scaleY: 1
                });
                textbox.initDimensions();
                textbox.setCoords();
                syncRect();
            });

            textbox.on('rotating', () => rect.set({ angle: textbox.angle }));
            textbox.on('changed', syncRect);
            textbox.on('modified', syncRect);

            textbox.enterEditing();
            textbox.hiddenTextarea?.focus();

            editor.isTextInsertMode = false;
            editor.canvas.defaultCursor = 'default';
            editor.unlockCanvasInteractions();
        } else {
            originalMouseDown.call(editor, e);
        }
    };
}
