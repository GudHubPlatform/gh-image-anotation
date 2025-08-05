export function setupArrowTools(editor) {
    editor.addArrow = () => {
        editor.enableArrowDrawing();
        editor.lockCanvasInteractions();
    };

    editor.enableArrowDrawing = () => {
        editor.disableDrawingMode();
        editor.isDrawingArrow = true;
        editor.canvas.defaultCursor = 'crosshair';
        editor.canvas.selection = false;
    };

    editor.onMouseMove = function (opt) {
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
    };

    editor.onMouseUp = function (event) {
        if (!this.isDrawingArrow || !this.tempArrow) return;

        const pointer = this.canvas.getPointer(event.e);
        this.canvas.remove(this.tempArrow);

        this.isAddingFinalArrow = true;

        const finalArrow = this.createArrow(
            this.arrowStart.x,
            this.arrowStart.y,
            pointer.x,
            pointer.y,
            this.currentColor
        );

        this.canvas.add(finalArrow);
        this.canvas.setActiveObject(finalArrow);
        this.canvas.requestRenderAll();
        this.saveState();

        this.isAddingFinalArrow = false;
        this.tempArrow = null;
        this.arrowStart = null;
        this.isDrawingArrow = false;
        this.canvas.defaultCursor = 'default';

        this.unlockCanvasInteractions();
    };

    editor.onMouseDown = function (e) {
        if (this.isDrawingArrow) {
            const pointer = this.canvas.getPointer(e.e);
            this.arrowStart = { x: pointer.x, y: pointer.y };
        }
    };

    editor.createArrow = function (fromX, fromY, toX, toY, color) {
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

        return new fabric.Group([shaft, head], {
            left: Math.min(fromX, toX),
            top: Math.min(fromY, toY),
            selectable: true,
            evented: true,
            objectCaching: false,
            hasControls: true,
            hasBorders: true
        });
    };
};
