import { applyFabricOverrides } from './utils/fabricOverrides.js';
import { setupCanvasEvents } from './canvas/events.js';
import { setupDrawingTools } from './canvas/drawing.js';
import { setupArrowTools } from './canvas/arrows.js';
import { setupTextTools } from './canvas/text.js';
import { setupLinkTools } from './canvas/links.js';
import { setupBackgroundTools } from './canvas/background.js';
import { saveState, resetHistory } from './state/history.js';
import { undo, redo } from './state/undoRedo.js';
import { clearCanvas, saveImage } from './utils/helpers.js';
import { setupToolbar } from './components/Toolbar.js';
import { setupColorPalette } from './components/ColorPalette.js';
import { setupLinkToolbar } from './components/LinkToolbar.js';

export default class PaintEditor {
    constructor(root) {
        applyFabricOverrides();

        this.root = root;

        this.canvas = null;
        this.pages = [];
        this.currentPageIndex = -1;

        this.currentColor = '#ff0000ff';
        this.isDrawingArrow = false;
        this.isTextInsertMode = false;
        this.arrowStart = null;
        this.tempArrow = null;

        this.restoreDepth = 0;

        this._clipboard = null;

        this.saveStateBound = this.saveState.bind(this);

        this.init();
        this.initSinglePage();
        this.initUI();
    }

    init() {
        this._onKeyDown = (e) => {
            const t = e.target;
            const tag = (t?.tagName || '').toLowerCase();
            const isEditable =
              t?.isContentEditable ||
              tag === 'input' ||
              tag === 'textarea' ||
              tag === 'select' ||
              (typeof t?.closest === 'function' && !!t.closest('.gh-link-toolbar, .link-toolbar, [role="textbox"]'));
            if (isEditable) return;

            const platform = navigator.userAgentData?.platform || navigator.platform || '';
            const isMac = /mac/i.test(platform);
            const mod = isMac ? e.metaKey : e.ctrlKey;
            if (!mod) return;

            switch (e.code) {
                case 'KeyC':
                    e.preventDefault();
                    this.copySelection();
                    break;
                case 'KeyV':
                    e.preventDefault();
                    this.pasteSelection();
                    break;
                case 'KeyZ':
                    e.preventDefault();
                    if (e.shiftKey) this.redo();
                    else this.undo();
                    break;
                case 'KeyY':
                    e.preventDefault();
                    this.redo();
                    break;
            }
        };

        window.addEventListener('keydown', this._onKeyDown);
    }

    initUI() {
        setupToolbar(this, this.root);
        setupColorPalette(this);
        setupLinkToolbar(this);

        const uploadBtn = this.root.querySelector('#upload-image-btn');
        const fileInput = this.root.querySelector('#input-image');

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', this.uploadImage.bind(this));
        }

        this.setupActiveToolHighlighting();

        window.addEventListener('resize', () => this.resizeCanvasContainer());
    }

    initSinglePage() {
        const canvasWrapper = this.root.querySelector('#canvasWrapper');
        const pageWrapper = document.createElement('div');
        pageWrapper.className = 'canvas-page';
        const canvasEl = document.createElement('canvas');
        canvasEl.width = 1920;
        canvasEl.height = 1080;
        pageWrapper.appendChild(canvasEl);
        canvasWrapper.appendChild(pageWrapper);

        const canvas = new fabric.Canvas(canvasEl, { selection: true });
        this.pages.push({
            canvas,
            element: canvasEl,
            wrapper: pageWrapper,
            history: [],
            redoStack: []
        });

        pageWrapper.style.display = 'block';
        this.setCanvas(canvas);
        this.resizeCanvasContainer();
        this.currentPageIndex = 0;
        canvas.renderAll();

        resetHistory(this);
    }

    setCanvas(canvas) {
        this.canvas = canvas;
        setupCanvasEvents(this);
        setupDrawingTools(this);
        setupArrowTools(this);
        setupTextTools(this);
        setupLinkTools(this);
        setupBackgroundTools(this);

        this.canvas.on('object:modified', () => {
            if (this.restoreDepth > 0) return;
            this.saveState();
        });

        this.canvas.on('object:removed', () => {
            if (this.restoreDepth > 0) return;
            this.saveState();
        });

        this.canvas.on('path:created', (e) => {
            const path = e?.path || e?.target;
            if (path) {
                path.set({
                    fill: null,
                    stroke: this.currentColor,
                    strokeUniform: true
                });
            }
            if (this.restoreDepth > 0) return;
            this.saveState();
        });

        this.canvas.on('object:added', (e) => {
            if (this.restoreDepth > 0) return;
            if (e?.target?.type === 'path') return;
            this.saveState();
        });
    }

    saveState() { 
        saveState(this); 
    }

    undo() {
        undo(this);
        this.setActiveButton?.('btn-undo');
    }

    redo() {
        redo(this);
        this.setActiveButton?.('btn-redo');
    }

    clearCanvas() {
        clearCanvas(this);
    }

    saveImage() { 
        saveImage(this); 
    }

    resizeCanvasContainer() {
        const canvasElements = this.root.querySelectorAll('canvas');
        const canvasContainer = this.root.querySelector('.canvas-container');
        if (!canvasContainer) return;

        const originalWidth = 1920;
        const originalHeight = 1080;
        const windowWidth = window.innerWidth;

        const scale = windowWidth / originalWidth;
        const newWidth = originalWidth * scale;
        const newHeight = originalHeight * scale;

        canvasElements.forEach((el) => {
            el.style.height = `${newHeight}px`;
            el.style.width = `${newWidth}px`;
        });

        canvasContainer.style.width = `${newWidth}px`;
        canvasContainer.style.height = `${newHeight}px`;
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
            // activeObject.set({ fill: color, cursorColor: color });
            return;
        } else if (activeObject.type === 'line' || activeObject.type === 'path') {
            activeObject.set({ stroke: color });
        } else if (activeObject.type === 'rect' || activeObject.type === 'circle' || activeObject.type === 'triangle') {
            activeObject.set({ fill: color });
        }

        this.canvas.requestRenderAll();
    }

    enableMouseTool() {
        this.isDrawingArrow = false;
        this.isTextInsertMode = false;

        this.canvas.isDrawingMode = false;
        this.canvas.selection = true;

        this.canvas.forEachObject(obj => {
            obj.selectable = true;
            obj.evented = true;
        });

        this.canvas.discardActiveObject();
        this.canvas.requestRenderAll();
    }

    setupActiveToolHighlighting() {
        const buttons = this.root.querySelectorAll('.toolbar__action-buttons button');

        buttons.forEach(btn => {
            const tool = btn.id;

            btn.addEventListener('click', () => {
                if (tool === 'btn-undo' || tool === 'btn-redo') {
                    buttons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    setTimeout(() => {
                        btn.classList.remove('active');
                        const mouseBtn = this.root.querySelector('#btn-mouse');
                        if (mouseBtn) {
                            mouseBtn.classList.add('active');
                        }
                        this.enableMouseTool?.();
                        this.setActiveButton?.('btn-mouse');
                    }, 250);

                    return;
                }

                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (tool !== 'btn-mouse') {
                    this.activateToolOnce(tool);
                } else {
                    this.enableMouseTool();
                }
            });
        });

        const mouseBtn = this.root.querySelector('#btn-mouse');
        if (mouseBtn) {
            mouseBtn.classList.add('active');
            this.enableMouseTool();
        }
    }

    activateToolOnce(toolId) {
        switch (toolId) {
            case 'btn-draw':
                this.isDrawingArrow = false;
                this.isTextInsertMode = false;
                this.canvas.isDrawingMode = true;
                this.canvas.selection = false;
                if (this.canvas.freeDrawingBrush) {
                    this.canvas.freeDrawingBrush.color = this.currentColor;
                }
                break;

            case 'btn-add-arrow':
                this.isDrawingArrow = true;
                this.canvas.isDrawingMode = false;
                this.canvas.selection = false;
                break;

            case 'btn-add-text':
                this.isTextInsertMode = true;
                this.canvas.isDrawingMode = false;
                this.canvas.selection = false;
                break;

            case 'btn-add-link':
                this.canvas.isDrawingMode = false;
                this.addLink?.();
                break;

            default:
                break;
        }
    }

    setActiveButton(buttonId) {
        const buttons = this.root.querySelectorAll('.toolbar__action-buttons button');
        buttons.forEach(b => b.classList.remove('active'));
        const btn = this.root.querySelector(`#${buttonId}`);
        btn?.classList.add('active');
    }

    uploadImage(e) {
        const file = e?.target?.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            fabric.Image.fromURL(evt.target.result, (img) => {
                const cw = this.canvas.getWidth();
                const ch = this.canvas.getHeight();

                img.set({
                    left: cw / 2,
                    top: ch / 2,
                    originX: 'center',
                    originY: 'center',
                    selectable: true,
                    objectCaching: false
                });

                const maxW = cw * 0.9;
                const maxH = ch * 0.9;
                const scale = Math.min(
                    1,
                    maxW / (img.width || maxW),
                    maxH / (img.height || maxH)
                );
                if (scale < 1) img.scale(scale);

                this.canvas.add(img);
                this.canvas.setActiveObject(img);
                this.canvas.requestRenderAll();

                this.enableMouseTool();
                this.setActiveButton('btn-mouse');
            }, { crossOrigin: 'anonymous' });
        };
        reader.readAsDataURL(file);

        if (e?.target) e.target.value = '';
    }

    copySelection() {
        const active = this.canvas.getActiveObject();
        if (!active) return;
        active.clone((cloned) => { this._clipboard = cloned; });
    }

    pasteSelection() {
        if (!this._clipboard) return;

        this._clipboard.clone((clonedObj) => {
            this.canvas.discardActiveObject();

            clonedObj.set({
                left: (clonedObj.left || 0) + 20,
                top: (clonedObj.top || 0) + 20,
                evented: true
            });

            if (clonedObj.type === 'activeSelection') {
                clonedObj.canvas = this.canvas;
                clonedObj.forEachObject(obj => {
                    obj.set({ left: obj.left + 20, top: obj.top + 20 });
                    this.canvas.add(obj);
                });
                clonedObj.setCoords();
            } else {
                this.canvas.add(clonedObj);
            }

            this.canvas.setActiveObject(clonedObj);
            this.canvas.requestRenderAll();
        });
    }
}
