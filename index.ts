import { registerRootComponent } from "expo";

import App from "./App";

if (__DEV__ && process.env.EXPO_PUBLIC_MIPO_PREVIEW === "1") {
  require("./preview/mockApi").installPreviewMode();
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
