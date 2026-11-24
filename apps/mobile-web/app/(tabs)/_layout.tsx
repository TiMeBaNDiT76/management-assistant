import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../src/auth/auth-context";
import { colors } from "../../src/theme/tokens";

/**
 * Bottom navigation mirroring the mockup areas (people, conversations, tasks)
 * plus the Administration area (Stammdaten). Protected area: signed-out
 * visitors are redirected to the login screen.
 */
export default function TabsLayout() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "signedOut") {
      router.replace("/(auth)/login");
    }
  }, [status, router]);

  if (status !== "signedIn") {
    // Redirect in progress or session still loading.
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.canvas,
        }}
        testID="tabs-guard"
      >
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary.DEFAULT,
        tabBarInactiveTintColor: colors.inkSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Übersicht",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="people/index"
        options={{
          title: "Menschen",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          title: "Gespräche",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Aufgaben",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-done-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="stammdaten/index"
        options={{
          title: "Stammdaten",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={String(color)} />
          ),
        }}
      />
      {/* Category editors render inside the shell but are not tab buttons. */}
      <Tabs.Screen name="people/[id]" options={{ href: null }} />
      <Tabs.Screen name="stammdaten/rollen" options={{ href: null }} />
      <Tabs.Screen name="stammdaten/abteilungen" options={{ href: null }} />
      <Tabs.Screen name="stammdaten/beziehungstypen" options={{ href: null }} />
      <Tabs.Screen name="stammdaten/terminarten" options={{ href: null }} />
      <Tabs.Screen name="stammdaten/task-status" options={{ href: null }} />
      <Tabs.Screen name="stammdaten/standorte" options={{ href: null }} />
      <Tabs.Screen name="stammdaten/feiertage" options={{ href: null }} />
      <Tabs.Screen name="stammdaten/laender" options={{ href: null }} />
    </Tabs>
  );
}
