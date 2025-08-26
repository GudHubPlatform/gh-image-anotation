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

    const getVPT = () => editor.canvas.viewportTransform || [1,0,0,1,0,0];

    const canvasToScreen = (x, y, rect) => {
        const [a,b,c,d,e,f] = getVPT();
        const sx = a * x + c * y + e + rect.left;
        const sy = b * x + d * y + f + rect.top;
        return { x: sx, y: sy };
    };

    const getScreenBBox = (obj) => {
        const rect = editor.canvas.upperCanvasEl.getBoundingClientRect();
        const corners = obj.getCoords(true);
        const pts = corners.map(p => canvasToScreen(p.x, p.y, rect));
        const xs = pts.map(p => p.x);
        const ys = pts.map(p => p.y);
        return {
            left: Math.min(...xs),
            right: Math.max(...xs),
            top: Math.min(...ys),
            bottom: Math.max(...ys),
            rect
        };
    };

    const positionToolbarSmart = (textbox) => {
        const toolbar = editor.root.querySelector('#linkToolbar');
        if (!toolbar || !textbox) return;

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

    const openModal = ({ mode, textbox }) => {
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
                closeModal();
                return;
            }

            if (mode === 'edit' && textbox) {
                textbox.set({ text: linkText });
                textbox.customUrl = linkUrl;
                editor.canvas.requestRenderAll();
                editor.saveState?.();
                editor.enableMouseTool();
                editor.setActiveButton('btn-mouse');
            } else {
                const tb = new fabric.Textbox(linkText, {
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
                tb.customUrl = linkUrl;
                tb.on('mousedblclick', () => {
                    if (tb.customUrl) window.open(tb.customUrl, '_blank');
                });
                editor.canvas.add(tb).setActiveObject(tb);
                editor.saveState?.();
                editor.enableMouseTool();
                editor.setActiveButton('btn-mouse');
            }

            closeModal();
        };

        btnCancel.onclick = closeModal;

        modal.style.display = 'flex';
    };

    editor.addLink = () => {
        editor.disableDrawingMode?.();
        editor.lockCanvasInteractions?.();
        openModal({ mode: 'create' });
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

    const onTextboxMouseUp = (tb) => {
        setTimeout(() => {
            if (editor.canvas.getActiveObject() === tb) {
                editor.showLinkToolbar(tb);
            }
        }, 0);
    };

    const originalAdd = editor.canvas.add.bind(editor.canvas);
    editor.canvas.add = (...args) => {
        const res = originalAdd(...args);
        args.forEach(obj => {
            if (isLinkTextbox(obj)) {
                obj.on('mouseup', () => onTextboxMouseUp(obj));
                obj.on('removed', () => {
                    if (editor.activeLinkTextbox === obj) editor.hideLinkToolbar();
                });
                obj.on('moving', schedulePosition);
                obj.on('scaling', schedulePosition);
                obj.on('rotating', schedulePosition);
                obj.on('modified', schedulePosition);
            }
        });
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
}
