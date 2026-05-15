var database = window.database;
var socket;
document.oncontextmenu = () => false;

socket = io.connect(window.location.href);

var paths = [];
var pathsDirty = true;

// --- Cached geometry built once per paths update ---
let cachedTriangles = null; // { r, g, b, flat: [x,y,z], raised: [x,y,z] }[]

function fetchPaths() {
    fetch("/api/paths")
        .then((r) => r.json())
        .then((data) => {
            paths = data;
            pathsDirty = true;
        })
        .catch((err) => console.error("Error loading paths:", err));
}

function preload() { fetchPaths(); }

let checkbox;

function setup() {
    createCanvas(window.innerWidth, window.innerHeight, WEBGL);
    angleMode(DEGREES);
    checkbox = createCheckbox("flat");
    checkbox.position(0, 100);
    checkbox.changed(() => { pathsDirty = true; });

    socket.on("point", fetchPaths);
}

// Camera parameters
let camDistance = 700;
let camAngleX = 0;
let camAngleY = -Math.PI / 6;
let camTarget = { x: 0, y: 0, z: 0 };

let isDragging = false;
let isRightDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

const minDistance = 100;
const maxDistance = 2000;
const minTilt = -Math.PI / 2 + 0.1;
const maxTilt = 0;

// --- Rebuild cached geometry when paths change ---
function rebuildCache() {
    if (!paths.length) { cachedTriangles = null; return; }

    const flat = checkbox.checked();
    const vertexSoup = [];
    for (const p of paths) for (const v of p.path) vertexSoup.push(v);

    // Safe min/max without spread (avoids stack overflow on large arrays)
    let minY = Infinity, maxY = -Infinity;
    for (const v of vertexSoup) {
        if (v.altitude < minY) minY = v.altitude;
        if (v.altitude > maxY) maxY = v.altitude;
    }
    const altRange = maxY - minY || 1;

    const delaunay = d3.Delaunay.from(vertexSoup.map((v) => [v.latitude, v.longitude]));
    const triangles = delaunay.triangles;

    // Precompute color + position for every triangle vertex
    cachedTriangles = new Array(triangles.length);
    for (let i = 0; i < triangles.length; i++) {
        const v = vertexSoup[triangles[i]];
        const t = (v.altitude - minY) / altRange;

        // Green → yellow → brown
        let r, g, b;
        if (t < 0.5) {
            const s = t * 2;
            r = Math.round(34  + s * (210 - 34));
            g = Math.round(139 + s * (180 - 139));
            b = Math.round(34  + s * (0   - 34));
        } else {
            const s = (t - 0.5) * 2;
            r = Math.round(210 + s * (101 - 210));
            g = Math.round(180 + s * (67  - 180));
            b = Math.round(0   + s * (33  - 0));
        }

        const px = -v.latitude * 100000 - 41.137 * 100000;
        const pz =  v.longitude * (100000 * Math.cos(v.latitude)) + 100000 * 71.295 * Math.cos(v.latitude);
        const py = flat ? 0 : (-v.altitude * 0.898 + 700);

        cachedTriangles[i] = { r, g, b, px, py, pz };
    }

    pathsDirty = false;
}

function draw() {
    if (pathsDirty) rebuildCache();

    background(100);

    push();
    noStroke();
    fill("#00ffff");
    translate(0, 1, 0);
    rotateX(90);
    plane(10000);
    pop();

    const camX = camTarget.x + camDistance * Math.cos(camAngleY) * Math.sin(camAngleX);
    const camY = camTarget.y + camDistance * Math.sin(camAngleY);
    const camZ = camTarget.z + camDistance * Math.cos(camAngleY) * Math.cos(camAngleX);
    camera(camX, camY, camZ, camTarget.x, camTarget.y, camTarget.z, 0, 1, 0);

    for (const path of paths) drawPath(path);
    drawSurface();
}

function drawSurface() {
    if (!cachedTriangles) return;
    push();
    noStroke();
    beginShape(TRIANGLES);
    for (const c of cachedTriangles) {
        fill(c.r, c.g, c.b);
        vertex(c.px, c.py, c.pz);
    }
    endShape();
    pop();
}

function drawPath(dataObj) {
    push();
    noFill();
    stroke("#000");
    strokeWeight(2);
    const flat = checkbox.checked();

    beginShape();
    for (const p of dataObj.path) {
        const px = -p.latitude * 100000 - 41.137 * 100000;
        const pz =  p.longitude * (100000 * Math.cos(p.latitude)) + 100000 * 71.295 * Math.cos(p.latitude);
        const py = flat ? 0 : (-p.altitude * 0.898 + 700);
        vertex(px, py, pz);
    }
    endShape();
    pop();
}

// --- Input handlers (unchanged) ---
function mousePressed(event) {
    if (event && event.button === 2) isRightDragging = true;
    else isDragging = true;
    lastMouseX = mouseX;
    lastMouseY = mouseY;
    return false;
}
function mouseReleased() { isDragging = false; isRightDragging = false; }
function mouseDragged() {
    const deltaX = mouseX - lastMouseX;
    const deltaY = mouseY - lastMouseY;
    if (isRightDragging) {
        camAngleX += deltaX * 0.005;
        camAngleY = constrain(camAngleY + deltaY * 0.01, minTilt, maxTilt);
    } else if (isDragging) {
        const panSpeed = camDistance * 0.001;
        const forward = { x: Math.sin(camAngleX), z: Math.cos(camAngleX) };
        const right   = { x: Math.cos(camAngleX), z: -Math.sin(camAngleX) };
        camTarget.x += right.x * -deltaX * panSpeed - forward.x * deltaY * panSpeed;
        camTarget.z += right.z * -deltaX * panSpeed - forward.z * deltaY * panSpeed;
    }
    lastMouseX = mouseX;
    lastMouseY = mouseY;
    return false;
}
function mouseWheel(event) {
    camDistance = constrain(camDistance + event.delta * 0.5, minDistance, maxDistance);
    return false;
}

let lastTouchX, lastTouchY, lastTwoFingerDist, lastTwoFingerMidpoint;
function touchStarted() {
    if (touches.length === 1) {
        lastTouchX = touches[0].x;
        lastTouchY = touches[0].y;
    } else if (touches.length === 2) {
        lastTwoFingerDist = dist(touches[0].x, touches[0].y, touches[1].x, touches[1].y);
        lastTwoFingerMidpoint = { x: (touches[0].x + touches[1].x) / 2, y: (touches[0].y + touches[1].y) / 2 };
    }
    return false;
}
function touchMoved() {
    if (touches.length === 1) {
        const dx = touches[0].x - lastTouchX;
        const dy = touches[0].y - lastTouchY;
        const panSpeed = camDistance * 0.001;
        const forward = { x: Math.sin(camAngleX), z: Math.cos(camAngleX) };
        const right   = { x: Math.cos(camAngleX), z: -Math.sin(camAngleX) };
        camTarget.x += right.x * -dx * panSpeed - forward.x * dy * panSpeed;
        camTarget.z += right.z * -dx * panSpeed - forward.z * dy * panSpeed;
        lastTouchX = touches[0].x;
        lastTouchY = touches[0].y;
    } else if (touches.length === 2) {
        const currentDist = dist(touches[0].x, touches[0].y, touches[1].x, touches[1].y);
        const currentMid  = { x: (touches[0].x + touches[1].x) / 2, y: (touches[0].y + touches[1].y) / 2 };
        camDistance = constrain(camDistance - (currentDist - lastTwoFingerDist) * 2, minDistance, maxDistance);
        camAngleY   = constrain(camAngleY + (currentMid.y - lastTwoFingerMidpoint.y) * 0.005, minTilt, maxTilt);
        camAngleX  += (currentMid.x - lastTwoFingerMidpoint.x) * 0.005;
        lastTwoFingerDist      = currentDist;
        lastTwoFingerMidpoint  = currentMid;
    }
    return false;
}
function touchEnded() { return false; }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }