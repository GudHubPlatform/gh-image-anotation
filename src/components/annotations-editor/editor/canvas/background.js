export function setupBackgroundTools(editor) {
  const placeAsBackground = (img) => {
    const canvasWidth = editor.canvas.getWidth();
    const canvasHeight = editor.canvas.getHeight();
    const padding = 300;
    const maxWidth = canvasWidth - padding * 2;
    const maxHeight = canvasHeight - padding;
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
    editor.canvas.setBackgroundImage(img, editor.canvas.renderAll.bind(editor.canvas));
    if (typeof editor.saveState === 'function') editor.saveState();
  };

  editor.setBackgroundImage = () => {
    if (editor.disableDrawingMode) editor.disableDrawingMode();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        fabric.Image.fromURL(e.target.result, (img) => {
          placeAsBackground(img);
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  editor.setBackgroundImageFromURL = (url) => {
    if (!url) return;
    if (editor.disableDrawingMode) editor.disableDrawingMode();
    fabric.Image.fromURL(
      url,
      (img) => {
        placeAsBackground(img);
      },
      { crossOrigin: 'anonymous' }
    );
  };

  editor.restoreBackgroundImageScale = () => {
    const bg = editor.canvas.backgroundImage;
    if (!bg) return;
    const canvasWidth = editor.canvas.getWidth();
    const canvasHeight = editor.canvas.getHeight();
    const padding = 300;
    const maxWidth = canvasWidth - padding * 2;
    const maxHeight = canvasHeight - padding;
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
    editor.canvas.requestRenderAll();
  };
}
