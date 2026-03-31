let paths = [
    {
        name: "inner_sweep",
        path: [
            { x: 0, y: 5, z: 0 },
            { x: 20, y: 15, z: 10 },
            { x: 50, y: 25, z: 30 },
            { x: 70, y: 20, z: 60 },
            { x: 80, y: 10, z: 100 },
            { x: 70, y: 5, z: 140 },
            { x: 50, y: 0, z: 170 },
        ],
    },
    {
        name: "middle_sweep",
        path: [
            { x: 50, y: 8, z: 0 },
            { x: 70, y: 18, z: 15 },
            { x: 100, y: 28, z: 40 },
            { x: 120, y: 22, z: 75 },
            { x: 130, y: 12, z: 120 },
            { x: 120, y: 6, z: 170 },
            { x: 100, y: 2, z: 210 },
        ],
    },
    {
        name: "outer_sweep",
        path: [
            { x: 100, y: 12, z: 0 },
            { x: 120, y: 22, z: 20 },
            { x: 150, y: 32, z: 50 },
            { x: 170, y: 25, z: 90 },
            { x: 180, y: 15, z: 140 },
            { x: 170, y: 8, z: 200 },
            { x: 150, y: 4, z: 250 },
        ],
    },
    {
        name: "z_axis_parallel",
        path: [
            { x: 250, y: 0, z: 0 },
            { x: 250, y: 5, z: 40 },
            { x: 250, y: 15, z: 80 },
            { x: 250, y: 25, z: 120 },
            { x: 250, y: 20, z: 160 },
            { x: 250, y: 10, z: 200 },
            { x: 250, y: 0, z: 240 },
        ],
    },
    {
        name: "x_axis_parallel",
        path: [
            { x: 0, y: 0, z: 320 },
            { x: 40, y: 8, z: 320 },
            { x: 80, y: 15, z: 320 },
            { x: 120, y: 25, z: 320 },
            { x: 160, y: 20, z: 320 },
            { x: 200, y: 10, z: 320 },
            { x: 240, y: 0, z: 320 },
        ],
    },
    {
        name: "outer_diagonal_rim",
        path: [
            { x: 300, y: 60, z: 300 },
            { x: 320, y: 50, z: 340 },
            { x: 340, y: 40, z: 380 },
            { x: 360, y: 30, z: 420 },
            { x: 340, y: 25, z: 460 },
            { x: 320, y: 12, z: 500 },
            { x: 300, y: 0, z: 540 },
        ],
    },
    {
        name: "receding_curve",
        path: [
            { x: 400, y: 0, z: 600 },
            { x: 350, y: 10, z: 610 },
            { x: 300, y: 20, z: 625 },
            { x: 250, y: 35, z: 650 },
            { x: 200, y: 22, z: 640 },
            { x: 150, y: 10, z: 620 },
            { x: 100, y: 0, z: 600 },
        ],
    },
    {
        name: "inner_sweep",
        path: [
            { x: 0, y: 5, z: 0 },
            { x: 20, y: 15, z: 10 },
            { x: 50, y: 25, z: 30 },
            { x: 70, y: 20, z: 60 },
            { x: 80, y: 10, z: 100 },
            { x: 70, y: 5, z: 140 },
            { x: 50, y: 0, z: 170 },
        ],
    },
    {
        name: "path12",
        path: [
            { x: 0, y: 10, z: 850 },
            { x: 100, y: 40, z: 860 },
            { x: 200, y: 60, z: 880 },
            { x: 300, y: 40, z: 860 },
            { x: 400, y: 10, z: 850 },
        ],
    },
    {
        name: "path13",
        path: [
            { x: 50, y: 5, z: 950 },
            { x: 150, y: 25, z: 970 },
            { x: 250, y: 45, z: 990 },
            { x: 350, y: 25, z: 970 },
            { x: 450, y: 5, z: 950 },
        ],
    },
    {
        name: "path16",
        path: [
            { x: 150, y: 40, z: 1250 },
            { x: 250, y: 90, z: 1270 },
            { x: 350, y: 140, z: 1300 },
            { x: 450, y: 90, z: 1270 },
            { x: 550, y: 40, z: 1250 },
        ],
    },
    {
        name: "path22_far_ridge",
        path: [
            { x: -200, y: 10, z: 1000 },
            { x: 50, y: 40, z: 1050 },
            { x: 300, y: 70, z: 1100 },
            { x: 550, y: 40, z: 1050 },
            { x: 800, y: 10, z: 1000 },
        ],
    },
    {
        name: "path27_outer_spine",
        path: [
            { x: 1100, y: 0, z: 0 },
            { x: 1100, y: 50, z: 250 },
            { x: 1100, y: 20, z: 500 },
            { x: 1100, y: 100, z: 750 },
            { x: 1100, y: 30, z: 1000 },
            { x: 1100, y: 150, z: 1250 },
            { x: 1100, y: 40, z: 1500 },
            { x: 1100, y: 200, z: 1750 },
            { x: 1100, y: 0, z: 2000 },
        ],
    },
    {
        name: "path24_the_monolith_row",
        path: [
            { x: 100, y: 0, z: 1500 },
            { x: 250, y: 180, z: 1550 },
            { x: 400, y: 220, z: 1600 },
            { x: 550, y: 180, z: 1550 },
            { x: 700, y: 0, z: 1500 },
        ],
    },
    {
        name: "path26_horizon_edge",
        path: [
            { x: -400, y: 0, z: 2000 },
            { x: -100, y: 5, z: 2000 },
            { x: 200, y: 10, z: 2000 },
            { x: 500, y: 5, z: 2000 },
            { x: 800, y: 0, z: 2000 },
        ],
    },
];

function setup() {
    createCanvas(window.innerWidth, window.innerHeight, WEBGL);
    //easycam = new Dw.EasyCam(this._renderer, { distance: 150 });

    angleMode(DEGREES);
    debugMode(GRID, 1000);
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
    translate(-250, -100, 0);
    rotateWithFrameCount();
    box(30);
    pop();

    normalMaterial();
    //stroke(150);
    strokeWeight(0.5);
}

function drawSurface(vertexData, fillColor) {
    let vertexSoup = vertexData.flatMap((p) => p.path);

    let yValues = vertexSoup.map((v) => v.y);
    let minY = Math.min(...yValues);
    let maxY = Math.max(...yValues);

    const delaunay = d3.Delaunay.from(vertexSoup.map((v) => [v.x, v.z]));
    let triangles = delaunay.triangles;
    push();
    fill(fillColor);
    beginShape(TRIANGLES);
    for (let i = 0; i < triangles.length; i++) {
        let index = triangles[i];
        let v = vertexSoup[index];

        // 4. Map the Y value to a 0.0 - 1.0 range
        let interpolationFactor = map(v.y, minY, maxY, 0, 1);

        // 5. Calculate color: Green (0) to Red (1)
        let c1 = color(0, 150, 0); // Green
        let c2 = color(255, 0, 0); // Red
        let gradColor = lerpColor(c1, c2, interpolationFactor);

        fill(gradColor);

        vertex(-v.x + 500, -v.y, -v.z + 500);
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
        vertex(-p.x + 500, -p.y, -p.z + 500);
    }
    endShape();
    pop();
}

function rotateWithFrameCount() {
    rotateZ(frameCount);
    rotateX(frameCount);
    rotateY(frameCount);
}
