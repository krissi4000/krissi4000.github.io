
var gl, program, vbo, vPosition, uColor;

var WALK = [0.70, 0.70, 0.70, 1.0]; // light gray
var ROAD = [0.15, 0.15, 0.15, 1.0]; // dark gray
var LINE = [1.0, 1.0, 1.0, 1.0];    // white

var T = 0.02; // lína

var YELCAR = [0.9, 0.9, 0.2, 1.0];
var BLUECAR = [0.2, 0.2, 0.9, 1.0];
var REDCAR = [0.9, 0.2, 0.2, 1.0];
var FRIDA = [0.2, 0.8, 0.2, 1.0];

var TRAIN1 = [0.7, 0.3, 0.0, 1.0];
var TRAIN2 = [0.7, 0.3, 0.0, 1.0];

// bílar
var train2 = { x0: 1.2, y0: 0.7, x1: 2.5, y1: 0.9, dx: -0.009, dy: 0 }

var yelcar = { x0: -1.8, y0: 0.3, x1: -1.2, y1: 0.5, dx: 0.012, dy: 0 };
var bluecar = { x0: 1.2, y0: -0.1, x1: 1.5, y1: 0.1, dx: -0.024, dy: 0 };
var redcar = { x0: -1.5, y0: -0.5, x1: -1.2, y1: -0.3, dx: 0.020, dy: 0 };

var train1 = { x0: -2.5, y0: -0.9, x1: -1.2, y1: -0.7, dx: 0.007, dy: 0 }

// Fríða :)
var frida = {
    x0: -0.10, y0: -0.90,  
    x1: 0.10, y1: -0.90,  
    x2: 0.00, y2: -0.70   
};

var DY = 0.41;
var DX = 0.20;

var MOVE_COOLDOWN = 50;
var lastMoveTime = -Infinity;

const FRAME_MS = 1000 / 60;
let lastFrameTime = 0;

window.onload = init;

function init() {
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL not available"); return; }

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    gl.viewport(0, 0, canvas.width, canvas.height);

    pointsEl = document.getElementById('points');
    pointsEl.textContent = points;

    gl.clearColor(0, 0, 0, 1);

    vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    gl.bufferData(gl.ARRAY_BUFFER, 6 * 2 * 4, gl.DYNAMIC_DRAW);

    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    uColor = gl.getUniformLocation(program, "uColor");

    requestAnimationFrame(render);
}

function drawRect(x0, y0, x1, y1, color) {
    var verts = [
        vec2(x0, y0), vec2(x1, y0), vec2(x1, y1),
        vec2(x0, y0), vec2(x1, y1), vec2(x0, y1)
    ];
    gl.uniform4fv(uColor, new Float32Array(color));
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(verts));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function drawTri(ax, ay, bx, by, cx, cy, color) {
    var verts = [vec2(ax, ay), vec2(bx, by), vec2(cx, cy)];
    gl.uniform4fv(uColor, new Float32Array(color));
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(verts));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}



function hreyfaBil(r) {
    r.x0 += r.dx; r.x1 += r.dx;
    r.y0 += r.dy; r.y1 += r.dy;

    wrap(r);
}

function wrap(r) {
    if (r.dx > 0 && r.x0 > 1) { r.x0 = -1 - (r.x1 - r.x0); r.x1 = -1 }
    if (r.dx < 0 && r.x1 < -1) { r.x1 = 1 + (r.x1 - r.x0); r.x0 = 1 }
}

function hopp(f, dx, dy) {
    f.x0 += dx; f.x1 += dx; f.x2 += dx;
    f.y0 += dy; f.y1 += dy; f.y2 += dy;
}

let points = 0;
let pointsEl;
let fridaLane = 0;

document.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
    }

    if (event.repeat) return;  
    const now = performance.now();
    // if (now - lastMoveTime < MOVE_COOLDOWN) return;

    let moved = false;

    switch (event.key) {
        case 'ArrowUp':
            if (fridaLane < 4) {
                hopp(frida, 0, DY); moved = true;
                fridaLane++;
            }
            break;
        case 'ArrowDown':
            if (fridaLane > 0) {
                hopp(frida, 0, -DY); moved = true;
                fridaLane--;
            }
            break;
        case 'ArrowLeft':
            if (frida.x2 > -0.75) { hopp(frida, -DX, 0); moved = true; }
            break;
        case 'ArrowRight':
            if (frida.x2 < 0.75) { hopp(frida, DX, 0); moved = true; }
            break;
    }

    // Telur stig
    if (moved) {
        lastMoveTime = now;
        if (points % 2 == 0 && frida.y2 >= 0.94) {
            points++; pointsEl.textContent = points;
            rotateFrida(frida);
        }
        if (points % 2 == 1 && frida.y2 <= -0.7) {
            points++; pointsEl.textContent = points;
            rotateFrida(frida);
        }
    }
});

function rotateFrida(f) {
    var cx = (frida.x0 + frida.x1 + frida.x2) / 3
    var cy = (frida.y0 + frida.y1 + frida.y2) / 3

    f.x0 = 2 * cx - f.x0; f.x1 = 2 * cx - f.x1; f.x2 = 2 * cx - f.x2;
    f.y0 = 2 * cy - f.y0; f.y1 = 2 * cy - f.y1; f.y2 = 2 * cy - f.y2;
}

function collisionCheck() {

    if (fridaLane == 0) {
        if (Math.min(frida.x0, frida.x1) <= train1.x1 &&
            Math.max(frida.x0, frida.x1) >= train1.x0) {
            window.location.reload();
            return true;
        }
    }


    if (fridaLane == 1) {
        if (Math.min(frida.x0, frida.x1) <= redcar.x1 &&
            Math.max(frida.x0, frida.x1) >= redcar.x0) {
            window.location.reload();
            return true;
        }
    }
    if (fridaLane == 2) {
        if (Math.min(frida.x0, frida.x1) <= bluecar.x1 &&
            Math.max(frida.x0, frida.x1) >= bluecar.x0) {
            window.location.reload();
            return true;
        }
    }
    if (fridaLane == 3) {
        if (Math.min(frida.x0, frida.x1) <= yelcar.x1 &&
            Math.max(frida.x0, frida.x1) >= yelcar.x0) {
            window.location.reload();
            return true;
        }
    }
    if (fridaLane == 4) {
        if (Math.min(frida.x0, frida.x1) <= train2.x1 &&
            Math.max(frida.x0, frida.x1) >= train2.x0) {
            window.location.reload();
            return true;
        }
    }
}



function render(now) {

    if (now - lastFrameTime < FRAME_MS) {
        requestAnimationFrame(render);
        return;
    }
    lastFrameTime = now;

    gl.clear(gl.COLOR_BUFFER_BIT);

    drawRect(-1.0, -1.0, 1.0, 1.0, WALK);

    drawRect(-1.0, -0.6, 1.0, 0.6, ROAD);

    drawRect(-1.0, 0.2 - T / 2, 1.0, 0.2 + T / 2, LINE);
    drawRect(-1.0, -0.2 - T / 2, 1.0, -0.2 + T / 2, LINE);


    drawRect(train2.x0, train2.y0, train2.x1, train2.y1, TRAIN2);
    drawRect(redcar.x0, redcar.y0, redcar.x1, redcar.y1, REDCAR);
    drawRect(bluecar.x0, bluecar.y0, bluecar.x1, bluecar.y1, BLUECAR);
    drawRect(yelcar.x0, yelcar.y0, yelcar.x1, yelcar.y1, YELCAR);
    drawRect(train1.x0, train1.y0, train1.x1, train1.y1, TRAIN1);

    drawTri(
        frida.x0, frida.y0,
        frida.x1, frida.y1,
        frida.x2, frida.y2,
        FRIDA
    );

    hreyfaBil(train2);
    hreyfaBil(redcar);
    hreyfaBil(bluecar);
    hreyfaBil(yelcar);
    hreyfaBil(train1);

    if (collisionCheck()) return;

    requestAnimationFrame(render);
}
