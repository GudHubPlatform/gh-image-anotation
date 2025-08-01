class PaintEditor {
    constructor() {
        this.canvas = null;

        this.saveStateBound = this.saveState.bind(this);

        this.isRestoring = false;
        this.currentColor = '#000000';
        this.isTextInsertMode = false;
        this.activeLinkTextbox = null;
        this.isDrawingArrow = false;
        this.arrowStart = null;
        this.tempArrow = null;
        this.pages = [];
        this.currentPageIndex = -1;

        this.init();
        this.addPage();
    }

    init() {
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentColor = btn.getAttribute('data-color');
                if (this.canvas?.isDrawingMode) {
                    this.canvas.freeDrawingBrush.color = this.currentColor;
                } else {
                    this.updateActiveObjectColor(this.currentColor);
                }
            });
        });

        document.getElementById('customColor').addEventListener('input', (e) => {
            this.currentColor = e.target.value;
            if (this.canvas?.isDrawingMode) {
                this.canvas.freeDrawingBrush.color = this.currentColor;
            } else {
                this.updateActiveObjectColor(this.currentColor);
            }
        });

        document.addEventListener('paste', this.handlePaste.bind(this));
        document.addEventListener('copy', this.handleCopy.bind(this));
    }

    initCanvasEvents() {
        this.canvas.off();

        this.canvas.on('object:added', this.saveStateBound);
        this.canvas.on('object:modified', this.saveStateBound);
        this.canvas.on('object:removed', this.saveStateBound);

        this.canvas.on('mouse:down', this.onMouseDown.bind(this));
        this.canvas.on('mouse:move', this.onMouseMove.bind(this));
        this.canvas.on('mouse:up', this.onMouseUp.bind(this));

        this.saveState();
    }

    saveState() {
        if (this.isRestoring || !this.canvas) return;

        if (this.isDrawingArrow && !this.isAddingFinalArrow) return;

        const page = this.pages[this.currentPageIndex];
        const currentState = JSON.stringify(this.canvas);

        if (page.history.length === 0 || page.history[page.history.length - 1] !== currentState) {
            page.redoStack = [];
            page.history.push(currentState);
        }
    }

    lockCanvasInteractions() {
        this.canvas.selection = false;
        this.canvas.forEachObject(obj => {
            obj.selectable = true;
            obj.evented = false;
        });
        this.canvas.discardActiveObject();
        this.canvas.requestRenderAll();
    }

    unlockCanvasInteractions() {
        this.canvas.selection = true;
        this.canvas.forEachObject(obj => {
            obj.selectable = true;
            obj.evented = true;
        });
        this.canvas.requestRenderAll();
    }

    addObjectSilently(obj) {
        this.canvas.off('object:added', this.saveStateBound);
        this.canvas.add(obj);
        this.canvas.on('object:added', this.saveStateBound);
    }

    activateDrawingMode() {
        this.isDrawingMode = !this.isDrawingMode;
        this.canvas.isDrawingMode = this.isDrawingMode;
        if (this.isDrawingMode) {
            this.canvas.freeDrawingBrush.color = this.currentColor;
        }
    }

    addText() {
        this.disableDrawingMode();
        this.isTextInsertMode = true;
        this.canvas.defaultCursor = 'crosshair';
        this.lockCanvasInteractions();
    }

    addLink() {
        this.disableDrawingMode();
        this.lockCanvasInteractions();

        const url = prompt("Enter URL:", "https://example.com");
        if (!url) return this.unlockCanvasInteractions();

        const linkText = prompt("Enter link text:", "Click here");
        if (!linkText) return this.unlockCanvasInteractions();

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

        textbox.on('mousedblclick', (e) => {
            window.open(textbox.customUrl, '_blank');
        });

        textbox.on('mousedown', () => {
            this.hideLinkToolbar();
        });

        textbox.on('mouseup', () => {
            setTimeout(() => {
                this.showLinkToolbar(textbox);
            }, 50);
        });

        this.canvas.add(textbox).setActiveObject(textbox);
        textbox.enterEditing();
        textbox.hiddenTextarea && textbox.hiddenTextarea.focus();

        this.unlockCanvasInteractions();
    }

    addArrow() {
        this.enableArrowDrawing();
        this.lockCanvasInteractions();
    }

    handlePaste(e) {
        const items = (e.clipboardData || window.clipboardData).items;
        if (!items) return;

        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                const reader = new FileReader();

                reader.onload = (event) => {
                    fabric.Image.fromURL(event.target.result, (img) => {
                        img.set({
                            left: this.canvas.width / 2 - img.width / 2,
                            top: this.canvas.height / 2 - img.height / 2,
                            scaleX: 1,
                            scaleY: 1,
                            selectable: true
                        });
                        this.canvas.add(img);
                        this.canvas.setActiveObject(img);
                        this.canvas.requestRenderAll();
                    });
                };

                reader.readAsDataURL(blob);
                e.preventDefault();
                return;
            }
        }
    }

    async handleCopy(e) {
        const activeObject = this.canvas.getActiveObject();

        if (activeObject && activeObject.type === 'image') {
            const dataUrl = activeObject.toDataURL({ format: 'png', multiplier: 1 });
            const blob = await (await fetch(dataUrl)).blob();

            try {
                await navigator.clipboard.write([
                    new ClipboardItem({ [blob.type]: blob })
                ]);
                console.log('Image copied to clipboard.');
            } catch (err) {
                console.error('Clipboard write failed:', err);
            }

            e.preventDefault();
        }
    }

    onMouseDown(e) {
        if (this.isDrawingArrow) {
            const pointer = this.canvas.getPointer(e.e);
            this.arrowStart = { x: pointer.x, y: pointer.y };
            return;
        }

        if (this.isTextInsertMode && !e.target) {
            const pointer = this.canvas.getPointer(e.e);

            const textbox = new fabric.Textbox('', {
                left: pointer.x,
                top: pointer.y,
                width: 200,
                fontSize: 20,
                editable: true,
                cursorColor: this.currentColor,
                fill: this.currentColor,
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

            this.addObjectSilently(rect);
            this.addObjectSilently(textbox);
            this.canvas.setActiveObject(textbox);
            this.saveState();

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

            this.isTextInsertMode = false;
            this.canvas.defaultCursor = 'default';
            
            this.unlockCanvasInteractions();
        }

        if (e.target && e.target.type === 'textbox' && e.target.customUrl) {
            this.activeLinkTextbox = e.target;
            this.showLinkToolbar(e.target);
        } else {
            this.hideLinkToolbar();
        }
    }

    onMouseMove(opt) {
        if (!this.isDrawingArrow || !this.arrowStart) return;

        const pointer = this.canvas.getPointer(opt.e);
        const fromX = this.arrowStart.x;
        const fromY = this.arrowStart.y;
        const toX = pointer.x;
        const toY = pointer.y;

        if (this.tempArrow) this.canvas.remove(this.tempArrow);

        this.tempArrow = this.createArrow(fromX, fromY, toX, toY, this.currentColor);
        this.canvas.add(this.tempArrow);
        this.canvas.requestRenderAll();
    }

    onMouseUp(event) {
        if (!this.isDrawingArrow || !this.tempArrow) return;

        const pointer = this.canvas.getPointer(event.e);

        this.canvas.remove(this.tempArrow);

        this.isAddingFinalArrow = true;

        const finalArrow = this.createArrow(this.arrowStart.x, this.arrowStart.y, pointer.x, pointer.y, this.currentColor);
        this.canvas.add(finalArrow);
        this.canvas.setActiveObject(finalArrow);
        this.canvas.requestRenderAll();

        this.saveState();

        this.isAddingFinalArrow = false;

        this.tempArrow = null;
        this.arrowStart = null;
        this.isDrawingArrow = false;
        this.canvas.defaultCursor = 'default';

        this.canvas.selection = true;
        this.unlockCanvasInteractions();
    }

    uploadImage(event) {
        this.disableDrawingMode();

        const reader = new FileReader();
        reader.onload = (e) => {
            fabric.Image.fromURL(e.target.result, img => {
                img.set({
                    left: this.canvas.width / 2 - img.width / 4,
                    top: this.canvas.height / 2 - img.height / 4,
                    scaleX: 0.5,
                    scaleY: 0.5,
                    selectable: true,
                });
                this.canvas.add(img);
            });
        };
        reader.readAsDataURL(event.target.files[0]);
    }

    createArrow(fromX, fromY, toX, toY, color) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);
        const headLength = 15;
        const headWidth = 10;

        const tip = { x: toX, y: toY };
        const base = {
            x: toX - headLength * Math.cos(angle),
            y: toY - headLength * Math.sin(angle)
        };

        const perpendicularAngle = angle + Math.PI / 2;
        const left = {
            x: base.x + (headWidth / 2) * Math.cos(perpendicularAngle),
            y: base.y + (headWidth / 2) * Math.sin(perpendicularAngle)
        };
        const right = {
            x: base.x - (headWidth / 2) * Math.cos(perpendicularAngle),
            y: base.y - (headWidth / 2) * Math.sin(perpendicularAngle)
        };

        const shaft = new fabric.Line([fromX, fromY, base.x, base.y], {
            stroke: color,
            strokeWidth: 2,
            selectable: false,
            evented: false
        });

        const head = new fabric.Polygon([tip, left, right], {
            fill: color,
            selectable: false,
            evented: false,
            objectCaching: false
        });

        const group = new fabric.Group([shaft, head], {
            left: Math.min(fromX, toX),
            top: Math.min(fromY, toY),
            selectable: true,
            evented: true,
            objectCaching: false,
            hasControls: true,
            hasBorders: true
        });

        return group;
    }

    undo() {
        const page = this.pages[this.currentPageIndex];
        if (page.history.length > 1) {
            const currentState = JSON.stringify(this.canvas);
            page.redoStack.push(currentState);
            page.history.pop();
            const previous = page.history[page.history.length - 1];
            this.isRestoring = true;
            this.canvas.loadFromJSON(previous, () => {
                this.restoreBackgroundImageScale();
                this.isRestoring = false;
                this.canvas.renderAll();
            });
        }
    }

    redo() {
        const page = this.pages[this.currentPageIndex];
        if (page.redoStack.length > 0) {
            const next = page.redoStack.pop();
            page.history.push(next);
            this.isRestoring = true;
            this.canvas.loadFromJSON(next, () => {
                this.restoreBackgroundImageScale();
                this.isRestoring = false;
                this.canvas.renderAll();
            });
        }
    }

    clearCanvas() {
        this.canvas.clear();

        const page = this.pages[this.currentPageIndex];
        page.history = [];
        page.redoStack = [];

        this.saveState();
    }

    saveImage() {
        const svgString = this.canvas.toSVG();
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const linkSvg = document.createElement('a');
        linkSvg.href = URL.createObjectURL(blob);
        linkSvg.download = 'canvas-image.svg';
        linkSvg.click();

        setTimeout(() => {
            URL.revokeObjectURL(linkSvg.href);
        }, 100);
    }

    updateActiveObjectColor(color) {
        const activeObject = this.canvas.getActiveObject();
        if (!activeObject) return;

        if (activeObject.type === 'group') {
            activeObject._objects.forEach(obj => {
                if (obj.type === 'line') obj.set({ stroke: color });
                if (obj.type === 'polygon') obj.set({ fill: color });
            });
        } else if (activeObject.type === 'textbox') {
            activeObject.set({ fill: color, cursorColor: color });
        } else if (activeObject.type === 'line' || activeObject.type === 'path') {
            activeObject.set({ stroke: color });
        } else if (activeObject.type === 'rect' || activeObject.type === 'circle' || activeObject.type === 'triangle') {
            activeObject.set({ fill: color });
        }

        this.canvas.requestRenderAll();
    }

    disableDrawingMode() {
        if (this.canvas.isDrawingMode) {
            this.canvas.isDrawingMode = false;
            this.canvas.discardActiveObject();
            this.canvas.requestRenderAll();
        }
    }

    enableArrowDrawing() {
        this.disableDrawingMode();
        this.isDrawingArrow = true;
        this.canvas.defaultCursor = 'crosshair';
        this.canvas.selection = false; 
    }

    showLinkToolbar(textbox) {
        const toolbar = document.getElementById('linkToolbar');
        
        const canvasRect = this.canvas.upperCanvasEl.getBoundingClientRect();
        const zoom = this.canvas.getZoom();

        const top = canvasRect.top + textbox.top * zoom - 100;
        const left = canvasRect.left + textbox.left * zoom;

        toolbar.style.top = `${top}px`;
        toolbar.style.left = `${left}px`;
        toolbar.style.display = 'flex';

        this.activeLinkTextbox = textbox;
    }

    hideLinkToolbar() {
        document.getElementById('linkToolbar').style.display = 'none';
        this.activeLinkTextbox = null;
    }

    editLinkText() {
        if (!this.activeLinkTextbox) return;
        const newText = prompt("Edit link text:", this.activeLinkTextbox.text);
        if (newText !== null) {
            this.activeLinkTextbox.set({ text: newText });
            this.canvas.requestRenderAll();
        }
    }

    editLinkUrl() {
        if (!this.activeLinkTextbox) return;
        const newUrl = prompt("Edit URL:", this.activeLinkTextbox.customUrl || "https://");
        if (newUrl !== null) {
            this.activeLinkTextbox.customUrl = newUrl;
        }
    }

    openLinkUrl() {
        if (!this.activeLinkTextbox || !this.activeLinkTextbox.customUrl) return;
        window.open(this.activeLinkTextbox.customUrl, '_blank');
    }

    deleteLink() {
        if (!this.activeLinkTextbox) return;
        this.canvas.remove(this.activeLinkTextbox);
        this.hideLinkToolbar();
        this.canvas.requestRenderAll();
    }

    addPage() {
        const canvasWrapper = document.getElementById('canvasWrapper');

        const pageWrapper = document.createElement('div');
        pageWrapper.className = 'canvas-page';
        pageWrapper.style.display = 'none';

        const canvasEl = document.createElement('canvas');
        canvasEl.width = 1200;
        canvasEl.height = 700;

        pageWrapper.appendChild(canvasEl);
        canvasWrapper.appendChild(pageWrapper);

        const newCanvas = new fabric.Canvas(canvasEl, { selection: true });

        this.pages.push({
            canvas: newCanvas,
            element: canvasEl,
            wrapper: pageWrapper,
            history: [],
            redoStack: []
        });

        this.switchToPage(this.pages.length - 1);
        this.renderPageTabs();
    }

    switchToPage(index) {
        if (this.currentPageIndex !== -1 && this.pages[this.currentPageIndex]) {
            this.pages[this.currentPageIndex].wrapper.style.display = 'none';
        }

        this.currentPageIndex = index;
        const currentPage = this.pages[index];

        this.canvas = currentPage.canvas;
        currentPage.wrapper.style.display = 'block';
        this.canvas.renderAll();

        this.initCanvasEvents();

        this.canvas.isDrawingMode = this.isDrawingMode;
        if (this.isDrawingMode) {
            this.canvas.freeDrawingBrush.color = this.currentColor;
        }

        this.canvas.defaultCursor = this.isTextInsertMode || this.isDrawingArrow ? 'crosshair' : 'default';

        this.renderPageTabs();
    }

    renderPageTabs() {
        const container = document.getElementById('pageTabs');
        container.innerHTML = '';

        this.pages.forEach((_, i) => {
            const tab = document.createElement('div');
            tab.className = 'page-tab' + (i === this.currentPageIndex ? ' active' : '');
            tab.innerText = `Page ${i + 1}`;
            tab.onclick = () => this.switchToPage(i);

            if (this.pages.length > 1) {
                const close = document.createElement('span');
                close.innerText = '×';
                close.className = 'close';
                close.onclick = (e) => {
                    e.stopPropagation();
                    this.deletePage(i);
                };
                tab.appendChild(close);
            }

            container.appendChild(tab);
        });
    }

    deletePage(index) {
        if (this.pages.length <= 1) {
            alert("At least one page must remain.");
            return;
        }

        const page = this.pages[index];

        page.canvas.dispose();
        page.wrapper.remove();

        this.pages.splice(index, 1);

        if (this.currentPageIndex === index) {
            this.currentPageIndex = index === 0 ? 0 : index - 1;
        } else if (index < this.currentPageIndex) {
            this.currentPageIndex--;
        }

        this.switchToPage(this.currentPageIndex);

        this.renderPageTabs();
    }

    setBackgroundImage() {
        this.disableDrawingMode();

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                fabric.Image.fromURL(e.target.result, (img) => {
                    const canvasWidth = this.canvas.getWidth();
                    const canvasHeight = this.canvas.getHeight();
                    const padding = 300;
                    const maxWidth = canvasWidth - padding * 2;
                    const maxHeight = canvasHeight;

                    const scaleX = maxWidth / img.width;
                    const scaleY = maxHeight / img.height;
                    const scale = Math.min(scaleX, scaleY);

                    img.scale(scale);

                    img.set({
                        left: (canvasWidth - img.getScaledWidth()) / 2,
                        top: (canvasHeight - img.getScaledHeight()) / 2,
                        selectable: false,
                        evented: false,
                        hasControls: false,
                        hasBorders: false,
                        lockMovementX: true,
                        lockMovementY: true,
                        hoverCursor: 'default'
                    });

                    this.canvas.setBackgroundImage(img, this.canvas.renderAll.bind(this.canvas));
                    this.saveState();
                });
            };
            reader.readAsDataURL(file);
        };

        input.click();
    }

    restoreBackgroundImageScale() {
        const bg = this.canvas.backgroundImage;
        if (!bg) return;

        const canvasWidth = this.canvas.getWidth();
        const canvasHeight = this.canvas.getHeight();
        const padding = 300;
        const maxWidth = canvasWidth - padding * 2;
        const maxHeight = canvasHeight;

        const scaleX = maxWidth / bg.width;
        const scaleY = maxHeight / bg.height;
        const scale = Math.min(scaleX, scaleY);

        bg.scale(scale);
        bg.set({
            left: (canvasWidth - bg.getScaledWidth()) / 2,
            top: (canvasHeight - bg.getScaledHeight()) / 2,
            selectable: false,
            evented: false,
            hasControls: false,
            hasBorders: false,
            lockMovementX: true,
            lockMovementY: true,
            hoverCursor: 'default'
        });

        this.canvas.requestRenderAll();
    }
}

const editor = new PaintEditor('c');
