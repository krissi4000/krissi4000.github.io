/////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//     Sýnir notkun á lyklaborðsatburðum til að hreyfa spaða
//
//    Hjálmtýr Hafsteinsson, september 2025
/////////////////////////////////////////////////////////////////
var canvas;
var gl;

// Núverandi staðsetning miðju ferningsins
var box = vec2(0.0, 0.0);

// Stefna (og hraði) fernings
var dX;
var dY;

// Svæðið er frá -maxX til maxX og -maxY til maxY
var maxX = 1.0;
var maxY = 1.0;

// Hálf breidd/hæð ferningsins
var boxRad = 0.05;

// Ferningurinn er upphaflega í miðjunni
var boxVerts = [
    vec2(-0.05, -0.05),
    vec2(0.05, -0.05),
    vec2(0.05, 0.05),
    vec2(-0.05, 0.05)
];

var spadiVerts = [
    vec2(-0.1, -0.9),
    vec2(-0.1, -0.86),
    vec2(0.1, -0.86),
    vec2(0.1, -0.9)
];

var locBox;
var spadiBuffer, boxBuffer;

window.onload = function init() {

    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.8, 0.8, 0.8, 1.0);

    // Gefa ferningnum slembistefnu í upphafi
    dX = Math.random() * 0.1 - 0.05;
    dY = Math.random() * 0.1 - 0.05;

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    spadiBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spadiBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(spadiVerts), gl.DYNAMIC_DRAW);


    // Load the data into the GPU
    boxBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boxBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(boxVerts), gl.DYNAMIC_DRAW);




    // Associate out shader variables with our data buffer
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    locBox = gl.getUniformLocation(program, "boxPos");

    // Event listener for keyboard
    window.addEventListener("keydown", function (e) {
        switch (e.keyCode) {
            case 37:	// vinstri ör
                xmove = -0.04;
                break;
            case 39:	// hægri ör
                xmove = 0.04;
                break;
            default:
                xmove = 0.0;
        }
        for (i = 0; i < 4; i++) {
            spadiVerts[i][0] += xmove;
        }


        gl.bindBuffer(gl.ARRAY_BUFFER, spadiBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(spadiVerts));
    });

    render();
}






function render() {


    // spaði collision detection

    if (dY < 0){

    if ((box[1] - boxRad) < (spadiVerts[1][1] + 0.03) &&
        (box[1] - boxRad) > (spadiVerts[1][1] - 0.03)) {
        if (box[0] + boxRad > spadiVerts[1][0] &&
            box[0] - boxRad < spadiVerts[3][0]){
            dY = -dY;
            console.log("hit");
        }
   }
    }

    // Láta ferninginn skoppa af veggjunum
    if (Math.abs(box[0] + dX) > maxX - boxRad) dX = -dX;
    if (Math.abs(box[1] + dY) > maxY - boxRad) dY = -dY;

    // Uppfæra staðsetningu
    box[0] += dX;
    box[1] += dY;



    gl.clear(gl.COLOR_BUFFER_BIT);


    // spaði
    gl.bindBuffer(gl.ARRAY_BUFFER, spadiBuffer);
    gl.vertexAttribPointer(gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "vPosition"), 2, gl.FLOAT, false, 0, 0);
    gl.uniform2fv(locBox, flatten(vec2(0.0, 0.0)));
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    // box
    gl.bindBuffer(gl.ARRAY_BUFFER, boxBuffer);
    gl.vertexAttribPointer(gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "vPosition"), 2, gl.FLOAT, false, 0, 0);
    gl.uniform2fv(locBox, flatten(box));
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);


    window.requestAnimFrame(render);
}
