import { Image } from "expo-image";
import { useEffect, useState, useRef } from "react";
import io, { Socket } from "socket.io-client";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
    Platform,
    StyleSheet,
    Text,
    View,
    Button,
    TouchableOpacity,
} from "react-native";
import {
  FilamentScene,
  FilamentView,
  DefaultLight,
  Model,
  Camera,
} from "react-native-filament";

const socketEndpoint = "https://embebidos-uumb.onrender.com/";

export default function RecordScreen() {
    const [hasConnection, setConnection] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedPath, setRecordedPath] = useState<any[]>([]);
    const [location, setLocation] = useState<Location.LocationObject | null>(
        null,
    );
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const socketRef = useRef<Socket | null>(null);

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

    return (
        <WebView
            style={styles.container}
            source={{ uri: "https://embebidos-uumb.onrender.com/" }}
        />
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
