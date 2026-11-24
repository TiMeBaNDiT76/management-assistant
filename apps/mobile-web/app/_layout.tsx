import "nativewind";
import "../global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TRPCProvider, createTrpcClient } from "../src/lib/trpc";

/**
 * Root providers: tRPC (typed against `AppRouter`), React Query, safe area.
 * The tab navigation lives in `app/(tabs)/_layout.tsx`.
 */
export default function RootLayout() {
  const queryClient = useMemo(() => new QueryClient(), []);
  const trpcClient = useMemo(() => createTrpcClient(), []);

  return (
    <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </SafeAreaProvider>
      </QueryClientProvider>
    </TRPCProvider>
  );
}
