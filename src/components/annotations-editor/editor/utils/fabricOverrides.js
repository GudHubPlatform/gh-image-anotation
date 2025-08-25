export function applyFabricOverrides() {
    fabric.Object.prototype.borderColor = '#0D99FF';
    fabric.Object.prototype.cornerColor = '#0D99FF';
    fabric.Object.prototype.cornerSize = 8;
    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.cornerStyle = 'square';
    fabric.Object.prototype.borderScaleFactor = 2;

    fabric.Object.prototype.controls.deleteControl = new fabric.Control({
        x: -0.5,
        y: -0.5,
        offsetY: -25,
        offsetX: -25,
        sizeX: 20,
        sizeY: 20,
        cornerSize: 20,
        cursorStyle: 'pointer',
        mouseUpHandler: function (eventData, transform) {
            const target = transform.target;
            const canvas = target.canvas;

            if (target.borderRect) {
                canvas.remove(target.borderRect);
            }

            if (target.linkedTextbox) {
                canvas.remove(target.linkedTextbox);
            }

            canvas.remove(target);
            canvas.requestRenderAll();
        },
        render: function (ctx, left, top, styleOverride, fabricObject) {
            const size = this.cornerSize;
            ctx.save();
            ctx.translate(left, top);
            ctx.beginPath();
            ctx.arc(0, 0, size / 2, 0, 2 * Math.PI, false);
            ctx.fillStyle = 'red';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(-size / 4, -size / 4);
            ctx.lineTo(size / 4, size / 4);
            ctx.moveTo(-size / 4, size / 4);
            ctx.lineTo(size / 4, -size / 4);
            ctx.stroke();
            ctx.restore();
        }
    });

    const originalTextboxInitialize = fabric.Textbox.prototype.initialize;
    fabric.Textbox.prototype.initialize = function (...args) {
        originalTextboxInitialize.call(this, ...args);
        this.controls = {
            ...fabric.Object.prototype.controls,
            deleteControl: fabric.Object.prototype.controls.deleteControl
        };
    };
};
