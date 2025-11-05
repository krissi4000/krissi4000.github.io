////////////////////////////////////////////////////////////////////
// Þríis ! (óklárað)
////////////////////////////////////////////////////////////////////

var canvas;
var gl;

var colorLoc;
var mvLoc;
var pLoc;
var vPosition;

var proj;

var cubeBuffer;
var numCubeVertices = 36;

// grid
var GRID_X = 6;
var GRID_Y = 6;
var GRID_Z = 20;
var cubeSize = 1.0;

var board = null;

// Trominos
var SHAPES = {
  blue: {
    color: vec4(0.2, 0.8, 0.9, 1.0),
    blocks: [
    {x:0, y:0, z:0},
    {x:0, y:0, z:1},
    {x:0, y:0, z:2}
  ],
    midja: {x:0, y:0, z:1}
  },
  orange: {
    color: vec4(0.8, 0.6, 0.2, 0.7),
    blocks: [
    {x:0, y:0, z:0},
    {x:0, y:0, z:1},
    {x:0, y:1, z:0}
  ],
    midja: {x:0, y:0, z:0}
  }
}

var dropInterval = 0.5;
var dropTimer = 0.0;
var lastFrameTime = null;

var activePiece = null;



// litir
var COLOR_BG   = vec4(0.05, 0.05, 0.08, 1.0);
var COLOR_CUBE = vec4(0.2, 0.8, 0.9, 1.0);
var COLOR_GRID = vec4(0.25, 0.25, 0.30, 0.5);

// hnútar fyrir kassa
var cVertices = [
    // front
    vec3(-0.5,  0.5,  0.5), vec3(-0.5, -0.5,  0.5), vec3( 0.5, -0.5,  0.5),
    vec3( 0.5, -0.5,  0.5), vec3( 0.5,  0.5,  0.5), vec3(-0.5,  0.5,  0.5),
    // right
    vec3( 0.5,  0.5,  0.5), vec3( 0.5, -0.5,  0.5), vec3( 0.5, -0.5, -0.5),
    vec3( 0.5, -0.5, -0.5), vec3( 0.5,  0.5, -0.5), vec3( 0.5,  0.5,  0.5),
    // bottom
    vec3( 0.5, -0.5,  0.5), vec3(-0.5, -0.5,  0.5), vec3(-0.5, -0.5, -0.5),
    vec3(-0.5, -0.5, -0.5), vec3( 0.5, -0.5, -0.5), vec3( 0.5, -0.5,  0.5),
    // top
    vec3( 0.5,  0.5, -0.5), vec3(-0.5,  0.5, -0.5), vec3(-0.5,  0.5,  0.5),
    vec3(-0.5,  0.5,  0.5), vec3( 0.5,  0.5,  0.5), vec3( 0.5,  0.5, -0.5),
    // back
    vec3(-0.5, -0.5, -0.5), vec3(-0.5,  0.5, -0.5), vec3( 0.5,  0.5, -0.5),
    vec3( 0.5,  0.5, -0.5), vec3( 0.5, -0.5, -0.5), vec3(-0.5, -0.5, -0.5),
    // left
    vec3(-0.5,  0.5, -0.5), vec3(-0.5, -0.5, -0.5), vec3(-0.5, -0.5,  0.5),
    vec3(-0.5, -0.5,  0.5), vec3(-0.5,  0.5,  0.5), vec3(-0.5,  0.5, -0.5)
];

var gameState = {
    time: 0.0
};

////////////////////////////////////////////////////////////////////
// stjórna myndavél með mús
////////////////////////////////////////////////////////////////////

// fjarlægð frá miðju
var camRadius = 30.0;

// lárétt horn
var camYaw   = 225.0;

// lóðrétt horn
var camPitch = 30.0;

var dragging = false;
var lastX = 0;
var lastY = 0;

var yawSpeed   = 0.3;
var pitchSpeed = 0.3;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2], COLOR_BG[3]);
    gl.enable(gl.DEPTH_TEST);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    cubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cVertices), gl.STATIC_DRAW);

    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    colorLoc = gl.getUniformLocation(program, "fColor");
    mvLoc    = gl.getUniformLocation(program, "modelview");
    pLoc     = gl.getUniformLocation(program, "projection");

    var aspect = canvas.width / canvas.height;
    proj = perspective(45.0, aspect, 1.0, 200.0);
    gl.uniformMatrix4fv(pLoc, false, flatten(proj));
  
    initBoard();
    
    spawnInitialPiece();


    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup",   onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp);

    window.addEventListener("keydown", onKeyDown)

    requestAnimFrame(render);
};

function initBoard() {
    board = new Array(GRID_X);
    for (var x = 0; x < GRID_X; x++) {
        board[x] = new Array(GRID_Y);
        for (var y = 0; y < GRID_Y; y++) {
            board[x][y] = new Array(GRID_Z);
            for (var z = 0; z < GRID_Z; z++) {
                board[x][y][z] = 0;
            }
        }
    }
}

function spawnInitialPiece() {
  activePiece = {
    shape: SHAPES.blue,
    x: Math.floor(GRID_X / 2),
    y: Math.floor(GRID_Y / 2),
    z: GRID_Z - 3
  };
}

function forEachBlock(piece, fn) {
    var s = piece.shape;
    for (var i = 0; i < s.blocks.length; i++) {
        var b = s.blocks[i];
        var gx = piece.x + b.x;
        var gy = piece.y + b.y;
        var gz = piece.z + b.z;
        fn(gx, gy, gz);
    }
}


function gridToWorld(i, j, k) {
  var cx = (GRID_X-1) / 2.0;
  var cy = (GRID_Y-1) / 2.0;
  var cz = (GRID_Z-1) / 2.0;

  var x = (i - cx) * cubeSize;
  var y = (j - cy) * cubeSize;
  var z = (k - cz) * cubeSize;

  return vec3(x, y, z);
}

////////////////////////////////////////////////////////////////////
// Controls 
////////////////////////////////////////////////////////////////////


// Stjórnað myndavél með mús


function onMouseDown(e) {
    // only left button
    if (e.button !== 0) return;

    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
}

function onMouseMove(e) {
    if (!dragging) return;

    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;

    lastX = e.clientX;
    lastY = e.clientY;

    camYaw   -= dx * yawSpeed;
    camPitch += dy * pitchSpeed;  

    if (camYaw >= 360.0) camYaw -= 360.0;
    if (camYaw < 0.0)    camYaw += 360.0;

    var minPitch = -89.0;
    var maxPitch =  89.0;
    if (camPitch < minPitch) camPitch = minPitch;
    if (camPitch > maxPitch) camPitch = maxPitch;
}

function onMouseUp(e) {
    dragging = false;
}

// Stjórnað pieces með lyklaborði, skv verkefnalýsingu


function onKeyDown(e) {
  if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space"].includes(e.code)) {
    e.preventDefault();
  }

  if (!activePiece) return;

  switch (e.code) {
    case "ArrowLeft":
      // x-as vinstri
      movePiece(-1, 0);
      break;

    case "ArrowRight":
      // x-as haegri
      movePiece(1, 0);
      break;

    case "ArrowUp":
      // x-as upp
      movePiece(0, 1);
      break;

    case "ArrowDown":
      // x-as nidur
      movePiece(0,-1);
      break;

    case "Space":
        hardDrop();
    case "KeyA":
      rotatePieceX(1);
      break;
    case "KeyZ":
      rotatePieceX(-1);
      break;
    case "KeyS":
      rotatePieceY(1);
      break;
    case "KeyX":
      rotatePieceY(-1);
      break;
    case "KeyD":
      rotatePieceZ(1);
      break;
    case "KeyC":
      rotatePieceZ(-1);
      break;
  }
}

////////////////////////////////////////////////////////////////////
// Drawing helpers
////////////////////////////////////////////////////////////////////

function drawCube(x, y, z, size, color, viewMatrix) {
    var mv = viewMatrix;

    mv = mult(mv, translate(x, y, z));
    mv = mult(mv, scalem(size, size, size));

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);

    gl.uniform4fv(colorLoc, color);
    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));

    gl.drawArrays(gl.TRIANGLES, 0, numCubeVertices);
}

function drawGridFloor(viewMatrix) {
    for (var i=0; i < GRID_X; i++) {
      for (var j=0; j<GRID_Y; j++) {
        var pos = gridToWorld(i, j, 0);

      drawCube(pos[0], pos[1], pos[2]-1, cubeSize * 0.95, COLOR_GRID, viewMatrix);
    }
  }
}

function drawActivePiece(viewMatrix) {
    if (!activePiece) return;

    var shapeColor = activePiece.shape.color;

    forEachBlock(activePiece, function (gx, gy, gz) {
        var pos = gridToWorld(gx, gy, gz);

        drawCube(
            pos[0], pos[1],pos[2],
            cubeSize * 0.95,
            shapeColor,
            viewMatrix
        );
    });
}

function drawBoard(viewMatrix) {
  for (let x=0; x < GRID_X; x++) {
    for (let y = 0; y < GRID_Y; y++) {
      for (let z = 0; z < GRID_Z; z++) {
        var id = board[x][y][z];
        if (id === 0) continue;

        var col;
        
        if (id === 1) {
          col = SHAPES.blue.color;
        } else if (id === 2) {
          col = SHAPES.orange.color;
        } else {
          col = COLOR_CUBE;
        }
        var pos = gridToWorld(x, y, z);
        drawCube(
          pos[0], pos[1], pos[2],
          cubeSize * 0.95,
          col,
          viewMatrix
        );
      }
    }
  }
}

////////////////////////////////////////////////////////////////////
// Piece logic/movement
////////////////////////////////////////////////////////////////////

function checkCollision(piece) {
  var collided = false;
  
  forEachBlock(piece, function (gx, gy, gz) {
    if (gz === 0 || board[gx][gy][gz-1] !== 0){
      collided = true;
      return;
    }
  });
  if (collided){
    lockPiece(piece);
  }
}
function isCollision(piece) {
 
  var collision = false;
    forEachBlock(piece, function (gx, gy, gz) {
    if (gz === 0 || board[gx][gy][gz-1] !== 0){
      collision = true;
    } 
  });
  return collision;
}

function dropPiece() {
  activePiece.z -= 1;
  checkCollision(activePiece);
}

function hardDrop() {
  while (!isCollision(activePiece)){
    activePiece.z -= 1;
  }
  checkCollision(activePiece);
  
}



function isPosIllegal(piece) {
  var illegal = false;

  forEachBlock(piece, function (gx, gy, gz) {
    if (gx < 0 || gx >= GRID_X ||
        gy < 0 || gy >= GRID_Y ||
        gz < 0 || gz >= GRID_Z) {
      illegal = true;
      return;
    }

    if (board[gx][gy][gz] !== 0) {
      illegal = true;
      return;
    }
  });

  return illegal;
}

function movePiece(dx, dy) {
    if (!activePiece) return;

    var oldX = activePiece.x;
    var oldY = activePiece.y;

    activePiece.x += dx;
    activePiece.y += dy;

    if (isPosIllegal(activePiece)) {
        activePiece.x = oldX;
        activePiece.y = oldY;
        return;
    }

    checkCollision(activePiece);
}
function rotatePieceX(dir) {
 // TODO: rotate 

}

function rotatePieceY() { }

function rotatePieceZ() { }



function lockPiece(piece) {

  var colorId = 1;
  if (piece.shape === SHAPES.orange) {colorId = 2;}

  forEachBlock(piece, function (gx, gy, gz) {
    board[gx][gy][gz] = colorId;

  });

  spawnInitialPiece();
}



////////////////////////////////////////////////////////////////////
// Main render loop
////////////////////////////////////////////////////////////////////


function render(now) {
    if (lastFrameTime === null) {
        lastFrameTime = now;
    }

    var dt = (now - lastFrameTime) 
    lastFrameTime = now;

    gameState.time += dt;
    dropTimer += dt;

    if (dropTimer >= dropInterval) {
        dropPiece();
        dropTimer -= dropInterval;
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var yawRad   = radians(camYaw);
    var pitchRad = radians(camPitch);

    var eyeX = camRadius * Math.cos(pitchRad) * Math.cos(yawRad);
    var eyeY = camRadius * Math.cos(pitchRad) * Math.sin(yawRad);
    var eyeZ = camRadius * Math.sin(pitchRad);

    var eye = vec3(eyeX, eyeY, eyeZ);

    var at  = vec3(0.0, 0.0, 0.0);
    var up  = vec3(0.0, 0.0, 1.0);

    var mv = lookAt(eye, at, up);


    drawGridFloor(mv);
    drawBoard(mv);
    drawActivePiece(mv);

    requestAnimFrame(render);
}

