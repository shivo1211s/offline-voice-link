# LAN Chat - Offline Voice Link

A peer-to-peer LAN chat application with voice calling capabilities, built with React, Capacitor, and native Android plugins.

## Project info

**URL**: https://lovable.dev/projects/34eded86-dadd-44da-9933-defafd6cc525

## Features

- 📱 Cross-platform (Web + Android)
- 💬 Real-time P2P messaging over LAN
- 📞 Voice calling support
- 🔍 Automatic peer discovery using mDNS/NSD
- 📴 Works completely offline (no internet required)

## Quick Start (Web)

```sh
# Install dependencies
npm install

# Start development server
npm run dev
```

## Android Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Android Studio](https://developer.android.com/studio) (latest version)
- Java JDK 17 (included with Android Studio)

### Build & Run Android App

**Step 1: Install dependencies**
```sh
npm install
```

**Step 2: Build the web app**
```sh
npm run build
```

**Step 3: Sync with Android**
```sh
npx cap sync android
```

**Step 4: Open in Android Studio**
```sh
npx cap open android
```

**Step 5: Run the app**
1. Wait for Gradle sync to complete (bottom status bar)
2. Select your device/emulator from the dropdown (top toolbar)
3. Click the green Run ▶️ button

### Troubleshooting Android Studio

**"No module" in run configuration:**
- Make sure `android/settings.gradle` exists
- Run `npx cap sync android` again
- File → Sync Project with Gradle Files

**Device not showing:**
- Tools → Device Manager → Create Device (for emulator)
- For physical device: Enable USB debugging in Developer Options

**Build errors:**
- File → Invalidate Caches / Restart
- Delete `android/.gradle` folder and sync again

### Live Reload (Development)

To enable hot-reload from the Lovable preview:

1. Edit `capacitor.config.ts`:
```ts
server: {
  url: 'https://34eded86-dadd-44da-9933-defafd6cc525.lovableproject.com?forceHideBadge=true',
  cleartext: true,
  androidScheme: 'https'
}
```

2. Rebuild and run:
```sh
npx cap sync android
npx cap run android
```

## How can I edit this code?

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/34eded86-dadd-44da-9933-defafd6cc525) and start prompting.

**Use your preferred IDE**

Clone this repo and push changes:

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
npm run dev
```

## Technologies

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Mobile**: Capacitor, Android native plugins
- **P2P**: WebSocket, mDNS/NSD for discovery, WebRTC for calls

## Deployment

**Web**: Open [Lovable](https://lovable.dev/projects/34eded86-dadd-44da-9933-defafd6cc525) → Share → Publish

**Android**: Generate signed APK in Android Studio → Build → Generate Signed Bundle/APK

## Custom Domain

To connect a domain: Project → Settings → Domains → Connect Domain

Read more: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
