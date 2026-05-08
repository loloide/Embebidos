import { Image } from "expo-image";
import { useEffect, useState, useRef } from "react";
import io, { Socket } from "socket.io-client";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
    Platform,
    StyleSheet,
    Text,
    View,
    Button,
    TouchableOpacity,
} from "react-native";

const socketEndpoint = "https://embebidos-uumb.onrender.com";

export default function StreamScreen() {
    const [hasConnection, setConnection] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedPath, setRecordedPath] = useState<any[]>([]);
    const [location, setLocation] = useState<Location.LocationObject | null>(
        null,
    );
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const socketRef = useRef<Socket | null>(null);

    // Handle Socket Lifecycle
    useEffect(() => {
        socketRef.current = io(socketEndpoint, {
            transports: ["websocket"],
        });

        const socket = socketRef.current;

        socket.on("connect", () => setConnection(true));
        socket.on("disconnect", () => setConnection(false));

        return () => {
            socket.off("connect");
            socket.off("disconnect");
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        let subscriber: Location.LocationSubscription | null = null;

        async function startWatching() {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                setErrorMsg("Permission denied");
                return;
            }
            subscriber = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 10000,
                    distanceInterval: 5,
                },
                (newLocation) => {
                    setLocation(newLocation);
                },
            );
        }

        startWatching();

        return () => {
            if (subscriber) subscriber.remove();
        };
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if ((isStreaming||isRecording) && location) {
            interval = setInterval(() => {
                const point = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    altitude: location.coords.altitude,
                    timestamp: location.timestamp,
                };

                // Logic A: Streaming (Send to Server)
                if (isStreaming && socketRef.current?.connected) {
                    socketRef.current.emit("point", point);
                }
                if (isRecording) {
                    setRecordedPath((prev) => [...prev, point]);
                }
            }, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRecording, isStreaming, location]);
    return (
        <View style={styles.container}>
            {!hasConnection ? (
                <>
                    <View>
                        <Text style={[styles.paragraph, styles.header]}>
                            Connecting to {socketEndpoint}...
                        </Text>
                        {errorMsg && (
                            <Text
                                style={[
                                    styles.paragraph,
                                    styles.header,
                                    { color: "red" },
                                ]}
                            >
                                {errorMsg}
                            </Text>
                        )}
                    </View>
                    
                </>
            ) : (
                <>
                    <Text style={styles.header}>Stream in real time</Text>
                    <TouchableOpacity
                        style={[
                            styles.recordButton,
                            {
                                backgroundColor: isStreaming
                                    ? "#ff4444"
                                    : "#d0d0d0",
                            },
                        ]}
                        onPress={() => setIsStreaming(!isStreaming)}
                    >
                        <MaterialCommunityIcons
                            name={isStreaming ? "stop" : "broadcast"}
                            size={40}
                            color={isStreaming ? "white" : "black"}
                        />
                    </TouchableOpacity>
                    <Text>Connected to server</Text>
                </>
            )}
            <Text style={styles.header}>Record and send</Text>
            <View style={{ flexDirection: "row" }}>
                <TouchableOpacity
                    style={[
                        styles.recordButton,
                        {
                            backgroundColor: isRecording
                                ? "#ff4444"
                                : "#d0d0d0",
                        },
                    ]}
                    onPress={() => setIsRecording(!isRecording)}
                >
                    <MaterialCommunityIcons
                        name={isRecording ? "stop" : "record"}
                        size={40}
                        color={isRecording ? "white" : "black"}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.recordButton,
                        {
                            backgroundColor:
                                recordedPath.length > 0 ? "#3ec832" : "#d0d0d0",
                        },
                    ]}
                    onPress={() => {
                        console.log(recordedPath);
                        socketRef.current.emit("upload", recordedPath);
                        setRecordedPath([]);
                    }}
                >
                    <MaterialCommunityIcons
                        name="send-variant"
                        size={40}
                        color="black"
                    />
                </TouchableOpacity>
            </View>
            <Text style={styles.coordinates}>
                {location
                    ? `Lat: ${location.coords.latitude}\nLon: ${location.coords.longitude}\nAlt: ${location.coords.altitude}`
                    : "Awaiting GPS..."}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
    },
    recordButton: {
        padding: 20,
        borderRadius: 50,
        marginBottom: 20,
        marginHorizontal: 10,
    },
    paragraph: {
        fontSize: 16,
    },
    coordinates: {
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
        //fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    header: {
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "left",
        margin: 10,
    },
});
