import React from "react";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { LoadingState, Screen } from "../components/ui";
import StoreScreen from "./StoreScreen";
import StoreCheckInScreen from "./StoreCheckInScreen";
import { useStorePresence } from "./loja/useStorePresence";

export default function StoreTabScreen({ navigation }: { navigation: NavigationProp<ParamListBase> }) {
  const presence = useStorePresence();

  if (presence.isLoading) {
    return (
      <Screen withTabBar>
        <LoadingState />
      </Screen>
    );
  }

  return presence.data?.me.checkedIn ? <StoreScreen navigation={navigation} inTab /> : <StoreCheckInScreen embedded />;
}
