const express = require("express");
const path = require("path");
const admin = require("firebase-admin");

const app = express();

// Initialize Firebase Admin SDK
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://tracked-9a600-default-rtdb.firebaseio.com"
});

const db = admin.database();
const pointsRef = db.ref('points');

function listen() {
  var host = "192.168.80.22";
  var port = server.address().port;
  console.log("Example app listening at http://" + host + ":" + port);
}

var server = app.listen(process.env.PORT || 3000, listen);
app.use(express.static("monitor"));

// API endpoint to get all points
app.get("/api/paths", async (req, res) => {
  try {
    const snapshot = await pointsRef.once('value');
    const points = snapshot.val() || {};
    
    // Group points by socketId to match your original structure
    const pathsBySocket = {};
    Object.entries(points).forEach(([pointId, point]) => {
      if (!pathsBySocket[point.socketId]) {
        pathsBySocket[point.socketId] = {
          name: point.socketId,
          path: []
        };
      }
      pathsBySocket[point.socketId].path.push({
        id: pointId,
        latitude: point.latitude,
        longitude: point.longitude,
        altitude: point.altitude,
        timestamp: point.timestamp
      });
    });
    
    res.json(Object.values(pathsBySocket));
  } catch (error) {
    console.error("Error fetching paths:", error);
    res.status(500).json({ error: "Failed to fetch paths" });
  }
});

var io = require("socket.io")(server, {
  allowEIO3: true,
});

io.sockets.on("connection", function (socket) {
  console.log("We have a new client: " + socket.id);

  // Helper function to save points to Firebase
  async function savePointToFirebase(data) {
    try {
      // Handle both single points and arrays
      const points = Array.isArray(data) ? data : [data];
      
      for (const point of points) {
        // Generate a new unique ID for each point
        const newPointRef = pointsRef.push();
        
        await newPointRef.set({
          socketId: socket.id,
          latitude: point.latitude || point.lat || 0,
          longitude: point.longitude || point.lng || point.lon || 0,
          altitude: point.altitude || point.alt || 0,
          timestamp: admin.database.ServerValue.TIMESTAMP
        });
      }
    } catch (error) {
      console.error("Error saving to Firebase:", error);
    }
  }

  socket.on("point", function (data) {
    socket.broadcast.emit("point", data);
    console.log(socket.id, data);
    savePointToFirebase(data);
  });

  socket.on("upload", function (data) {
    socket.broadcast.emit("point", data);
    console.log(socket.id, data);
    savePointToFirebase(data);
  });

  socket.on("disconnect", (reason) => {
    console.log("Client has disconnected " + socket.id + " " + reason);
    io.sockets.emit("disusr", socket.id);
  });
});