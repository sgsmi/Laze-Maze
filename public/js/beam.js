const container = document.getElementById('grid-container');
const gridEl    = document.getElementById('grid');
const beamCanvas= document.getElementById('beamCanvas');
const bctx      = beamCanvas.getContext('2d');


export function syncCanvasSize(canvas) {
  canvas.width  = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}

export function onResize() {
  syncCanvasSize(beamCanvas);
  drawBeam(bctx, 0, 0, beamCanvas.width, beamCanvas.height);
}

// Then drawBeam(bctx, ...);
export function drawBeam(ctx, startX, startY, endX, endY) {
    ctx.clearRect(0, 0, beamCanvas.width, beamCanvas.height);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

