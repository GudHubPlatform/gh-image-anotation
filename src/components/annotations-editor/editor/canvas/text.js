export function setupTextTools(editor) {
    editor.rebuildTextHelpers = () => {
        if (!editor.canvas) return;

        const toRemove = editor.canvas.getObjects().filter(o => o.__isTextBorder === true);
        if (toRemove.length) {
            editor.canvas.off('object:removed', editor.saveStateBound);
            toRemove.forEach(o => editor.canvas.remove(o));
            editor.canvas.on('object:removed', editor.saveStateBound);
        }

        const textboxes = editor.canvas.getObjects().filter(o => o.type === 'textbox');
        textboxes.forEach(tb => {
            if (tb.customUrl) return;
            if (tb.borderRect && tb.borderRect.__isTextBorder) return;

            const rect = new fabric.Rect({
                left: tb.left,
                top: tb.top,
                width: (tb.width ?? 200) + 8,
                height: (tb.height ?? 20) + 8,
                fill: 'transparent',
                stroke: 'red',
                strokeWidth: 2,
                selectable: false,
                evented: false,
                angle: tb.angle ?? 0,
                originX: tb.originX ?? 'center',
                originY: tb.originY ?? 'center',
                excludeFromExport: true,
                __isTextBorder: true
            });

            tb.borderRect = rect;

            const syncRect = () => {
                rect.set({
                    left: tb.left,
                    top: tb.top,
                    width: tb.width + 8,
                    height: tb.height + 8,
                    angle: tb.angle
                });
            };

            tb.on('moving', syncRect);
            tb.on('scaling', () => {
                tb.set({
                    width: tb.width * tb.scaleX,
                    scaleX: 1,
                    scaleY: 1
                });
                tb.initDimensions();
                tb.setCoords();
                syncRect();
            });
            tb.on('rotating', () => rect.set({ angle: tb.angle }));
            tb.on('changed', syncRect);
            tb.on('modified', syncRect);

            tb.on('removed', () => {
                try { editor.canvas.remove(rect); } catch (_) {}
            });

            editor.addObjectSilently(rect);
            editor.canvas.bringToFront(tb);
        });

        editor.canvas.requestRenderAll();
    };

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
                cursorColor: '#000000',
                fill: '#000000',
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
                originY: 'center',
                excludeFromExport: true,
                __isTextBorder: true
            });

            textbox.borderRect = rect;

            editor.addObjectSilently(rect);
            editor.addObjectSilently(textbox);
            editor.canvas.setActiveObject(textbox);
            editor.canvas.bringToFront(textbox);

            textbox.on('removed', () => {
                try { editor.canvas.remove(rect); } catch (_) {}
            });

            editor.isTypingText = true;

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
            textbox.on('editing:entered', () => {
                editor.isTypingText = true;
                const el = textbox.hiddenTextarea;
                if (el) {
                    if (!el.id) el.id = 'fabric-hidden-textarea';
                    if (!el.name) el.name = 'fabric-hidden-textarea';
                }
            });

            textbox.on('editing:exited', () => {
                const c = editor.canvas;
                c.off('object:modified', editor.saveStateBound);
                editor.isTypingText = false;
                editor.saveState();
                c.on('object:modified', editor.saveStateBound);
            });

            textbox.enterEditing();
            textbox.hiddenTextarea?.focus();

            editor.isTextInsertMode = false;
            editor.canvas.defaultCursor = 'default';
            editor.unlockCanvasInteractions();

            const finishTextPlacement = () => {
                editor.enableMouseTool?.();
                editor.setActiveButton?.('btn-mouse');
                editor.canvas.off('selection:cleared', finishTextPlacement);
            };
            editor.canvas.once('selection:cleared', finishTextPlacement);
        } else {
            originalMouseDown.call(editor, e);
        }
    };
}
