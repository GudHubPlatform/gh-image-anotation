export function setupLinkTools(editor) {
    const getModal = () => ({
        modal: editor.root.querySelector('#linkModal'),
        title: editor.root.querySelector('#linkModalTitle'),
        text: editor.root.querySelector('#linkModalText'),
        url: editor.root.querySelector('#linkModalUrl'),
        btnSave: editor.root.querySelector('#linkModalSave'),
        btnCancel: editor.root.querySelector('#linkModalCancel'),
    });

    const isLinkTextbox = (obj) =>
        !!obj && obj.type === 'textbox' && Object.prototype.hasOwnProperty.call(obj, 'customUrl');

    const getCanvasRect = () => editor.canvas.upperCanvasEl.getBoundingClientRect();
    const getCssScale = () => {
        const rect = getCanvasRect();
        const cssScaleX = rect.width / editor.canvas.getWidth();
        const cssScaleY = rect.height / editor.canvas.getHeight();
        return { cssScaleX, cssScaleY, rect };
    };

    const getVPT = () => editor.canvas.viewportTransform || [1,0,0,1,0,0];

    const canvasToScreen = (x, y) => {
        const [a,b,c,d,e,f] = getVPT();
        const { cssScaleX, cssScaleY, rect } = getCssScale();
        const vx = a * x + c * y + e;
        const vy = b * x + d * y + f;
        return { x: vx * cssScaleX + rect.left, y: vy * cssScaleY + rect.top };
    };

    const getScreenBBox = (obj) => {
        const corners = obj.getCoords(true);
        const pts = corners.map(p => canvasToScreen(p.x, p.y));
        const xs = pts.map(p => p.x);
        const ys = pts.map(p => p.y);
        return {
            left: Math.min(...xs),
            right: Math.max(...xs),
            top: Math.min(...ys),
            bottom: Math.max(...ys)
        };
    };

    const positionToolbarSmart = (textbox) => {
        const toolbar = editor.root.querySelector('#linkToolbar');
        if (!toolbar || !textbox) return;

        toolbar.style.position = 'fixed';
        toolbar.style.display = 'flex';
        toolbar.style.visibility = 'hidden';
        toolbar.style.maxWidth = 'calc(100vw - 16px)';

        const bbox = getScreenBBox(textbox);
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        const gapBase = 52;
        const cornerSize = (fabric.Object.prototype.cornerSize || 12);
        const gap = gapBase + Math.max(0, Math.min(20, cornerSize / 2));

        const tbw = toolbar.offsetWidth || 160;
        const tbh = toolbar.offsetHeight || 40;

        const centerX = (bbox.left + bbox.right) / 2;
        let top = bbox.top - gap - tbh;
        let left = centerX - tbw / 2;

        if (top < 8) {
            top = bbox.bottom + gap;
        }

        left = Math.max(8, Math.min(left, viewportW - tbw - 8));
        top = Math.max(8, Math.min(top, viewportH - tbh - 8));

        toolbar.style.left = `${left}px`;
        toolbar.style.top = `${top}px`;
        toolbar.style.visibility = 'visible';
    };

    let rafId = null;
    const schedulePosition = () => {
        if (!editor.activeLinkTextbox) return;
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
            positionToolbarSmart(editor.activeLinkTextbox);
            rafId = null;
        });
    };

    const openModal = ({ mode, textbox, onCancel }) => {
        if (editor._linkModalOpen) return;
        editor._linkModalOpen = true;

        const { modal, title, text, url, btnSave, btnCancel } = getModal();
        if (!modal) return;

        title.textContent = mode === 'edit' ? 'Edit Link' : 'Add Link';
        text.value = mode === 'edit' ? (textbox?.text || '') : '';
        url.value = mode === 'edit' ? (textbox?.customUrl || '') : '';

        btnSave.onclick = null;
        btnCancel.onclick = null;

        const closeModal = () => {
            modal.style.display = 'none';
            editor._linkModalOpen = false;
            editor.unlockCanvasInteractions?.();
            editor.enableMouseTool?.();
            editor.setActiveButton?.('btn-mouse');
        };

        btnSave.onclick = () => {
            const linkText = text.value?.trim();
            const linkUrl = url.value?.trim();
            if (!linkText || !linkUrl) {
                if (mode === 'create' && textbox) {
                    if (textbox.borderRect) editor.canvas.remove(textbox.borderRect);
                    editor.canvas.remove(textbox);
                    editor.canvas.requestRenderAll();
                }
                closeModal();
                return;
            }

            if (textbox) {
                textbox.set({
                    text: linkText,
                    fill: '#0000EE',
                    underline: true,
                    editable: true,
                    cursorColor: '#0000EE'
                });
                textbox.customUrl = linkUrl;

                if (!textbox.__dblBound) {
                    textbox.on('mousedblclick', () => {
                        if (textbox.customUrl) window.open(textbox.customUrl, '_blank');
                    });
                    textbox.__dblBound = true;
                }

                editor.canvas.requestRenderAll();
                editor.saveState?.();
            }

            closeModal();
        };

        btnCancel.onclick = () => {
            if (mode === 'create' && textbox) {
                if (textbox.borderRect) editor.canvas.remove(textbox.borderRect);
                editor.canvas.remove(textbox);
                editor.canvas.requestRenderAll();
            }
            onCancel?.();
            closeModal();
        };

        modal.style.display = 'flex';
    };

    editor.addLink = () => {
        editor.disableDrawingMode?.();
        editor.isLinkInsertMode = true;
        editor.canvas.defaultCursor = 'crosshair';
        editor.lockCanvasInteractions?.();
        editor.hideLinkToolbar?.();
    };

    editor.editLinkText = () => {
        if (!editor.activeLinkTextbox) return;
        openModal({ mode: 'edit', textbox: editor.activeLinkTextbox });
    };

    editor.editLinkUrl = () => {
        if (!editor.activeLinkTextbox) return;
        openModal({ mode: 'edit', textbox: editor.activeLinkTextbox });
    };

    editor.openLinkUrl = () => {
        const tb = editor.activeLinkTextbox;
        if (!tb?.customUrl) return;
        window.open(tb.customUrl, '_blank');
    };

    editor.deleteLink = () => {
        const tb = editor.activeLinkTextbox;
        if (!tb) return;
        if (tb.borderRect) editor.canvas.remove(tb.borderRect);
        editor.canvas.remove(tb);
        editor.hideLinkToolbar();
        editor.canvas.requestRenderAll();
        editor.saveState?.();
    };

    editor.showLinkToolbar = (textbox) => {
        const toolbar = editor.root.querySelector('#linkToolbar');
        if (!toolbar) return;
        toolbar.style.display = 'flex';
        editor.activeLinkTextbox = textbox;
        positionToolbarSmart(textbox);
    };

    editor.hideLinkToolbar = () => {
        const tlb = editor.root.querySelector('#linkToolbar');
        if (tlb) tlb.style.display = 'none';
        editor.activeLinkTextbox = null;
    };

    const handleSelection = (obj) => {
        if (isLinkTextbox(obj)) {
            editor.showLinkToolbar(obj);
        } else {
            editor.hideLinkToolbar();
        }
    };

    editor.canvas.on('selection:created', (e) => {
        const obj = e?.selected?.[0] ?? editor.canvas.getActiveObject();
        handleSelection(obj);
    });

    editor.canvas.on('selection:updated', (e) => {
        const obj = e?.selected?.[0] ?? editor.canvas.getActiveObject();
        handleSelection(obj);
    });

    editor.canvas.on('selection:cleared', () => {
        editor.hideLinkToolbar();
    });

    const bindLinkObject = (tb) => {
        if (!isLinkTextbox(tb)) return;
        tb.on('mouseup', () => {
            setTimeout(() => {
                if (editor.canvas.getActiveObject() === tb) {
                    editor.showLinkToolbar(tb);
                }
            }, 0);
        });
        tb.on('removed', () => {
            if (editor.activeLinkTextbox === tb) editor.hideLinkToolbar();
        });
        tb.on('moving', schedulePosition);
        tb.on('scaling', schedulePosition);
        tb.on('rotating', schedulePosition);
        tb.on('modified', schedulePosition);
    };

    const originalAdd = editor.canvas.add.bind(editor.canvas);
    editor.canvas.add = (...args) => {
        const res = originalAdd(...args);
        args.forEach(bindLinkObject);
        return res;
    };

    editor.canvas.on('object:moving', (e) => {
        if (e.target && e.target === editor.activeLinkTextbox) schedulePosition();
    });
    editor.canvas.on('object:scaling', (e) => {
        if (e.target && e.target === editor.activeLinkTextbox) schedulePosition();
    });
    editor.canvas.on('object:rotating', (e) => {
        if (e.target && e.target === editor.activeLinkTextbox) schedulePosition();
    });
    editor.canvas.on('mouse:wheel', schedulePosition);

    window.addEventListener('resize', schedulePosition);
    window.addEventListener('scroll', schedulePosition, { passive: true });

    const originalMouseDown = editor.onMouseDown;
    editor.onMouseDown = function (e) {
        if (editor.isLinkInsertMode && !e.target) {
            const pointer = editor.canvas.getPointer(e.e);

            const tb = new fabric.Textbox('',
                {
                    left: pointer.x,
                    top: pointer.y,
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
                    originX: 'center',
                    originY: 'center',
                    padding: 4
                }
            );
            tb.customUrl = '';

            editor.canvas.add(tb).setActiveObject(tb);
            editor.canvas.bringToFront(tb);
            bindLinkObject(tb);

            openModal({
                mode: 'create',
                textbox: tb,
                onCancel: () => {}
            });

            editor.isLinkInsertMode = false;
            editor.canvas.defaultCursor = 'default';
            editor.unlockCanvasInteractions?.();

            const finishPlacement = () => {
                editor.enableMouseTool?.();
                editor.setActiveButton?.('btn-mouse');
                editor.canvas.off('selection:cleared', finishPlacement);
            };
            editor.canvas.once('selection:cleared', finishPlacement);
        } else {
            originalMouseDown.call(editor, e);
        }
    };
}
