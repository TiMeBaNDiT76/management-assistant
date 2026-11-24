# Firebase-Setup (einmalig, ~5 Minuten, manuell)

Die Firebase-App-Registrierung ist ein einmaliger Console-Schritt (die
Firebase Management API steht für automatisierte Registrierung nicht mehr zur
Verfügung). Danach funktioniert das Login automatisch über die
Umgebungsvariablen — im Repo ist nichts hartcodiert.

## 1. Firebase zur Cloud-Projekt hinzufügen

1. Öffne: <https://console.firebase.google.com/> → „Projekt hinzufügen" →
   **Vorhandenes GCP-Projekt wählen** → `managerassistant`
2. (Analytics kann abgelehnt werden.)

Direktlink: <https://console.firebase.google.com/u/0/>

## 2. Web-App registrieren

1. Projekt-Übersicht → Web-App hinzufügen (</>-Icon) → Name z. B.
   „Management Assistant Web"
2. Die angezeigte Konfiguration enthält die vier Werte für Schritt 4:
   `apiKey`, `authDomain`, `projectId`, `appId`

## 3. E-Mail/Passwort-Sign-in aktivieren

Authentication → „Get started" → Anbieter **E-Mail/Passwort** → aktivieren →
Speichern.

Direktlink: <https://console.firebase.google.com/u/0/project/managerassistant/authentication>

## 4. Werte hinterlegen (NICHT ins Repository committen!)

**Lokal** (`.env` im Repo-Root bzw. `apps/mobile-web/.env`):

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

**GitHub** (für den Web-Deploy — als **Repository Secrets**, Namen wie oben):

```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_APP_ID
```

Die Deploy-Workflows lesen diese Secrets beim Web-Export ein
(`EXPO_PUBLIC_*`-Variablen werden zur Build-Zeit in den Bundle eingebettet).

> Hinweis: Firebase-Web-API-Keys sind keine Geheimnisse im klassischen Sinn
> (öffentliche Client-Identifier), aber wir halten uns an die Repo-Regel
> „keine Keys im Quellcode" und führen sie ausschließlich über Env-Vars.

## 5. Optional: lokaler Dev-Bypass

Ohne Firebase-Konfiguration (oder zusätzlich) funktioniert die App lokal
sofort mit Mock-Auth:

```bash
EXPO_PUBLIC_DEV_AUTH_BYPASS=true
```

Dann meldet der Auth-Provider den festen Dev-Benutzer `dev-local-user` an —
identisch zur Identität, die das Backend bei `DEV_BYPASS_AUTH=true` erwartet.
Der Bypass ist im Produktionston aktiv (Setzen der Variablen nur lokal).
