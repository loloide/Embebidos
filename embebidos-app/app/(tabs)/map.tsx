import { WebView } from "react-native-webview";
import { StyleSheet } from "react-native";

/**
 *
 * @returns La pantalla del mapa
 */
export default function RecordScreen() {
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
    },
    header: {
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "left",
        margin: 10,
    },
});
