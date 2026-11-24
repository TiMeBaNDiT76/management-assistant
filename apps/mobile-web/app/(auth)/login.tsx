import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "../../src/auth/auth-context";
import { colors } from "../../src/theme/tokens";

/** The four-color Google "G" as inline SVG (official sign-in branding). */
function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48" testID="google-logo">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

/** Maps Firebase error codes to friendly German messages. */
function translateAuthError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "E-Mail oder Passwort ist falsch.";
    case "auth/email-already-in-use":
      return "Für diese E-Mail-Adresse existiert bereits ein Konto.";
    case "auth/weak-password":
      return "Das Passwort ist zu schwach (mindestens 6 Zeichen).";
    case "auth/invalid-email":
      return "Bitte gib eine gültige E-Mail-Adresse ein.";
    case "auth/too-many-requests":
      return "Zu viele Versuche. Bitte versuche es später erneut.";
    case "auth/unauthorized-domain":
      return "Diese Domain ist in Firebase nicht freigeschaltet (Authentication → Settings → Authorized domains).";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Anmeldung abgebrochen.";
    case "auth/popup-blocked":
      return "Popup blockiert — bitte Popups erlauben.";
    default:
      if (error instanceof Error && error.message) return error.message;
      return "Anmeldung fehlgeschlagen. Bitte versuche es erneut.";
  }
}

/**
 * Login screen (Google sign-in on web plus email/password sign-in and
 * registration). The tab area is protected — successful auth redirects to
 * `/(tabs)`.
 */
export default function LoginScreen() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
      router.replace("/(tabs)");
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      router.replace("/(tabs)");
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-canvas"
      behavior="padding"
      testID="login-screen"
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold" style={{ color: colors.ink }}>
          Management-Assistent
        </Text>
        <Text className="mt-1 text-sm" style={{ color: colors.inkSecondary }}>
          {isSignUp
            ? "Neues Konto erstellen und loslegen."
            : "Melde dich an, um dein privates Team-Workspace zu öffnen."}
        </Text>

        <View className="mt-8 gap-3">
          <Pressable
            testID="google-sign-in"
            accessibilityRole="button"
            className="flex-row items-center justify-center rounded-lg border py-3"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.divider,
            }}
            onPress={() => {
              if (!busy) void handleGoogleSignIn();
            }}
          >
            {busy ? <ActivityIndicator testID="login-busy" /> : <GoogleLogo />}
            <Text
              className="ml-2 text-base font-semibold"
              style={{ color: colors.ink }}
            >
              Mit Google anmelden
            </Text>
          </Pressable>

          <View className="flex-row items-center" testID="google-divider">
            <View
              className="h-px flex-1"
              style={{ backgroundColor: colors.divider }}
            />
            <Text className="mx-3 text-xs" style={{ color: colors.inkDisabled }}>
              oder
            </Text>
            <View
              className="h-px flex-1"
              style={{ backgroundColor: colors.divider }}
            />
          </View>

          <TextInput
            placeholder="E-Mail"
            placeholderTextColor={colors.inkDisabled}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            className="rounded-lg border border-divider bg-surface px-4 py-3 text-base"
            style={{ color: colors.ink }}
          />
          <TextInput
            placeholder="Passwort"
            placeholderTextColor={colors.inkDisabled}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            className="rounded-lg border border-divider bg-surface px-4 py-3 text-base"
            style={{ color: colors.ink }}
          />

          {error !== null && (
            <Text
              testID="login-error"
              className="text-sm"
              style={{ color: colors.error }}
            >
              {error}
            </Text>
          )}

          <View
            className="mt-2 flex-row items-center justify-center rounded-lg py-3"
            style={{ backgroundColor: colors.primary.DEFAULT }}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" testID="login-busy" />
            ) : null}
            <Text
              className="text-base font-semibold"
              style={{ color: "#FFFFFF" }}
              onPress={() => {
                if (!busy) void handleSubmit();
              }}
              suppressHighlighting
            >
              {isSignUp ? "Registrieren" : "Anmelden"}
            </Text>
          </View>

          <Text
            className="mt-4 text-center text-sm"
            style={{ color: colors.primary.DEFAULT }}
            onPress={() => {
              setError(null);
              setIsSignUp((value) => !value);
            }}
            suppressHighlighting
          >
            {isSignUp
              ? "Du hast bereits ein Konto? Anmelden"
              : "Noch kein Konto? Registrieren"}
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
