import React, { useEffect } from "react";
import { Pressable, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Bell, Home, LucideIcon, ShieldCheck, Store, User, Users } from "lucide-react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { CountBadge } from "../components/ui/CountBadge";
import { MipoText } from "../components/ui/Text";
import { haptic } from "../motion/haptics";
import { useReducedMotion } from "../motion/reducedMotion";
import { springs } from "../motion/tokens";
import { TAB_BAR_HEIGHT } from "../components/ui/Screen";
import { useTheme } from "../theme/ThemeProvider";
import { palettes, stroke } from "../theme/tokens";

const icons: Record<string, LucideIcon> = {
  Início: Home,
  Painel: ShieldCheck,
  Social: Users,
  "Na loja": Store,
  Notificações: Bell,
  Perfil: User,
};

function TabIcon({ icon: Icon, focused }: { icon: LucideIcon; focused: boolean }) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (focused && !reducedMotion) {
      scale.value = withSequence(withTiming(0.8, { duration: 80 }), withSpring(1.1, springs.pop), withSpring(1, springs.pop));
    }
  }, [focused, reducedMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        {
          paddingHorizontal: focused ? 12 : 0,
          paddingVertical: 4,
          borderRadius: 12,
          borderWidth: focused ? stroke.thin : 0,
          borderColor: palettes.dark.line,
          backgroundColor: focused ? colors.tabText : "transparent",
        },
        animatedStyle,
      ]}
    >
      <Icon size={20} color={focused ? colors.onColor : colors.tabMuted} strokeWidth={2.4} />
    </Animated.View>
  );
}

export function MipoTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { colors } = useTheme();

  return (
    <View
      testID="mipo-tab-bar"
      accessibilityRole="tablist"
      style={{
        position: "absolute",
        left: 10,
        right: 10,
        bottom: insets.bottom + 12,
        height: TAB_BAR_HEIGHT,
        borderRadius: 22,
        borderWidth: stroke.regular,
        borderColor: palettes.dark.line,
        backgroundColor: colors.tab,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = typeof options.tabBarLabel === "string" ? options.tabBarLabel : route.name;
        const focused = state.index === index;
        const badge = options.tabBarBadge;
        const Icon = icons[route.name] ?? Home;

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (focused || event.defaultPrevented) return;
          haptic.select();
          navigation.navigate(route.name, route.params);
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 48, gap: 2 }}
          >
            <View>
              <TabIcon icon={Icon} focused={focused} />
              {typeof badge === "number" ? (
                <CountBadge count={badge} style={{ position: "absolute", top: -6, right: -10 }} />
              ) : badge !== undefined ? (
                <View
                  testID={`tab-dot-${route.name}`}
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -4,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: colors.red,
                    borderWidth: 2,
                    borderColor: colors.tab,
                  }}
                />
              ) : null}
            </View>
            <MipoText variant="micro" style={{ fontSize: 10, color: focused ? colors.tabText : colors.tabMuted }}>
              {label}
            </MipoText>
          </Pressable>
        );
      })}
    </View>
  );
}
