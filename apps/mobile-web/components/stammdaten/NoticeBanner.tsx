import type { ReactNode } from "react";
import { Text, View } from "react-native";

type NoticeBannerTone = "info" | "error" | "warning";

const TONES: Record<NoticeBannerTone, { bg: string; border: string; text: string }> = {
  info: { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF" },
  error: { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B" },
  warning: { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E" },
};

interface NoticeBannerProps {
  tone?: NoticeBannerTone;
  /** Bold lead-in, e.g. "Nur deaktivieren, nicht löschen." */
  title?: string;
  children: ReactNode;
}

/** Mockup hint/notice banners (info-blue, error-red, stale-amber). */
export function NoticeBanner({ tone = "info", title, children }: NoticeBannerProps) {
  const toneStyle = TONES[tone];
  return (
    <View
      className="rounded-mud px-3.5 py-3"
      style={{
        backgroundColor: toneStyle.bg,
        borderWidth: 1,
        borderColor: toneStyle.border,
      }}
      testID={`notice-banner-${tone}`}
    >
      {title ? (
        <Text className="text-sm font-semibold" style={{ color: toneStyle.text }}>
          {title}
        </Text>
      ) : null}
      <Text className="text-sm" style={{ color: toneStyle.text, lineHeight: 20 }}>
        {children}
      </Text>
    </View>
  );
}
