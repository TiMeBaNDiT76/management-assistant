import "nativewind";
import "../global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/auth/auth-context";
import { colors } from "../src/theme/tokens";
import { TRPCProvider, createTrpcClient } from "../src/lib/trpc";

/**
 * Blocks rendering until the auth session state is resolved, then renders
 * the app. Route protection itself lives in `app/(tabs)/_layout.tsx`.
 */
function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === "loading") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.canvas,
        }}
        testID="auth-loading"
      >
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }
  return <>{children}</>;
}

/**
 * Root providers: auth session, tRPC (typed against `AppRouter`), React
 * Query, safe area. The tab navigation lives in `app/(tabs)/_layout.tsx`.
 */
export default function RootLayout() {
  const queryClient = useMemo(() => new QueryClient(), []);
  const trpcClient = useMemo(() => createTrpcClient(), []);

  return (
    <AuthProvider>
      <AuthGate>
        <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <SafeAreaProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false }} />
            </SafeAreaProvider>
          </QueryClientProvider>
        </TRPCProvider>
      </AuthGate>
    </AuthProvider>
  );
}
