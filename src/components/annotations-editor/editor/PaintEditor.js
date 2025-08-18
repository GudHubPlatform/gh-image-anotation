import { applyFabricOverrides } from './utils/fabricOverrides.js';
import { setupCanvasEvents } from './canvas/events.js';
import { setupDrawingTools } from './canvas/drawing.js';
import { setupArrowTools } from './canvas/arrows.js';
import { setupTextTools } from './canvas/text.js';
import { setupLinkTools } from './canvas/links.js';
import { setupBackgroundTools } from './canvas/background.js';
import { handlePaste, handleCopy } from './clipboard/index.js';
import { saveState } from './state/history.js';
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

        this.currentColor = '#000000';
        this.isDrawingArrow = false;
        this.isTextInsertMode = false;
        this.arrowStart = null;
        this.tempArrow = null;
        this.isRestoring = false;

        this.saveStateBound = this.saveState.bind(this);

        this.init();
        this.initSinglePage();
        this.initUI();
    }

    init() {
        this.root.addEventListener('paste', (e) => handlePaste(e, this));
        this.root.addEventListener('copy', (e) => handleCopy(e, this));
    }

    initUI() {
        setupToolbar(this, this.root); 
        setupColorPalette(this);
        setupLinkToolbar(this);

        const uploadBtn = this.root.querySelector('#custom-upload-btn');
        const fileInput = this.root.querySelector('#input-image');

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => {
                fileInput.click();
            });
        }

        this.setupActiveToolHighlighting();
    }

    initSinglePage() {
        const canvasWrapper = this.root.querySelector('#canvasWrapper');
        const pageWrapper = document.createElement('div');
        pageWrapper.className = 'canvas-page';
        const canvasEl = document.createElement('canvas');
        canvasEl.width = 1920;
        canvasEl.height = 700;
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
        this.currentPageIndex = 0;
        canvas.renderAll();
    }

    setCanvas(canvas) {
        this.canvas = canvas;
        setupCanvasEvents(this);
        setupDrawingTools(this);
        setupArrowTools(this);
        setupTextTools(this);
        setupLinkTools(this);
        setupBackgroundTools(this);
    }

    saveState() {
        saveState(this);
    }

    undo() {
        undo(this);
    }

    redo() {
        redo(this);
    }

    clearCanvas() {
        clearCanvas(this);
    }

    saveImage() {
        saveImage(this);
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
                this.canvas.isDrawingMode = true;

                this.canvas.once('mouse:up', () => {
                    this.canvas.isDrawingMode = false;
                    this.enableMouseTool();
                    this.setActiveButton('btn-mouse');
                });
                break;

            case 'btn-add-arrow':
                this.isDrawingArrow = true;

                this.canvas.once('mouse:up', () => {
                    this.isDrawingArrow = false;
                    this.enableMouseTool();
                    this.setActiveButton('btn-mouse');
                });
                break;

            case 'btn-add-text':
                this.isTextInsertMode = true;
                break;

            case 'btn-add-link':
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
}
