////////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//    Byggt á sýnisforriti í C fyrir OpenGL, höfundur óþekktur.
//
//     Bíll sem keyrir í hringi í umhverfi með húsum.  Hægt að
//    breyta sjónarhorni áhorfanda með því að slá á 1, 2, ..., 8.
//    Einnig hægt að breyta hæð áhorfanda með upp/niður örvum.
//    Leiðrétt útgáfa fyrir réttan snúning í MV.js
//
//    Hjálmtýr Hafsteinsson, september 2025
////////////////////////////////////////////////////////////////////
var canvas;
var gl;

// position of the track
var TRACK_RADIUS = 100.0;
var TRACK_INNER = 90.0;

var LANE_INNER = 95.0;
var LANE_OUTER = 104.0;


var TRACK_OUTER = 110.0;
var TRACK_PTS = 100;

var BLUE = vec4(0.0, 0.0, 1.0, 1.0);
var RED = vec4(1.0, 0.0, 0.0, 1.0);
var YELLOW = vec4(1.0, 1.0, 0.0, 1.0);
var GREEN = vec4(0.0, 1.0, 0.0, 1.0);
var GRAY = vec4(0.4, 0.4, 0.4, 1.0);
var BROWN = vec4(1.0, 0.5, 0.1, 1.0);

var numCubeVertices = 36;
var numPyramidVertices = 18;
var numTrackVertices = 2 * TRACK_PTS + 2;


// variables for moving car
var carDirection = 0.0;
var car1XPos = 100.0;
var car1YPos = 0.0;
var height = 0.0;

// current viewpoint
var view = 1;

var colorLoc;
var mvLoc;
var pLoc;
var proj;

var pyramidBuffer;
var cubeBuffer;

var tunnelBuffer;
var trackBuffer;
var vPosition;

// the 36 vertices of the cube
var cVertices = [
    // front side:
    vec3(-0.5, 0.5, 0.5), vec3(-0.5, -0.5, 0.5), vec3(0.5, -0.5, 0.5),
    vec3(0.5, -0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(-0.5, 0.5, 0.5),
    // right side:
    vec3(0.5, 0.5, 0.5), vec3(0.5, -0.5, 0.5), vec3(0.5, -0.5, -0.5),
    vec3(0.5, -0.5, -0.5), vec3(0.5, 0.5, -0.5), vec3(0.5, 0.5, 0.5),
    // bottom side:
    vec3(0.5, -0.5, 0.5), vec3(-0.5, -0.5, 0.5), vec3(-0.5, -0.5, -0.5),
    vec3(-0.5, -0.5, -0.5), vec3(0.5, -0.5, -0.5), vec3(0.5, -0.5, 0.5),
    // top side:
    vec3(0.5, 0.5, -0.5), vec3(-0.5, 0.5, -0.5), vec3(-0.5, 0.5, 0.5),
    vec3(-0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, -0.5),
    // back side:
    vec3(-0.5, -0.5, -0.5), vec3(-0.5, 0.5, -0.5), vec3(0.5, 0.5, -0.5),
    vec3(0.5, 0.5, -0.5), vec3(0.5, -0.5, -0.5), vec3(-0.5, -0.5, -0.5),
    // left side:
    vec3(-0.5, 0.5, -0.5), vec3(-0.5, -0.5, -0.5), vec3(-0.5, -0.5, 0.5),
    vec3(-0.5, -0.5, 0.5), vec3(-0.5, 0.5, 0.5), vec3(-0.5, 0.5, -0.5)
];

// pýramidi
var pVertices = [
    // front side:
    vec3(-0.5, -0.5, -0.5), vec3(0.5, -0.5, -0.5), vec3(0.0, 0.0, 0.5),
    // right side:
    vec3(0.5, -0.5, -0.5), vec3(0.5, 0.5, -0.5), vec3(0.0, 0.0, 0.5),
    // back side:
    vec3(0.5, 0.5, -0.5), vec3(-0.5, 0.5, -0.5), vec3(0.0, 0.0, 0.5),
    // left side:
    vec3(-0.5, 0.5, -0.5), vec3(-0.5, -0.5, -0.5), vec3(0.0, 0.0, 0.5),
    // bottom side:
    vec3(0.5, -0.5, -0.5), vec3(-0.5, -0.5, -0.5), vec3(-0.5, 0.5, -0.5),
    vec3(-0.5, 0.5, -0.5), vec3(0.5, 0.5, -0.5), vec3(0.5, -0.5, -0.5)
]

// vertices of the track
var tVertices = [];




window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.7, 1.0, 0.7, 1.0);

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    createTrack();

    // VBO for the track
    trackBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, trackBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(tVertices), gl.STATIC_DRAW);

    // VBO for the cube
    cubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cVertices), gl.STATIC_DRAW);

    // VBO for the pyramid
    pyramidBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pyramidBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pVertices), gl.STATIC_DRAW);

    // VBO the tunnel
    // tunnelBuffer = gl.createBuffer();
    // gl.bindBuffer( gl.ARRAY_BUFFER, tunnelBuffer);
    // gl.bufferData( gl.ARRAY_BUFFER, flatten(gVertices), gl)


    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    colorLoc = gl.getUniformLocation(program, "fColor");

    mvLoc = gl.getUniformLocation(program, "modelview");

    // set projection
    pLoc = gl.getUniformLocation(program, "projection");
    proj = perspective(50.0, 1.0, 1.0, 500.0);
    gl.uniformMatrix4fv(pLoc, false, flatten(proj));

    document.getElementById("Viewpoint").innerHTML = "1: Fjarlægt sjónarhorn";
    document.getElementById("Height").innerHTML = "Viðbótarhæð: " + height;

    // Event listener for keyboard
    window.addEventListener("keydown", function (e) {
        switch (e.keyCode) {
            case 49:	// 1: distant and stationary viewpoint
                view = 1;
                document.getElementById("Viewpoint").innerHTML = "1: Fjarlægt sjónarhorn";
                break;
            case 50:	// 2: panning camera inside the track
                view = 2;
                document.getElementById("Viewpoint").innerHTML = "2: Horfa á bílinn innan úr hringnum";
                break;
            case 51:	// 3: panning camera inside the track
                view = 3;
                document.getElementById("Viewpoint").innerHTML = "3: Horfa á bílinn fyrir utan hringinn";
                break;
            case 52:	// 4: driver's point of view
                view = 4;
                document.getElementById("Viewpoint").innerHTML = "4: Sjónarhorn ökumanns";
                break;
            case 53:	// 5: drive around while looking at a house
                view = 5;
                document.getElementById("Viewpoint").innerHTML = "5: Horfa alltaf á eitt hús innan úr bílnum";
                break;
            case 54:	// 6: Above and behind the car
                view = 6;
                document.getElementById("Viewpoint").innerHTML = "6: Fyrir aftan og ofan bílinn";
                break;
            case 55:	// 7: from another car in front
                view = 7;
                document.getElementById("Viewpoint").innerHTML = "7: Horft aftur úr bíl fyrir framan";
                break;
            case 56:	// 8: from beside the car
                view = 8;
                document.getElementById("Viewpoint").innerHTML = "8: Til hliðar við bílinn";
                break;

            case 38:    // up arrow
                height += 2.0;
                document.getElementById("Height").innerHTML = "Viðbótarhæð: " + height;
                break;
            case 40:    // down arrow
                height -= 2.0;
                document.getElementById("Height").innerHTML = "Viðbótarhæð: " + height;
                break;
        }
    });

    render();
}


// create the vertices that form the car track
function createTrack() {

    var theta = 0.0;
    for (var i = 0; i <= TRACK_PTS; i++) {
        var p1 = vec3(TRACK_OUTER * Math.cos(radians(theta)), TRACK_OUTER * Math.sin(radians(theta)), 0.0);
        var p2 = vec3(TRACK_INNER * Math.cos(radians(theta)), TRACK_INNER * Math.sin(radians(theta)), 0.0)
        tVertices.push(p1);
        tVertices.push(p2);
        theta += 360.0 / TRACK_PTS;
    }
}

function createTunnel(mv) {

    gl.uniform4fv(colorLoc, BROWN);

    mv = mult(mv, translate(95.0, 0.0, 10.0 ));
    mv = mult(mv, scalem(5.0, 25.0, 5.0));

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
    gl.drawArrays(gl.TRIANGLES, 0, numCubeVertices);

}


function roof(x, y, z, size, zscale, mv, color) {
    gl.uniform4fv(colorLoc, color);

    mv = mult(mv, translate(x, y, z));
    mv = mult(mv, scalem(size, size, zscale));

    gl.bindBuffer(gl.ARRAY_BUFFER, pyramidBuffer);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
    gl.drawArrays(gl.TRIANGLES, 0, numPyramidVertices);

}


// draw a house in location (x, y) of size size
function cube(x, y, z, size, zscale, mv, color) {

    gl.uniform4fv(colorLoc, color);

    mv = mult(mv, translate(x, y, z));
    mv = mult(mv, scalem(size, size, zscale));

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
    gl.drawArrays(gl.TRIANGLES, 0, numCubeVertices);
}

function house1(x, y, size, mv) {

    cube(x, y, 0, size, size, mv, YELLOW);
    roof(x, y, (size * 0.75), size, size / 2, mv, GREEN);
}

function house2(x, y, size, mv) {

    cube(x, y, 0, size, size / 2, mv, RED);
    roof(x, y, size / 2, size, size / 2, mv, BLUE);
}

function house3(x, y, size, mv) {

    cube(x, y, 0, size, size * 1.5, mv, GREEN);
    roof(x, y, size, size, size / 2, mv, RED);
}


// draw the circular track and a few houses (i.e. red cubes)
function drawScenery(mv) {

    // draw track
    gl.uniform4fv(colorLoc, GRAY);
    gl.bindBuffer(gl.ARRAY_BUFFER, trackBuffer);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, numTrackVertices);

    createTunnel(mv);



    // hús
    house1(20.0, 50.0, 12.0, mv)
    house1(-36.0, 5.0, 8.0, mv)
    house1(-40.0, -50.0, 10.0, mv)
    house1(10.0, 70.0, 10.0, mv)

    house2(-10.0, 20.0, 7.0, mv)
    house2(50, 10.0, 10.0, mv)
    house2(22.0, -40.0, 12.0, mv)

    house3(0.0, 0.0, 8, mv)
    house3(30.0, 30.0, 10, mv)
    house3(-20.0, -60.0, 12, mv)

}


// draw car as two blue cubes
function drawCar1(mv) {

    // set color to blue
    gl.uniform4fv(colorLoc, BLUE);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);

    var mv1 = mv;
    // lower body of the car
    mv = mult(mv, scalem(10.0, 3.0, 2.0));
    mv = mult(mv, translate(0.0, 0.0, 0.5));

    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
    gl.drawArrays(gl.TRIANGLES, 0, numCubeVertices);

    // upper part of the car
    mv1 = mult(mv1, scalem(4.0, 3.0, 2.0));
    mv1 = mult(mv1, translate(-0.2, 0.0, 1.5));

    gl.uniformMatrix4fv(mvLoc, false, flatten(mv1));
    gl.drawArrays(gl.TRIANGLES, 0, numCubeVertices);
}


function drawCar2(mv) {

    // set color to blue
    gl.uniform4fv(colorLoc, RED);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);

    var mv2 = mv;
    // lower body of the car
    mv = mult(mv, scalem(10.0, 3.0, 2.0));
    mv = mult(mv, translate(0.0, 0.0, 0.5));

    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
    gl.drawArrays(gl.TRIANGLES, 0, numCubeVertices);

    // upper part of the car
    mv2 = mult(mv2, scalem(4.0, 3.0, 2.0));
    mv2 = mult(mv2, translate(-0.2, 0.0, 1.5));

    gl.uniformMatrix4fv(mvLoc, false, flatten(mv2));
    gl.drawArrays(gl.TRIANGLES, 0, numCubeVertices);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    carDirection += 3.0;
    if (carDirection > 360.0) carDirection = 0.0;

    car1XPos = LANE_INNER * Math.sin(radians(carDirection));
    car1YPos = LANE_INNER * Math.cos(radians(carDirection));

    car2XPos = -LANE_OUTER * Math.sin(radians(carDirection));
    car2YPos = LANE_OUTER * Math.cos(radians(carDirection));

    var mv = mat4();
    switch (view) {
        case 1:
            // Distant and stationary viewpoint
            mv = lookAt(vec3(250.0, 0.0, 100.0 + height), vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0));
            drawScenery(mv);

            mv = mult(mv, translate(car1XPos, car1YPos, 0.0));
            mv = mult(mv, rotateZ(-carDirection));
            drawCar1(mv);

            mv = lookAt(vec3(250.0, 0.0, 100.0 + height), vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0));
            mv = mult(mv, translate(car2XPos, car2YPos, 0.0));
            mv = mult(mv, rotateZ(carDirection));

            drawCar2(mv);

            break;
        case 2:
            // Static viewpoint inside the track; camera follows car
            mv = lookAt(vec3(75.0, 0.0, 5.0 + height), vec3(car1XPos, car1YPos, 0.0), vec3(0.0, 0.0, 1.0));
            drawScenery(mv);
            mv = mult(mv, translate(car1XPos, car1YPos, 0.0));
            mv = mult(mv, rotateZ(-carDirection));
            drawCar1(mv);
            break;
        case 3:
            // Static viewpoint outside the track; camera follows car
            mv = lookAt(vec3(125.0, 0.0, 5.0 + height), vec3(car1XPos, car1YPos, 0.0), vec3(0.0, 0.0, 1.0));
            drawScenery(mv);
            mv = mult(mv, translate(car1XPos, car1YPos, 0.0));
            mv = mult(mv, rotateZ(-carDirection));
            drawCar1(mv);
            break;
        case 4:
            // Driver's point of view.
            mv = lookAt(vec3(-3.0, 0.0, 5.0 + height), vec3(12.0, 0.0, 2.0 + height), vec3(0.0, 0.0, 1.0));
            drawCar1(mv);
            mv = mult(mv, rotateZ(carDirection));
            mv = mult(mv, translate(-car1XPos, -car1YPos, 0.0));
            drawScenery(mv);
            break;
        case 5:
            // Drive around while looking at a house at (40, 120)
            mv = rotateY(-carDirection);
            mv = mult(mv, lookAt(vec3(3.0, 0.0, 5.0 + height), vec3(40.0 - car1XPos, 120.0 - car1YPos, 0.0), vec3(0.0, 0.0, 1.0)));
            drawCar1(mv);
            mv = mult(mv, rotateZ(carDirection));
            mv = mult(mv, translate(-car1XPos, -car1YPos, 0.0));
            drawScenery(mv);
            break;
        case 6:
            // Behind and above the car
            mv = lookAt(vec3(-12.0, 0.0, 6.0 + height), vec3(15.0, 0.0, 4.0), vec3(0.0, 0.0, 1.0));
            drawCar1(mv);
            mv = mult(mv, rotateZ(carDirection));
            mv = mult(mv, translate(-car1XPos, -car1YPos, 0.0));
            drawScenery(mv);
            break;
        case 7:
            // View backwards looking from another car
            mv = lookAt(vec3(25.0, 5.0, 5.0 + height), vec3(0.0, 0.0, 2.0), vec3(0.0, 0.0, 1.0));
            drawCar1(mv);
            mv = mult(mv, rotateZ(carDirection));
            mv = mult(mv, translate(-car1XPos, -car1YPos, 0.0));
            drawScenery(mv);
            break;
        case 8:
            // View from beside the car
            mv = lookAt(vec3(2.0, 20.0, 5.0 + height), vec3(2.0, 0.0, 2.0), vec3(0.0, 0.0, 1.0));
            drawCar1(mv);
            mv = mult(mv, rotateZ(carDirection));
            mv = mult(mv, translate(-car1XPos, -car1YPos, 0.0));
            drawScenery(mv);
            break;

    }


    requestAnimFrame(render);
}

