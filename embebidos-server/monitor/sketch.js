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

function setup() {
    createCanvas(window.innerWidth, window.innerHeight, WEBGL);
    //easycam = new Dw.EasyCam(this._renderer, { distance: 150 });
    angleMode(DEGREES);
    debugMode();
}

function draw() {
    orbitControl();
    background(250);
    // push()
    // fill("#00ffff")
    // translate(0,-2,0)
    // rotateX(90)
    // plane(1000)
    // pop()

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
        stroke(0)
        vertex(
            -v.latitude * 100000 - (41.13700*100000),
            -v.altitude * 0.898 + 700,
            v.longitude * (100000*Math.cos(v.latitude) ) + (100000* 71.29500* Math.cos(v.latitude) ),
        );
    }
    endShape();
    pop();
}

function drawPath(dataObj, strokeColor) {
    push();
    noFill();
    stroke(strokeColor);
    strokeWeight(4);

    beginShape();
    for (let p of dataObj.path) {
        vertex(
            -p.latitude * 100000 - (41.13700*100000),
            -p.altitude * 0.898 + 700,
            p.longitude * (100000*Math.cos(p.latitude) ) + (100000* 71.29500* Math.cos(p.latitude) ),
        );
    }
    endShape();
    pop();
}

function rotateWithFrameCount() {
    rotateZ(frameCount);
    rotateX(frameCount);
    rotateY(frameCount);
}
