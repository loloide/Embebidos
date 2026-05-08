var database = window.database;
var socket;
document.oncontextmenu = () => false;

socket = io.connect(window.location.href);

var paths = [];
function preload() {
    fetch("/api/paths")
        .then((response) => response.json())
        .then((data) => {
            paths = data;
            console.log("Paths loaded:", paths);
        })
        .catch((err) => console.error("Error loading paths:", err));
}

let checkbox;

function setup() {
    createCanvas(window.innerWidth, window.innerHeight, WEBGL);
    angleMode(DEGREES);
    //debugMode();
    checkbox = createCheckbox("flat");
    checkbox.position(0, 100);

    socket.on("point", function () {
        fetch("/api/paths")
            .then((response) => response.json())
            .then((data) => {
                paths = data;
                console.log("Paths loaded:", paths);
            })
            .catch((err) => console.error("Error loading paths:", err));
    });
}
// Camera parameters
let camDistance = 700;
let camAngleX = 0; // Rotation around target (azimuth)
let camAngleY = -Math.PI / 6; // Tilt angle (elevation)
let camTarget = { x: 0, y: 0, z: 0 };

// Mouse state
let isDragging = false;
let isRightDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Camera constraints
const minDistance = 100;
const maxDistance = 2000;
const minTilt = -Math.PI / 2 + 0.1; // Almost straight down
const maxTilt = 0; // Horizon level

function draw() {
    //orbitControl();
    background(250);
    push();
    fill("#00ffff");
    translate(0, 1, 0);
    rotateX(90);
    plane(1000);
    pop();

    const camX =
        camTarget.x + camDistance * Math.cos(camAngleY) * Math.sin(camAngleX);
    const camY = camTarget.y + camDistance * Math.sin(camAngleY);
    const camZ =
        camTarget.z + camDistance * Math.cos(camAngleY) * Math.cos(camAngleX);

    // Set camera
    camera(camX, camY, camZ, camTarget.x, camTarget.y, camTarget.z, 0, 1, 0);

    for (let path of paths) {
        drawPath(path, "#000");
    }

    drawSurface(paths, 100);

    push();
    translate(-10, -10, 10);
    rotateWithFrameCount();
    box(30);
    pop();

    normalMaterial();
    //stroke(150);
    strokeWeight(0.5);
}

function drawSurface(vertexData, fillColor) {
    let vertexSoup = vertexData.flatMap((p) => p.path);

    let yValues = vertexSoup.map((v) => v.altitude);
    let minY = Math.min(...yValues);
    let maxY = Math.max(...yValues);

    const delaunay = d3.Delaunay.from(
        vertexSoup.map((v) => [v.latitude, v.longitude]),
    );
    let triangles = delaunay.triangles;
    push();
    fill(fillColor);
    beginShape(TRIANGLES);
    for (let i = 0; i < triangles.length; i++) {
        let index = triangles[i];
        let v = vertexSoup[index];

        // 4. Map the Y value to a 0.0 - 1.0 range
        let interpolationFactor = map(v.altitude, minY, maxY, 800, 850);

        // 5. Calculate color: Green (0) to Red (1)
        let c1 = color(0, 150, 0); // Green
        let c2 = color(0, 150, 0); // Red
        let gradColor = lerpColor(c1, c2, interpolationFactor);

        fill(gradColor);
        noStroke();
        if (checkbox.checked()) {
            vertex(
                -v.latitude * 100000 - 41.137 * 100000,
                0,
                v.longitude * (100000 * Math.cos(v.latitude)) +
                    100000 * 71.295 * Math.cos(v.latitude),
            );
        } else {
            vertex(
                -v.latitude * 100000 - 41.137 * 100000,
                -v.altitude * 0.898 + 700,
                v.longitude * (100000 * Math.cos(v.latitude)) +
                    100000 * 71.295 * Math.cos(v.latitude),
            );
        }
    }
    endShape();
    pop();
}

function drawPath(dataObj, strokeColor) {
    push();
    noFill();
    stroke(strokeColor);
    strokeWeight(2);

    beginShape();
    for (let p of dataObj.path) {
        if (checkbox.checked()) {
            vertex(
                -p.latitude * 100000 - 41.137 * 100000,
                0,
                p.longitude * (100000 * Math.cos(p.latitude)) +
                    100000 * 71.295 * Math.cos(p.latitude),
            );
        } else {
            vertex(
                -p.latitude * 100000 - 41.137 * 100000,
                -p.altitude * 0.898 + 700,
                p.longitude * (100000 * Math.cos(p.latitude)) +
                    100000 * 71.295 * Math.cos(p.latitude),
            );
        }
    }
    endShape();
    pop();
}

function rotateWithFrameCount() {
    rotateZ(frameCount);
    rotateX(frameCount);
    rotateY(frameCount);
}
function mousePressed(event) {
    if (event && event.button === 2) {
        // Right click
        isRightDragging = true;
    } else {
        // Left click
        isDragging = true;
    }
    lastMouseX = mouseX;
    lastMouseY = mouseY;
    return false;
}

function mouseReleased() {
    isDragging = false;
    isRightDragging = false;
}

function mouseDragged() {
    const deltaX = mouseX - lastMouseX;
    const deltaY = mouseY - lastMouseY;

    if (isRightDragging) {
        // Left drag - rotate around target (orbit)
        camAngleX += deltaX * 0.005;
        camAngleY = constrain(camAngleY + deltaY * 0.01, minTilt, maxTilt);
    } else if (isDragging) {
        // Right drag - pan the target point
        const panSpeed = camDistance * 0.001;

        // Calculate pan direction based on camera orientation
        const forward = {
            x: Math.sin(camAngleX),
            z: Math.cos(camAngleX),
        };
        const right = {
            x: Math.cos(camAngleX),
            z: -Math.sin(camAngleX),
        };

        camTarget.x +=
            right.x * -deltaX * panSpeed - forward.x * deltaY * panSpeed;
        camTarget.z +=
            right.z * -deltaX * panSpeed - forward.z * deltaY * panSpeed;
    }
    lastMouseX = mouseX;
    lastMouseY = mouseY;
    return false;
}

function mouseWheel(event) {
    // Zoom in/out
    camDistance += event.delta * 0.5;
    camDistance = constrain(camDistance, minDistance, maxDistance);
    return false;
}
function touchStarted() {
    if (touches.length === 1) {
        lastTouchX = touches[0].x;
        lastTouchY = touches[0].y;
    } else if (touches.length === 2) {
        lastTwoFingerDist = dist(
            touches[0].x,
            touches[0].y,
            touches[1].x,
            touches[1].y,
        );
        lastTwoFingerMidpoint = {
            x: (touches[0].x + touches[1].x) / 2,
            y: (touches[0].y + touches[1].y) / 2,
        };
        lastTwoFingerAngle = atan2(
            touches[1].y - touches[0].y,
            touches[1].x - touches[0].x,
        );
    }
    return false;
}

function touchMoved() {
    if (touches.length === 1) {
        // ONE FINGER - PAN the target point
        const deltaX = touches[0].x - lastTouchX;
        const deltaY = touches[0].y - lastTouchY;
        const panSpeed = camDistance * 0.001;

        // Calculate pan direction based on camera orientation
        const forward = {
            x: Math.sin(camAngleX),
            z: Math.cos(camAngleX),
        };
        const right = {
            x: Math.cos(camAngleX),
            z: -Math.sin(camAngleX),
        };

        camTarget.x +=
            right.x * -deltaX * panSpeed - forward.x * -deltaY * panSpeed;
        camTarget.z +=
            right.z * deltaX * panSpeed - forward.z * deltaY * panSpeed;

        lastTouchX = touches[0].x;
        lastTouchY = touches[0].y;
    } else if (touches.length === 2) {
        // TWO FINGERS - detect gesture type
        const currentDist = dist(
            touches[0].x,
            touches[0].y,
            touches[1].x,
            touches[1].y,
        );
        const currentMidpoint = {
            x: (touches[0].x + touches[1].x) / 2,
            y: (touches[0].y + touches[1].y) / 2,
        };

        // PINCH/ZOOM - distance change
        const distDelta = currentDist - lastTwoFingerDist;
        camDistance -= distDelta * 2;
        camDistance = constrain(camDistance, minDistance, maxDistance);

        // PITCH - vertical movement of midpoint
        const midpointDeltaY = currentMidpoint.y - lastTwoFingerMidpoint.y;
        camAngleY = constrain(
            camAngleY + midpointDeltaY * 0.005,
            minTilt,
            maxTilt,
        );

        // YAW - horizontal movement of midpoint
        const midpointDeltaX = currentMidpoint.x - lastTwoFingerMidpoint.x;
        camAngleX += midpointDeltaX * 0.005;

        // Update state
        lastTwoFingerDist = currentDist;
        lastTwoFingerMidpoint = currentMidpoint;
    }

    return false;
}

function touchEnded() {
    return false;
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
