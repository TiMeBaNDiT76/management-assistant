import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../src/auth/auth-context";
import { colors } from "../../src/theme/tokens";

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
    default:
      if (error instanceof Error && error.message) return error.message;
      return "Anmeldung fehlgeschlagen. Bitte versuche es erneut.";
  }
}

/**
 * Login screen (email/password sign-in and registration).
 * The tab area is protected — successful auth redirects to `/(tabs)`.
 */
export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
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
