export function generateCanvasPreviewFromUrl(
  url,
  { width = 1920, height = 1080, marginRatio = 0.10, background = null } = {}
) {
  return new Promise((resolve, reject) => {
    const canvasEl = document.createElement('canvas');
    canvasEl.width = width;
    canvasEl.height = height;
    const canvas = new fabric.Canvas(canvasEl, { selection: false });

    if (background) {
      canvas.add(new fabric.Rect({ left: 0, top: 0, width, height, fill: background, selectable: false, evented: false }));
    }

    fabric.Image.fromURL(
      url,
      (img) => {
        try {
          const maxW = width * (1 - marginRatio);
          const maxH = height * (1 - marginRatio);
          const scale = Math.min(1, maxW / (img.width || maxW), maxH / (img.height || maxH));
          if (scale < 1) img.scale(scale);

          img.set({
            left: width / 2, top: height / 2, originX: 'center', originY: 'center',
            selectable: false, evented: false, objectCaching: false
          });

          canvas.add(img);
          canvas.renderAll();

          const previewDataUrl = canvas.toDataURL({ format: "png", quality: 1, width, height, multiplier: 1 });
          const canvasJSON = canvas.toJSON();

          canvas.dispose();
          resolve({ previewDataUrl, canvasJSON });
        } catch (e) {
          canvas.dispose();
          reject(e);
        }
      },
      { crossOrigin: 'anonymous' }
    );
  });
}
