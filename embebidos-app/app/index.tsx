import { Redirect } from "expo-router";

/**
 * Indica que por defecto vyaa a la pantalla de Share
 */
export default function Index() {
    return <Redirect href="/share" />;
}
