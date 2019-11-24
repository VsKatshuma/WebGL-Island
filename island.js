"use strict";

function main() {
    // WebGL code from https://webglfundamentals.org/webgl/lessons/webgl-3d-camera.html
    /** @type {HTMLCanvasElement} */
    var canvas = document.getElementById("canvas");
    var gl = canvas.getContext("webgl");
    if (!gl) {
        return;
    }

    // setup GLSL program
    var program = webglUtils.createProgramFromScripts(gl, ["3d-vertex-shader", "3d-fragment-shader"]);

    // look up where the vertex data needs to go.
    var positionLocation = gl.getAttribLocation(program, "a_position");
    var colorLocation = gl.getAttribLocation(program, "a_color");

    // lookup uniforms
    var matrixLocation = gl.getUniformLocation(program, "u_matrix");

    // Create a buffer to put positions in
    var positionBuffer = gl.createBuffer();
    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // Put geometry data into buffer
    gl.bufferData(gl.ARRAY_BUFFER, geometry, gl.STATIC_DRAW);


    // Create a buffer to put colors in
    var colorBuffer = gl.createBuffer();
    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = colorBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    // Put color data into buffer
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);


    function radToDeg(r) {
        return r * 180 / Math.PI;
    }

    function degToRad(d) {
        return d * Math.PI / 180;
    }

    var cameraAngleRadians = degToRad(0);
    var fieldOfViewRadians = degToRad(60);

    window.addEventListener("wheel", event => {
        const delta = Math.sign(event.deltaY) * 3;
        fieldOfViewRadians += degToRad(delta);
        drawScene();
    });

    // Cull backfacing triangles
    gl.enable(gl.CULL_FACE);

    // Enable the depth buffer
    gl.enable(gl.DEPTH_TEST);

gl.enable(gl.BLEND);
//gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // This is the correct blending function with straight-alpha input colors and transparent output colors
//gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // Or, you can blend premultiplied colors, and it gets easier

    gl.clearColor(0.1, 0, 0.7, 1);

    var requestAnimationFrame = window.requestAnimationFrame ||
                              window.mozRequestAnimationFrame ||
                              window.msRequestAnimationFrame ||
                              window.oRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame;

    var currentSecond = Math.floor(Date.now() / 1000);
    var previousSecond = currentSecond;
    var framesPerSecond = "0";
    var frames = 0;

    function animation() {
        currentSecond = Math.floor(Date.now() / 1000);

        if (currentSecond > previousSecond) {
            previousSecond = currentSecond;
            framesPerSecond = frames.toString();
            frames = 1;
        } else {
            frames += 1;
        }
        document.getElementById("fps").innerHTML = framesPerSecond + " fps";

        cameraAngleRadians = cameraAngleRadians + 0.0025 % Math.PI * 2;
        drawScene();
        requestAnimationFrame(animation);
    }

    animation();

    // Draw the scene.
    function drawScene() {
        webglUtils.resizeCanvasToDisplaySize(gl.canvas);

        // Tell WebGL how to convert from clip space to pixels
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Clear the canvas AND the depth buffer.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Tell it to use our program (pair of shaders)
        gl.useProgram(program);

        // Turn on the position attribute
        gl.enableVertexAttribArray(positionLocation);

        // Bind the position buffer.
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        var size = 3;          // 3 components per iteration
        var type = gl.FLOAT;   // the data is 32bit floats
        var normalize = false; // don't normalize the data
        var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(positionLocation, size, type, normalize, stride, offset);

        // Turn on the color attribute
        gl.enableVertexAttribArray(colorLocation);

        // Bind the color buffer.
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);

        // Tell the attribute how to get data out of colorBuffer (ARRAY_BUFFER)
        var size = 4;                 // 3 components per iteration
        var type = gl.UNSIGNED_BYTE;  // the data is 8bit unsigned values
        var normalize = true;         // normalize the data (convert from 0-255 to 0-1)
        var stride = 0;               // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;               // start at the beginning of the buffer
        gl.vertexAttribPointer(colorLocation, size, type, normalize, stride, offset);

        // Compute the projection matrix
        var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        var zNear = 1;
        var zFar = 2000;
        var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

        // Compute a matrix for the camera
        var cameraMatrix = m4.yRotation(cameraAngleRadians);
        cameraMatrix = m4.multiply(cameraMatrix, m4.xRotation(degToRad(-30)));
        cameraMatrix = m4.translate(cameraMatrix, 0, half * 2 / 3, 100 + terrainWidth);

        // Make a view matrix from the camera matrix
        var viewMatrix = m4.inverse(cameraMatrix);

        // Compute a view projection matrix
        var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

        // Set the matrix.
        gl.uniformMatrix4fv(matrixLocation, false, viewProjectionMatrix);

        // Draw the geometry.
        var primitiveType = gl.TRIANGLES;
        var offset = 0;
        var count = squares * 6;
        gl.drawArrays(primitiveType, offset, count);
    }

}

var m4 = {

    perspective: function(fieldOfViewInRadians, aspect, near, far) {
        var f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
        var rangeInv = 1.0 / (near - far);

        return [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) * rangeInv, -1,
            0, 0, near * far * rangeInv * 2, 0
        ];
    },

    projection: function(width, height, depth) {
        // Note: This matrix flips the Y axis so 0 is at the top.
        return [
            2 / width, 0, 0, 0,
            0, -2 / height, 0, 0,
            0, 0, 2 / depth, 0,
            -1, 1, 0, 1,
        ];
    },

    multiply: function(a, b) {
        var a00 = a[0 * 4 + 0];
        var a01 = a[0 * 4 + 1];
        var a02 = a[0 * 4 + 2];
        var a03 = a[0 * 4 + 3];
        var a10 = a[1 * 4 + 0];
        var a11 = a[1 * 4 + 1];
        var a12 = a[1 * 4 + 2];
        var a13 = a[1 * 4 + 3];
        var a20 = a[2 * 4 + 0];
        var a21 = a[2 * 4 + 1];
        var a22 = a[2 * 4 + 2];
        var a23 = a[2 * 4 + 3];
        var a30 = a[3 * 4 + 0];
        var a31 = a[3 * 4 + 1];
        var a32 = a[3 * 4 + 2];
        var a33 = a[3 * 4 + 3];
        var b00 = b[0 * 4 + 0];
        var b01 = b[0 * 4 + 1];
        var b02 = b[0 * 4 + 2];
        var b03 = b[0 * 4 + 3];
        var b10 = b[1 * 4 + 0];
        var b11 = b[1 * 4 + 1];
        var b12 = b[1 * 4 + 2];
        var b13 = b[1 * 4 + 3];
        var b20 = b[2 * 4 + 0];
        var b21 = b[2 * 4 + 1];
        var b22 = b[2 * 4 + 2];
        var b23 = b[2 * 4 + 3];
        var b30 = b[3 * 4 + 0];
        var b31 = b[3 * 4 + 1];
        var b32 = b[3 * 4 + 2];
        var b33 = b[3 * 4 + 3];
        return [
            b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
            b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
            b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
            b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
            b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
            b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
            b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
            b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
            b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
            b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
            b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
            b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
            b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
            b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
            b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
            b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
        ];
    },

    translation: function(tx, ty, tz) {
        return [
            1,  0,  0,  0,
            0,  1,  0,  0,
            0,  0,  1,  0,
            tx, ty, tz, 1,
        ];
    },

    xRotation: function(angleInRadians) {
        var c = Math.cos(angleInRadians);
        var s = Math.sin(angleInRadians);

        return [
            1, 0, 0, 0,
            0, c, s, 0,
            0, -s, c, 0,
            0, 0, 0, 1,
        ];
    },

    yRotation: function(angleInRadians) {
        var c = Math.cos(angleInRadians);
        var s = Math.sin(angleInRadians);

        return [
            c, 0, -s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1,
        ];
    },

    zRotation: function(angleInRadians) {
        var c = Math.cos(angleInRadians);
        var s = Math.sin(angleInRadians);

        return [
            c, s, 0, 0,
            -s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ];
    },

    scaling: function(sx, sy, sz) {
        return [
            sx, 0,  0,  0,
            0, sy,  0,  0,
            0,  0, sz,  0,
            0,  0,  0,  1,
        ];
    },

    translate: function(m, tx, ty, tz) {
        return m4.multiply(m, m4.translation(tx, ty, tz));
    },

    xRotate: function(m, angleInRadians) {
        return m4.multiply(m, m4.xRotation(angleInRadians));
    },

    yRotate: function(m, angleInRadians) {
        return m4.multiply(m, m4.yRotation(angleInRadians));
    },

    zRotate: function(m, angleInRadians) {
        return m4.multiply(m, m4.zRotation(angleInRadians));
    },

    scale: function(m, sx, sy, sz) {
        return m4.multiply(m, m4.scaling(sx, sy, sz));
    },

    inverse: function(m) {
        var m00 = m[0 * 4 + 0];
        var m01 = m[0 * 4 + 1];
        var m02 = m[0 * 4 + 2];
        var m03 = m[0 * 4 + 3];
        var m10 = m[1 * 4 + 0];
        var m11 = m[1 * 4 + 1];
        var m12 = m[1 * 4 + 2];
        var m13 = m[1 * 4 + 3];
        var m20 = m[2 * 4 + 0];
        var m21 = m[2 * 4 + 1];
        var m22 = m[2 * 4 + 2];
        var m23 = m[2 * 4 + 3];
        var m30 = m[3 * 4 + 0];
        var m31 = m[3 * 4 + 1];
        var m32 = m[3 * 4 + 2];
        var m33 = m[3 * 4 + 3];
        var tmp_0  = m22 * m33; var tmp_1  = m32 * m23;
        var tmp_2  = m12 * m33; var tmp_3  = m32 * m13;
        var tmp_4  = m12 * m23; var tmp_5  = m22 * m13;
        var tmp_6  = m02 * m33; var tmp_7  = m32 * m03;
        var tmp_8  = m02 * m23; var tmp_9  = m22 * m03;
        var tmp_10 = m02 * m13; var tmp_11 = m12 * m03;
        var tmp_12 = m20 * m31; var tmp_13 = m30 * m21;
        var tmp_14 = m10 * m31; var tmp_15 = m30 * m11;
        var tmp_16 = m10 * m21; var tmp_17 = m20 * m11;
        var tmp_18 = m00 * m31; var tmp_19 = m30 * m01;
        var tmp_20 = m00 * m21; var tmp_21 = m20 * m01;
        var tmp_22 = m00 * m11; var tmp_23 = m10 * m01;

        var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
            (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
        var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
            (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
        var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
            (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
        var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
            (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

        var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

        return [
            d * t0,
            d * t1,
            d * t2,
            d * t3,
            d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
                (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
            d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
                (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
            d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
                (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
            d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
                (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
            d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
                (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
            d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
                (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
            d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
                (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
            d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
                (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
            d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
                (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
            d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
                (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
            d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
                (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
            d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
                (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02))
        ];
    },

    vectorMultiply: function(v, m) {
        var dst = [];
        for (var i = 0; i < 4; ++i) {
            dst[i] = 0.0;
            for (var j = 0; j < 4; ++j) {
                dst[i] += v[j] * m[j * 4 + i];
            }
        }
        return dst;
    },

};

function verticalSquare(array, offset, bottomLeft, topRight) {
    array[offset + 0] = bottomLeft[0]; array[offset + 1] = bottomLeft[1]; array[offset + 2] = bottomLeft[2];
    array[offset + 3] = bottomLeft[0]; array[offset + 4] = topRight[1]; array[offset + 5] = bottomLeft[2];
    array[offset + 6] = topRight[0]; array[offset + 7] = topRight[1]; array[offset + 8] = topRight[2];

    array[offset + 9] = bottomLeft[0]; array[offset + 10] = bottomLeft[1]; array[offset + 11] = bottomLeft[2];
    array[offset + 12] = topRight[0]; array[offset + 13] = topRight[1]; array[offset + 14] = topRight[2];
    array[offset + 15] = topRight[0]; array[offset + 16] = bottomLeft[1]; array[offset + 17] = topRight[2];
}

function flatSquare(array, offset, corner, y, oppositeCorner) {
    array[offset + 0] = corner[0]; array[offset + 1] = y; array[offset + 2] = corner[1];
    array[offset + 3] = oppositeCorner[0]; array[offset + 4] = y; array[offset + 5] = oppositeCorner[1];
    array[offset + 6] = oppositeCorner[0]; array[offset + 7] = y; array[offset + 8] = corner[1];

    array[offset + 9] = corner[0]; array[offset + 10] = y; array[offset + 11] = corner[1];
    array[offset + 12] = corner[0]; array[offset + 13] = y; array[offset + 14] = oppositeCorner[1];
    array[offset + 15] = oppositeCorner[0]; array[offset + 16] = y; array[offset + 17] = oppositeCorner[1];
}

function setColor(array, offset, r, g, b, a) {
    array[offset + 0] = r; array[offset + 1] = g; array[offset + 2] = b; array[offset + 3] = a;
    array[offset + 4] = r; array[offset + 5] = g; array[offset + 6] = b; array[offset + 7] = a;
    array[offset + 8] = r; array[offset + 9] = g; array[offset + 10] = b; array[offset + 11] = a;
    array[offset + 12] = r; array[offset + 13] = g; array[offset + 14] = b; array[offset + 15] = a;
    array[offset + 16] = r; array[offset + 17] = g; array[offset + 18] = b; array[offset + 19] = a;
    array[offset + 20] = r; array[offset + 21] = g; array[offset + 22] = b; array[offset + 23] = a;
}

//var terrainWidth = 65;
var terrainWidth = 129;
var half = terrainWidth / 2; // This is used to "move" primitives so that 0,0 is in the middle of the geometry
var terrain = new Uint8Array(terrainWidth * terrainWidth * terrainWidth); // 3D representation of the geometry
var heightMap = new Uint8Array(terrainWidth * terrainWidth);              // 2D representation of the terrain elevation
var geometry = new Float32Array((((terrainWidth * 4 + 1) * terrainWidth * half + 1) + (terrainWidth * half * 5)) * 18); // estimated upper bound of vertices
var colors = new Uint8Array((((terrainWidth * 4 + 1) * terrainWidth * half + 1) + (terrainWidth * half * 5)) * 24);     // breaks with map size of 186 or above

var squares = 0; // the amount of squares (triangles * 2) in the finished geometry

function normalDistribution() {
    var uniform1 = Math.random();
    var uniform2 = Math.random();
    return Math.sqrt(-2 * Math.log(uniform1)) * Math.cos(2 * Math.PI * uniform2);
    //return Math.abs(Math.sqrt(-2 * Math.log(uniform1)) * Math.cos(2 * Math.PI * uniform2));
}

function test() {
    var amount1 = 0; var amount2 = 0; var amount3 = 0; var amount4 = 0; var amount5 = 0;
    for (var x = 0; x < 100; x++) {
        var hype = normalDistribution();
        if (hype < -1.5) { amount1++;
        } else if (hype < -0.5) { amount2++;
        } else if (hype < 0.5) { amount3++;
        } else if (hype < 1.5) { amount4++;
        } else { amount5++;
        }
    }
    console.log(amount1, amount2, amount3, amount4, amount5);
}

function test2() {
    var smallest = 0;
    var biggest = 0;
    for (var x = 0; x < 1000; x++) {
        var hype = normalDistribution();
        if (hype < smallest) {
            smallest = hype;
        } else if (hype > biggest) {
            biggest = hype;
        }
    }
    console.log(smallest, biggest);
}

function diamondStep(map, x, z, step) {
    let sum = 0;
    let num = 0;
    if (x - step >= 0) {
        if (z - step >= 0) {
            sum += map[(x - step) * terrainWidth + (z - step)];
            num++;
        }
        if (z + step < terrainWidth) {
            sum += map[(x - step) * terrainWidth + (z + step)];
            num++;
        }
    }
    if (x + step < terrainWidth) {
        if (z - step >= 0) {
            sum += map[(x + step) * terrainWidth + (z - step)];
            num++;
        }
        if (z + step < terrainWidth) {
            sum += map[(x + step) * terrainWidth + (z + step)];
            num++;
        }
    }
    map[x * terrainWidth + z] = (sum / num);// + (normalDistribution() * (step / (terrainWidth / 2)));
}

function squareStep(map, x, z, step) {
    let sum = 0;
    let num = 0;
    if (x - step >= 0) {
        sum += map[(x - step) * terrainWidth + z];
        num++;
    }
    if (x + step < terrainWidth) {
        sum += map[(x + step) * terrainWidth + z];
        num++;
    }
    if (z - step >= 0) {
        sum += map[x * terrainWidth + (z - step)];
        num++;
    }
    if (z + step < terrainWidth) {
        sum += map[x * terrainWidth + (z + step)];
        num++;
    }
    map[x * terrainWidth + z] = (sum / num);// + (normalDistribution() * (step / (terrainWidth / 2)));
}

function terrainGeneration(terrain) {
    let step = terrainWidth - 1;
    let oceanFloor = terrainWidth * 2.5 / 10;
    let highestPoint = terrainWidth * 9 / 10;
    let corner1 = oceanFloor + normalDistribution() * 2;
    let corner2 = oceanFloor + normalDistribution() * 2;
    let corner3 = oceanFloor + normalDistribution() * 2;
    let corner4 = oceanFloor + normalDistribution() * 2;
    heightMap[0 * terrainWidth + 0] = corner1;
    heightMap[0 * terrainWidth + (terrainWidth - 1)] = corner2;
    heightMap[(terrainWidth - 1) * terrainWidth + 0] = corner3;
    heightMap[(terrainWidth - 1) * terrainWidth + (terrainWidth - 1)] = corner4;

    // diamond
    heightMap[((terrainWidth - 1) / 2) * terrainWidth + ((terrainWidth - 1) / 2)] = highestPoint;
    // square
    heightMap[0 * terrainWidth + ((terrainWidth - 1) / 2)] = (corner1 + corner2 + highestPoint) / 3;
    heightMap[((terrainWidth - 1) / 2) * terrainWidth + 0] = (corner1 + corner3 + highestPoint) / 3;
    heightMap[(terrainWidth - 1) * terrainWidth + ((terrainWidth - 1) / 2)] = (corner3 + corner4 + highestPoint) / 3;
    heightMap[((terrainWidth - 1) / 2) * terrainWidth + terrainWidth - 1] = (corner2 + corner4 + highestPoint) / 3;

    step /= 4;
    while (step >= 1) {
        for (var x = step; x < terrainWidth; x += 2 * step) {
            for (var z = step; z < terrainWidth; z += 2 * step) {
                if (step != (terrainWidth - 1) / 2)
                    diamondStep(heightMap, x, z, step);
            }
        }
        for (var x = step; x < terrainWidth; x += 2 * step) {
            for (var z = 0; z < terrainWidth; z += 2 * step) {
                squareStep(heightMap, x, z, step);
            }
        }
        for (var x = 0; x < terrainWidth; x += 2 * step) {
            for (var z = step; z < terrainWidth; z += 2 * step) {
                squareStep(heightMap, x, z, step);
            }
        }
        step /= 2;
    }

    for (var x = 0; x < terrainWidth; x++) {
        for (var z = 0; z < terrainWidth; z++) {
            for (var y = 0; y < terrainWidth; y++) {
                if (y < heightMap[x * terrainWidth + z]) {
                    terrain[x * terrainWidth * terrainWidth + y * terrainWidth + z] = 1;
                }
            }
        }
    }
}

function placeTriangles(terrain, geometry, colors) {
    squares = 0;
    let currentTerrain = 0;
    let lastTerrain = 0;

    // Scan from top to bottom
    for (var x = 0; x < terrainWidth; x++) {
        for (var z = 0; z < terrainWidth; z++) {
            lastTerrain = 0;
            for (var y = terrainWidth - 1; y >= 0; y--) {
                currentTerrain = terrain[x * terrainWidth * terrainWidth + y * terrainWidth + z];
                if (currentTerrain == 1 && lastTerrain == 0) {
                    flatSquare(geometry, squares * 18, [x - half, z - half], y + 1, [x + 1 - half, z + 1 - half]);
                    setColor(colors, squares * 24, 0, 255 - (terrainWidth * 1.5) + (y * 1.5), 0, 255);
                    squares++;
                } else if (currentTerrain == 0 && lastTerrain == 0 && y == (terrainWidth - 1) / 2) {
                    flatSquare(geometry, squares * 18, [x - half, z - half], y + 1, [x + 1 - half, z + 1 - half]);
                    setColor(colors, squares * 24, 50, 50, 255, 100);
                    squares++;
                }
                lastTerrain = currentTerrain;
            }
        }
    }

    // Scan in z-direction
    for (var x = 0; x < terrainWidth; x++) {
        for (var y = 0; y < terrainWidth; y++) {
            currentTerrain = terrain[x * terrainWidth * terrainWidth + y * terrainWidth + 0];
            if (currentTerrain == 1) {
                verticalSquare(geometry, squares * 18, [x - half, y, 0 - half], [x + 1 - half, y + 1, 0 - half]);
                setColor(colors, squares * 24, 66, 48, 30, 255);
                squares++;
            } else if (currentTerrain == 0 && y <= (terrainWidth - 1) / 2) { // Water step
                verticalSquare(geometry, squares * 18, [x - half, y, 0 - half], [x + 1 - half, y + 1, 0 - half]);
                setColor(colors, squares * 24, 50, 50, 255, 100);
                squares++;
            }
            lastTerrain = currentTerrain;
            for (var z = 1; z < terrainWidth; z++) {
                currentTerrain = terrain[x * terrainWidth * terrainWidth + y * terrainWidth + z];
                if (currentTerrain == 1 && lastTerrain == 0) {
                    verticalSquare(geometry, squares * 18, [x - half, y, z - half], [x + 1 - half, y + 1, z - half]);
                    setColor(colors, squares * 24, 66, 48, 30, 255);
                    squares++;
                } else if (currentTerrain == 0 && lastTerrain == 1) {
                    verticalSquare(geometry, squares * 18, [x + 1 - half, y, z - half], [x - half, y + 1, z - half]);
                    setColor(colors, squares * 24, 66, 48, 30, 255);
                    squares++;
                }
                lastTerrain = currentTerrain;
            }
            if (lastTerrain == 1) {
                verticalSquare(geometry, squares * 18, [x + 1 - half, y, terrainWidth - half], [x - half, y + 1, terrainWidth - half]);
                setColor(colors, squares * 24, 66, 48, 30, 255);
                squares++;
            } else if (lastTerrain == 0 && y <= (terrainWidth - 1) / 2) { // Water step
                verticalSquare(geometry, squares * 18, [x + 1 - half, y, terrainWidth - half], [x - half, y + 1, terrainWidth - half]);
                setColor(colors, squares * 24, 50, 50, 255, 100);
                squares++;
            }
        }
    }

    // Scan in x-direction
    for (var z = 0; z < terrainWidth; z++) {
        for (var y = 0; y < terrainWidth; y++) {
            currentTerrain = terrain[0 * terrainWidth * terrainWidth + y * terrainWidth + z];
            if (currentTerrain == 1) {
                verticalSquare(geometry, squares * 18, [0 - half, y, z + 1 - half], [0 - half, y + 1, z - half]);
                setColor(colors, squares * 24, 66, 48, 30, 255);
                squares++;
            } else if (currentTerrain == 0 && y <= (terrainWidth - 1) / 2) { // Water step
                verticalSquare(geometry, squares * 18, [0 - half, y, z + 1 - half], [0 - half, y + 1, z - half]);
                setColor(colors, squares * 24, 50, 50, 255, 100);
                squares++;
            }
            lastTerrain = currentTerrain;
            for (var x = 1; x < terrainWidth; x++) {
                currentTerrain = terrain[x * terrainWidth * terrainWidth + y * terrainWidth + z];
                if (currentTerrain == 1 && lastTerrain == 0) {
                    verticalSquare(geometry, squares * 18, [x - half, y, z + 1 - half], [x - half, y + 1, z - half]);
                    setColor(colors, squares * 24, 66, 48, 30, 255);
                    squares++;
                } else if (currentTerrain == 0 && lastTerrain == 1) {
                    verticalSquare(geometry, squares * 18, [x - half, y, z - half], [x - half, y + 1, z + 1 - half]);
                    setColor(colors, squares * 24, 66, 48, 30, 255);
                    squares++;
                }
                lastTerrain = currentTerrain;
            }
            if (lastTerrain == 1) {
                verticalSquare(geometry, squares * 18, [terrainWidth - half, y, z - half], [terrainWidth - half, y + 1, z + 1 - half]);
                setColor(colors, squares * 24, 66, 48, 30, 255);
                squares++;
            } else if (lastTerrain == 0 && y <= (terrainWidth - 1) / 2) { // Water step
                verticalSquare(geometry, squares * 18, [terrainWidth - half, y, z - half], [terrainWidth - half, y + 1, z + 1 - half]);
                setColor(colors, squares * 24, 50, 50, 255, 100);
                squares++;
            }
        }
    }
}

function generateTerrain(terrain, geometry, colors) {
    terrainGeneration(terrain);
    placeTriangles(terrain, geometry, colors);
}

generateTerrain(terrain, geometry, colors);

main();
