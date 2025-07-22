const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

function resizeCanvasToFit() {
  const topBarHeight = document.querySelector('.top-bar').offsetHeight;
  const tabBarHeight = document.querySelector('.tab-bar').offsetHeight;

  const displayWidth = window.innerWidth;
  const displayHeight = window.innerHeight - topBarHeight - tabBarHeight;

  // Set the display size via CSS
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
  canvas.style.position = 'absolute';
  canvas.style.top = topBarHeight + 'px';

  // Set internal resolution to 2x
  canvas.width = displayWidth * 4;
  canvas.height = displayHeight * 4;

  // Scale context
  ctx.setTransform(1, 0, 0, 1, 0, 0); // reset any previous scale
  ctx.scale(4, 4);
}

window.addEventListener('resize', resizeCanvasToFit);
resizeCanvasToFit();


let drawing = false;

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left,
    y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
  };
}

function startDraw(e) {
  drawing = true;
  const pos = getPos(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
}

function draw(e) {
  if (!drawing) return;
  const pos = getPos(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function endDraw() {
  drawing = false;
  ctx.closePath();
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Mouse events
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', endDraw);
canvas.addEventListener('mouseout', endDraw);

// Touch events
canvas.addEventListener('touchstart', startDraw);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', endDraw);