// ─── Global state ────────────────────────────────────────────────────────────

var database = window.database;
var socket;
document.oncontextmenu = () => false;  // Disable right-click context menu

socket = io.connect(window.location.href);

// Raw path data received from the server. Each entry has a `.path` array of
// {latitude, longitude, altitude} points.
var paths = [];

// When true, the terrain p5.Geometry needs to be rebuilt from `paths`.
var pathsDirty = true;

// ─── Geometry cache ──────────────────────────────────────────────────────────

// Pre-built p5.Geometry for the Delaunay triangulated terrain surface.
// Uploaded to the GPU once; reused every frame via model().
let terrainGeometry = null;

// Projected world-space vertices for every path, stored as [{px, py, pz}[]].
// One inner array per path. Rebuilt only when new path data arrives.
let cachedPathVerts = null;

// When true, cachedPathVerts needs to be rebuilt.
let pathsDirtyCache = true;

// When true, at least one more frame must be rendered.
// Set to false after each render so we skip frames when nothing has changed,
// saving CPU and battery on mobile.
let needsRedraw = true;

// ─── p5 lifecycle ────────────────────────────────────────────────────────────

/**
 * preload() — p5 hook called once before setup().
 * Kicks off the initial HTTP fetch so path data is ready as early as possible.
 */
function preload() {
    fetchPaths();
}

/**
 * setup() — p5 hook called once after preload().
 * Creates the WebGL canvas filling the full window, then subscribes to
 * real-time "point" events from the server via Socket.IO.
 */
function setup() {
    createCanvas(window.innerWidth, window.innerHeight, WEBGL);
    angleMode(DEGREES);
    frameRate(30);  // 30 fps is smooth enough for a 3D viewer and kinder on mobile

    // Re-fetch paths whenever the server broadcasts a new GPS point
    socket.on("point", fetchPaths);
}

// ─── Data fetching ───────────────────────────────────────────────────────────

/**
 * fetchPaths() — loads the full path list from the server API.
 * Called once on startup and again each time a "point" socket event arrives.
 * Marks both geometry caches dirty so the next draw() rebuilds them.
 */
function fetchPaths() {
    fetch("/api/paths")
        .then((r) => r.json())
        .then((data) => {
            paths = data;
            pathsDirty = true;
            pathsDirtyCache = true;
            needsRedraw = true;
        })
        .catch((err) => console.error("Error loading paths:", err));
}

// ─── Camera state ────────────────────────────────────────────────────────────

let camDistance = 1000;               // Distance from camera to the look-at target
let camAngleX  = Math.PI / 2;                   // Horizontal orbit angle (radians)
let camAngleY  = -Math.PI / 2;       // Vertical tilt angle (radians, clamped below)
let camTarget  = { x: 0, y: 0, z: 0 };  // World-space point the camera orbits around

// Pre-computed trig values for the current camera angles.
// Recomputed only when _camDirty is true, avoiding four Math calls every frame.
let _camCosY = Math.cos(camAngleY);
let _camSinY = Math.sin(camAngleY);
let _camCosX = Math.cos(camAngleX);
let _camSinX = Math.sin(camAngleX);
let _camDirty = true;  // Forces an initial trig computation

// Camera angle constraints
const minDistance = 100;
const maxDistance = 2000;
const minTilt = -Math.PI / 2 + 0.1;  // Just above the horizon
const maxTilt = 0;                     // Top-down view

// Input tracking for mouse drag
let isDragging      = false;
let isRightDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// ─── Coordinate helpers ──────────────────────────────────────────────────────

/**
 * vertToWorld(v) — converts a GPS point to p5 world coordinates.
 *
 * Latitude / longitude are projected into a flat local XZ plane centred
 * roughly on Bariloche (-41.137 °S, -71.295 °W). Longitude is scaled by
 * cos(latitude) to correct for meridian convergence at this latitude.
 * Altitude is mapped to the Y axis (negated because p5 Y points down).
 *
 * @param  {object} v  — GPS point with {latitude, longitude, altitude}
 * @returns {object}   — world-space position {px, py, pz}
 */
function vertToWorld(v) {
    return {
        px: -v.latitude  * 100000 - 41.137 * 100000,
        pz:  v.longitude * (100000 * Math.cos(v.latitude)) + 100000 * 71.295 * Math.cos(v.latitude),
        py: -v.altitude  * 0.898 + 700,
    };
}

/**
 * updateCamTrig() — refreshes the cached sin/cos values for the camera angles.
 * No-ops if the angles haven't changed since the last call (_camDirty === false).
 * Called at the start of every draw() frame before the camera is positioned.
 */
function updateCamTrig() {
    if (!_camDirty) return;
    _camCosY = Math.cos(camAngleY);
    _camSinY = Math.sin(camAngleY);
    _camCosX = Math.cos(camAngleX);
    _camSinX = Math.sin(camAngleX);
    _camDirty = false;
}

// ─── Geometry builders ───────────────────────────────────────────────────────

/**
 * rebuildTerrainGeometry() — builds the p5.Geometry for the terrain surface.
 *
 * Steps:
 *  1. Flatten all path points into a single vertex array ("soup").
 *  2. Find the altitude range so colours can be normalised to [0, 1].
 *  3. Run a Delaunay triangulation on the lat/lon positions (via d3-delaunay)
 *     to get a consistent mesh over the point cloud.
 *  4. Convert every vertex to world space and assign an altitude-based colour
 *     (green → yellow → brown ramp).
 *  5. Store the result in a p5.Geometry so it is uploaded to the GPU once and
 *     rendered in a single draw call via model().
 *
 * Called only when pathsDirty is true (i.e. new data arrived).
 */
function rebuildTerrainGeometry() {
    if (!paths.length) {
        terrainGeometry = null;
        return;
    }

    // Step 1 — collect all points from all paths into one flat array
    const vertexSoup = [];
    for (const p of paths) for (const v of p.path) vertexSoup.push(v);

    // Step 2 — altitude range for colour normalisation
    let minAlt = Infinity, maxAlt = -Infinity;
    for (const v of vertexSoup) {
        if (v.altitude < minAlt) minAlt = v.altitude;
        if (v.altitude > maxAlt) maxAlt = v.altitude;
    }
    const altRange = maxAlt - minAlt || 1;  // Guard against flat terrain (div/0)

    // Step 3 — Delaunay triangulation on the 2D lat/lon projection
    const delaunay = d3.Delaunay.from(vertexSoup.map((v) => [v.latitude, v.longitude]));
    const triangles = delaunay.triangles;  // Flat array of vertex indices, 3 per triangle

    // Step 4 & 5 — build the p5.Geometry
    terrainGeometry = new p5.Geometry(1, 1, function () {
        // Convert all soup vertices to world space and store as p5.Vectors
        const worldVerts = vertexSoup.map((v) => {
            const w = vertToWorld(v);
            return createVector(w.px, w.py, w.pz);
        });

        this.vertices     = worldVerts;
        this.vertexColors = [];  // Parallel array — one RGBA tuple per vertex (floats 0–1)

        // Assign altitude-based colours: green (low) → yellow (mid) → brown (high)
        for (let i = 0; i < worldVerts.length; i++) {
            const v = vertexSoup[i];
            const t = (v.altitude - minAlt) / altRange;
            let r, g, b;
            if (t < 0.5) {
                const s = t * 2;                              // 0 → 1 in the lower half
                r = (34  + s * (210 - 34))  / 255;           // Dark green → yellow-green
                g = (139 + s * (180 - 139)) / 255;
                b = (34  + s * (0   - 34))  / 255;
            } else {
                const s = (t - 0.5) * 2;                     // 0 → 1 in the upper half
                r = (210 + s * (101 - 210)) / 255;           // Yellow-green → brown
                g = (180 + s * (67  - 180)) / 255;
                b = (0   + s * (33  - 0))   / 255;
            }
            this.vertexColors.push(r, g, b, 1);
        }

        // Store triangle faces as index triples
        for (let i = 0; i < triangles.length; i += 3) {
            this.faces.push([triangles[i], triangles[i + 1], triangles[i + 2]]);
        }
    });

    // Skip normal computation — no lighting is used, so normals are wasted work
    terrainGeometry.computeNormals = () => {};
}

/**
 * rebuildPathCache() — pre-projects all path GPS points into world coordinates.
 *
 * Stores the results in cachedPathVerts so drawAllPaths() only needs to iterate
 * a plain array of numbers instead of repeating the projection math every frame.
 * Called only when pathsDirtyCache is true.
 */
function rebuildPathCache() {
    if (!paths.length) { cachedPathVerts = null; return; }
    cachedPathVerts = paths.map((dataObj) =>
        dataObj.path.map((p) => vertToWorld(p))
    );
}

// ─── p5 draw loop ────────────────────────────────────────────────────────────

/**
 * draw() — p5 hook called every frame (capped at 30 fps by setup).
 *
 * Checks dirty flags first so geometry is rebuilt only when data changed.
 * Returns early without rendering if needsRedraw is false — this is the
 * main mobile battery saving: we stop burning GPU cycles between interactions.
 */
function draw() {
    // Rebuild GPU geometry when new path data has arrived
    if (pathsDirty) {
        rebuildTerrainGeometry();
        pathsDirty = false;
    }

    // Rebuild the lightweight path vertex cache for the same reason
    if (pathsDirtyCache) {
        rebuildPathCache();
        pathsDirtyCache = false;
    }

    // Nothing changed since the last frame — skip rendering entirely
    if (!needsRedraw) return;
    needsRedraw = false;

    background(100);

    // Flat cyan water plane sitting just below the terrain
    push();
    noStroke();
    fill("#00ffff");
    translate(0, 10, 0);
    rotateX(90);
    plane(10000);
    pop();

    // Position the camera using cached trig values
    updateCamTrig();
    const camX = camTarget.x + camDistance * _camCosY * _camSinX;
    const camY = camTarget.y + camDistance * _camSinY;
    const camZ = camTarget.z + camDistance * _camCosY * _camCosX;
    camera(camX, camY, camZ, camTarget.x, camTarget.y, camTarget.z, 0, 1, 0);

    drawSurface();
    if (cachedPathVerts) drawAllPaths();
}

// ─── Renderers ───────────────────────────────────────────────────────────────

/**
 * drawSurface() — renders the terrain mesh.
 *
 * Passes the pre-built p5.Geometry to model(), which issues a single WebGL
 * draw call for the entire triangulated surface. Much cheaper than calling
 * fill() + vertex() per triangle vertex as the original code did.
 */
function drawSurface() {
    if (!terrainGeometry) return;
    push();
    noStroke();
    model(terrainGeometry);
    pop();
}

/**
 * drawAllPaths() — draws every recorded GPS track as a 3D polyline.
 *
 * Shares a single push()/pop() across all paths to avoid flushing the WebGL
 * state machine between each one. Vertices come from cachedPathVerts so no
 * coordinate math runs here.
 */
function drawAllPaths() {
    push();
    noFill();
    stroke("#000");
    strokeWeight(2);
    for (const verts of cachedPathVerts) {
        beginShape();
        for (const { px, py, pz } of verts) vertex(px, py, pz);
        endShape();
    }
    pop();
}

// ─── Mouse input ─────────────────────────────────────────────────────────────

/**
 * mousePressed(event) — records which mouse button started a drag.
 * Left button = pan the camera target; right button = orbit the camera.
 */
function mousePressed(event) {
    if (event && event.button === 2) isRightDragging = true;
    else isDragging = true;
    lastMouseX = mouseX;
    lastMouseY = mouseY;
    return false;  // Prevent default browser behaviour
}

/**
 * mouseReleased() — ends any active mouse drag.
 */
function mouseReleased() { isDragging = false; isRightDragging = false; }

/**
 * mouseDragged() — updates the camera based on mouse movement since last frame.
 *
 * Right-drag: orbits the camera around the target (changes camAngleX/Y).
 *   Marks _camDirty so trig is recomputed next frame.
 * Left-drag: pans the camera target in the XZ plane aligned to the current
 *   view direction (uses cached _camCosX/_camSinX to avoid extra trig calls).
 */
function mouseDragged() {
    const deltaX = mouseX - lastMouseX;
    const deltaY = mouseY - lastMouseY;

    if (isRightDragging) {
        camAngleX += -deltaX * 0.005;
        camAngleY  = constrain(camAngleY - deltaY * 0.01, minTilt, maxTilt);
        _camDirty  = true;
    } else if (isDragging) {
        const panSpeed = camDistance * 0.001;
        camTarget.x += _camCosX * -deltaX * panSpeed - _camSinX * deltaY * panSpeed;
        camTarget.z += -_camSinX * -deltaX * panSpeed - _camCosX * deltaY * panSpeed;
    }

    lastMouseX = mouseX;
    lastMouseY = mouseY;
    needsRedraw = true;
    return false;
}

/**
 * mouseWheel(event) — zooms by adjusting the camera's orbital distance.
 * Clamped between minDistance and maxDistance.
 */
function mouseWheel(event) {
    camDistance = constrain(camDistance + event.delta * 0.5, minDistance, maxDistance);
    needsRedraw = true;
    return false;
}

// ─── Touch input ─────────────────────────────────────────────────────────────

let lastTouchX, lastTouchY;         // Last position of a single-finger touch
let lastTwoFingerDist;              // Pixel distance between two fingers on the previous frame
let lastTwoFingerMidpoint;          // Midpoint of the two fingers on the previous frame

/**
 * touchStarted() — records the initial touch position(s) when fingers land.
 * One finger: stores the starting position for pan tracking.
 * Two fingers: stores the starting pinch distance and midpoint for
 *   zoom and tilt tracking.
 */
function touchStarted() {
    if (touches.length === 1) {
        lastTouchX = touches[0].x;
        lastTouchY = touches[0].y;
    } else if (touches.length === 2) {
        lastTwoFingerDist = dist(touches[0].x, touches[0].y, touches[1].x, touches[1].y);
        lastTwoFingerMidpoint = {
            x: (touches[0].x + touches[1].x) / 2,
            y: (touches[0].y + touches[1].y) / 2,
        };
    }
    return false;
}

/**
 * touchMoved() — updates the camera as fingers move across the screen.
 *
 * One finger: pans the camera target in the XZ plane (same logic as left
 *   mouse drag, using cached trig for the current view direction).
 * Two fingers: pinch to zoom (camDistance), vertical midpoint drag to tilt
 *   (camAngleY), horizontal midpoint drag to orbit (camAngleX).
 */
function touchMoved() {
    if (touches.length === 1) {
        const dx = touches[0].x - lastTouchX;
        const dy = touches[0].y - lastTouchY;
        const panSpeed = camDistance * 0.001;
        camTarget.x += _camCosX * -dx * panSpeed - _camSinX * dy * panSpeed;
        camTarget.z += -_camSinX * -dx * panSpeed - _camCosX * dy * panSpeed;
        lastTouchX = touches[0].x;
        lastTouchY = touches[0].y;
    } else if (touches.length === 2) {
        const currentDist = dist(touches[0].x, touches[0].y, touches[1].x, touches[1].y);
        const currentMid  = {
            x: (touches[0].x + touches[1].x) / 2,
            y: (touches[0].y + touches[1].y) / 2,
        };
        camDistance = constrain(camDistance - (currentDist - lastTwoFingerDist) * 2, minDistance, maxDistance);
        camAngleY   = constrain(camAngleY + (currentMid.y - lastTwoFingerMidpoint.y) * 0.005, minTilt, maxTilt);
        camAngleX  += (currentMid.x - lastTwoFingerMidpoint.x) * 0.005;
        _camDirty   = true;
        lastTwoFingerDist      = currentDist;
        lastTwoFingerMidpoint  = currentMid;
    }
    needsRedraw = true;
    return false;
}

/**
 * touchEnded() — called when a finger is lifted.
 * No state needs clearing here (touchStarted re-initialises on the next touch),
 * but the handler must exist and return false to prevent default scroll behaviour.
 */
function touchEnded() { return false; }

/**
 * windowResized() — keeps the canvas filling the browser window when it is
 * resized or the phone is rotated. Triggers a redraw so the new size is shown.
 */
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);  // Always fill the full screen
    needsRedraw = true;
}