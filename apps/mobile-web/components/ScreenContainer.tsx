import type { ReactNode } from "react";
import { View } from "react-native";

interface ScreenContainerProps {
  children: ReactNode;
  testID?: string;
}

/**
 * Centers and caps content width on desktop (≥760px, Tailwind `max-w-6xl`),
 * full-bleed on phones. Long list rows shouldn't stretch across a wide
 * browser window — the mockup pages keep a comfortable measure.
 */
export function ScreenContainer({ children, testID }: ScreenContainerProps) {
  return (
    <View className="w-full flex-1 self-center ns:max-w-6xl" testID={testID}>
      {children}
    </View>
  );
}
