import { useSyncExternalStore } from "react";
import { isNativeApp } from "./native";

// true dentro de la app. En el servidor (y al hidratar) es false, así no hay diferencias de hidratación.
const noop = () => () => {};
export const useIsNativeApp = () => useSyncExternalStore(noop, isNativeApp, () => false);
