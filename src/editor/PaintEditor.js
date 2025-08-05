import { applyFabricOverrides } from './utils/fabricOverrides.js';
import { setupCanvasEvents } from './canvas/events.js';
import { setupDrawingTools } from './canvas/drawing.js';
import { setupArrowTools } from './canvas/arrows.js';
import { setupTextTools } from './canvas/text.js';
import { setupLinkTools } from './canvas/links.js';
import { setupBackgroundTools } from './canvas/background.js';
import { handlePaste, handleCopy } from './clipboard/index.js';
import { initPages, addPage, switchToPage, renderPageTabs } from './pages/PageManager.js';
import { saveState } from './state/history.js';
import { undo, redo } from './state/undoRedo.js';
import { clearCanvas, saveImage } from './utils/helpers.js';
import { setupToolbar } from '../components/Toolbar.js';
import { setupColorPalette } from '../components/ColorPalette.js';
import { setupLinkToolbar } from '../components/LinkToolbar.js';
import { setupPageTabs } from '../components/PageTabs.js';

export default class PaintEditor {
    constructor() {
        applyFabricOverrides();

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
        this.initUI();
        this.pages = initPages(this);
        addPage(this);
    }

    init() {
        document.addEventListener('paste', (e) => handlePaste(e, this));
        document.addEventListener('copy', (e) => handleCopy(e, this));
    }

    initUI() {
        setupToolbar(this);
        setupColorPalette(this);
        setupLinkToolbar(this);
        setupPageTabs(this);
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

    switchToPage(index) {
        switchToPage(this, index);
    }

    renderPageTabs() {
        renderPageTabs(this);
    }

    addPage() {
        addPage(this);
    }
}
