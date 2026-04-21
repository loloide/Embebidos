const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

// Ensure the directory exists
const pathsDir = path.join(__dirname, "paths");
if (!fs.existsSync(pathsDir)) {
    fs.mkdirSync(pathsDir);
}

function listen() {
    var host = "localhost";
    var port = server.address().port;
    console.log("Example app listening at http://" + host + ":" + port);
}

var server = app.listen(process.env.PORT || 3000, listen);
app.use(express.static("monitor"));

app.get("/api/paths", (req, res) => {
    const pathsDir = path.join(__dirname, "paths");
    if (!fs.existsSync(pathsDir)) return res.json([]);

    const files = fs.readdirSync(pathsDir);
    const allPaths = files
        .filter((file) => path.extname(file) === ".json")
        .map((file) =>
            JSON.parse(fs.readFileSync(path.join(pathsDir, file), "utf8")),
        );

    res.json(allPaths);
});

var io = require("socket.io")(server, {
    allowEIO3: true,
});

io.sockets.on("connection", function (socket) {
    console.log("We have a new client: " + socket.id);

    const filePath = path.join(pathsDir, `${socket.id}.json`);

    // Helper function to handle saving points/uploads
    // This only runs when actual data is received
    function savePointToFile(data) {
        fs.readFile(filePath, "utf8", (err, fileData) => {
            let json;

            if (err) {
                // If the file doesn't exist yet (ENOENT), create the initial structure
                if (err.code === "ENOENT") {
                    json = {
                        name: socket.id,
                        path: []
                    };
                } else {
                    console.error("Error reading path file:", err);
                    return;
                }
            } else {
                // If it does exist, parse the existing data
                json = JSON.parse(fileData);
            }

            // Correctly handle bulk arrays vs single objects
            if (Array.isArray(data)) {
                json.path.push(...data); // Unpack the bulk array and add all points
            } else {
                json.path.push(data);    // Add the single point
            }

            // Write the updated (or newly created) JSON to the file
            fs.writeFile(filePath, JSON.stringify(json, null, 2), (err) => {
                if (err) console.error("Error saving data:", err);
            });
        });
    }

    socket.on("point", function (data) {
        socket.broadcast.emit("point", data);
        console.log(socket.id, data);
        savePointToFile(data);
    });

    socket.on("upload", function (data) {
        socket.broadcast.emit("point", data);
        console.log(socket.id, data);
        savePointToFile(data);
    });

    socket.on("disconnect", (reason) => {
        console.log("Client has disconnected " + socket.id + " " + reason);
        io.sockets.emit("disusr", socket.id);
    });
});