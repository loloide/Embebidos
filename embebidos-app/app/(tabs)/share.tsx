import { useEffect, useState, useRef, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import * as Location from "expo-location";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";

const socketEndpoint = "https://embebidos-uumb.onrender.com";

/**
 *
 * @returns La pantalla que comparte la ubicación
 */
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
    const subscriberRef = useRef<Location.LocationSubscription | null>(null);

    // Administración del socket
    useEffect(() => {
        socketRef.current = io(socketEndpoint, { transports: ["websocket"] });
        const socket = socketRef.current;
        socket.on("connect", () => setConnection(true));
        socket.on("disconnect", () => setConnection(false));

        return () => {
            socket.disconnect();
        };
    }, []);

    // Obtiene la ubicacion del usuario
    const startWatching = useCallback(async () => {
        if (subscriberRef.current) return;

        try {
            const enabled = await Location.hasServicesEnabledAsync();
            if (!enabled) {
                setErrorMsg("GPS is turned off. Please enable it.");
                return;
            }

            const { status: fgStatus } =
                await Location.requestForegroundPermissionsAsync();
            if (fgStatus !== "granted") {
                setErrorMsg("Foreground permission denied");
                return;
            }

            await Location.requestBackgroundPermissionsAsync();
            setErrorMsg(null);

            subscriberRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000,
                    distanceInterval: 5,
                },
                (newLocation) => {
                    setLocation(newLocation);
                },
            );
        } catch (e: any) {
            setErrorMsg("Waiting for GPS signal...");
            console.log(e);
        }
    }, []);

    useEffect(() => {
        startWatching();
        const checkInterval = setInterval(() => {
            if (!location || errorMsg) {
                startWatching();
            }
        }, 5000);

        return () => {
            clearInterval(checkInterval);
            if (subscriberRef.current) {
                subscriberRef.current.remove();
                subscriberRef.current = null;
            }
        };
    }, [location, errorMsg, startWatching]);

    // Envia la ubicación
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if ((isStreaming || isRecording) && location) {
            interval = setInterval(() => {
                const point = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    altitude: location.coords.altitude,
                    timestamp: location.timestamp,
                };

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
                <View>
                    <Text style={[styles.paragraph, styles.header]}>
                        Connecting to server...
                    </Text>
                </View>
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
                        if (socketRef.current) {
                            socketRef.current.emit("upload", recordedPath);
                            setRecordedPath([]);
                        }
                    }}
                >
                    <MaterialCommunityIcons
                        name="send-variant"
                        size={40}
                        color="black"
                    />
                </TouchableOpacity>
            </View>

            {/* Display error message or coordinates */}
            {errorMsg ? (
                <Text style={[styles.coordinates, { color: "red" }]}>
                    {errorMsg}
                </Text>
            ) : (
                <Text style={styles.coordinates}>
                    {location
                        ? `Lat: ${location.coords.latitude.toFixed(5)}\nLon: ${location.coords.longitude.toFixed(5)}\nAlt: ${location.coords.altitude?.toFixed(1) ?? 0}m`
                        : "Awaiting GPS lock..."}
                </Text>
            )}
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
    paragraph: { fontSize: 16 },
    coordinates: {
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
        marginTop: 20,
    },
    header: { fontSize: 18, fontWeight: "bold", textAlign: "left", margin: 10 },
});
