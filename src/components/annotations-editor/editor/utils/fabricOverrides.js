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
    offsetY: -18,
    offsetX: -18,
    sizeX: 20,
    sizeY: 20,
    cornerSize: 20,
    cursorStyle: 'pointer',
    mouseUpHandler: function (_eventData, transform) {
      const target = transform.target;
      const canvas = target.canvas;
      if (!canvas) return;

      const removeWithHelpers = (obj) => {
        if (obj.borderRect) {
          try { canvas.remove(obj.borderRect); } catch {}
        }
        if (obj.linkedTextbox) {
          try { canvas.remove(obj.linkedTextbox); } catch {}
        }
        try { canvas.remove(obj); } catch {}
      };

      const active = canvas.getActiveObject();
      if (active && active.type === 'activeSelection' && Array.isArray(active._objects) && active._objects.length) {
        const toRemove = active._objects.slice();
        canvas.discardActiveObject();
        toRemove.forEach(obj => removeWithHelpers(obj));
        canvas.requestRenderAll();
        return;
      }

      removeWithHelpers(target);
      canvas.requestRenderAll();
    },
    render: function (ctx, left, top) {
      const size = this.cornerSize;
      ctx.save();
      ctx.translate(left, top);
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'red';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
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
    this.set({
      fontFamily: 'Arial, sans-serif',
      fontSize: 16
    });

    this.controls = {
      ...fabric.Object.prototype.controls,
      deleteControl: fabric.Object.prototype.controls.deleteControl
    };
  };
}
