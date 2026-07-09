# SmartGestor — Guia de Build e Distribuição do APK Android

> Referência completa para compilar, versionar e distribuir o APK via Capacitor.
> Fonte: `capacitor.config.json`, `android/`, `server.js`

---

## 1. Visão Geral

O aplicativo Android é um **WebView nativo** que carrega a mesma SPA do servidor web.
A tecnologia usada é **Capacitor 8.x** (Ionic), que empacota `public/` num APK.

```
public/ (WebApp SPA)
    ↕ capac sync
android/ (Projeto Android Studio)
    ↕ gradlew assembleRelease
SmartGestor.apk
    ↕ upload manual
public/smartgestor.apk  ← servido pelo servidor em /smartgestor.apk
```

---

## 2. Configuração Base

### `capacitor.config.json` (raiz do projeto)

```json
{
  "appId": "com.brago.smartgestor",
  "appName": "Smart Gestor",
  "webDir": "public",
  "plugins": {
    "CapacitorHttp": { "enabled": true }
  }
}
```

- **appId**: ID único no Google Play (`com.brago.smartgestor`)
- **webDir**: Aponta para `public/` — o que está lá vai pro APK
- **CapacitorHttp**: Intercepta fetch/XHR para compatibilidade CORS nativa

### `android/variables.gradle`

```groovy
ext {
    minSdkVersion = 24        // Android 7.0 mínimo
    compileSdkVersion = 35
    targetSdkVersion = 35
    androidxActivityVersion = '1.9.0'
    // ... outros deps
}
```

---

## 3. Plugins Capacitor Instalados

| Plugin | Versão | Uso |
|--------|--------|-----|
| `@capacitor/core` | 8.4.0 | Core runtime |
| `@capacitor/android` | 8.4.0 | Plataforma Android |
| `@capacitor/camera` | 8.2.0 | Foto de produção |
| `@capacitor/app` | 8.1.0 | Lifecycle (back button, pause) |
| `@capacitor/push-notifications` | 8.1.1 | Push FCM nativo |
| `@capacitor/local-notifications` | 8.2.0 | Notificações locais |
| `@capacitor-community/background-geolocation` | 1.2.26 | GPS em background |

### Uso no Frontend (`public/js/`)

Os plugins são acessados via `window.Capacitor` ou imports dinâmicos:

```javascript
// GPS Background
import { BackgroundGeolocation } from '@capacitor-community/background-geolocation';

// Câmera
import { Camera } from '@capacitor/camera';

// Push Notifications
import { PushNotifications } from '@capacitor/push-notifications';

// Detectar se está no APK ou no browser
const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
```

---

## 4. Processo de Build do APK

### 4.1 Pré-requisitos

- Node.js 18+
- Java JDK 17
- Android SDK (API 35)
- Gradle (via wrapper `./gradlew`)

### 4.2 Passo a Passo Completo

```bash
# 1. Na raiz do projeto — instalar dependências
npm install

# 2. Sincronizar web → Android
#    Copia public/ para android/app/src/main/assets/public/
npx cap sync android

# 3. Entrar na pasta Android
cd android

# 4. Build de release (assinado)
./gradlew assembleRelease

# APK gerado em:
# android/app/release/SmartGestor.apk
```

### 4.3 Build de Debug (para testes)

```bash
cd android
./gradlew assembleDebug
# APK em: android/app/debug/SmartGestor-debug.apk
```

### 4.4 Assinatura do APK

O APK de release usa keystore configurado em `android/app/build.gradle`:

```groovy
android {
    signingConfigs {
        release {
            storeFile file('keystore.jks')
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

---

## 5. Distribuição do APK

### 5.1 Colocar o APK no servidor (produção)

Após o build, copiar o APK para:
```
public/smartgestor.apk
```

O servidor o serve automaticamente via:
```
GET /smartgestor.apk
GET /SmartGestor.apk  (ambos funcionam)
```

### 5.2 Lógica de Fallback no Servidor

Em `server.js` (linhas 249-293), o servidor tenta servir o APK em ordem:

1. `public/smartgestor.apk` ← Produção (hospedagem)
2. `android/app/release/SmartGestor.apk` ← Desenvolvimento local
3. Google Drive (busca por nome `SmartGestor.apk`)

### 5.3 Verificação de Versão pelo App

O APK chama `GET /api/app-version` no startup para verificar se há atualização:

```json
{
  "version": "1.0.1",
  "url": "/smartgestor.apk",
  "mandatory": false,
  "notes": "Melhorias de desempenho..."
}
```

**Para forçar atualização**:
1. Coloque um arquivo `app-version.json` no Google Drive com a nova versão
2. Defina `"mandatory": true` para forçar atualização imediata

### 5.4 Atualizar a Versão do App

Em `android/app/build.gradle`:
```groovy
android {
    defaultConfig {
        versionCode 2         // Incrementar sempre
        versionName "1.0.2"   // Versão exibida
    }
}
```

---

## 6. Firebase (Push Notifications no APK)

### 6.1 Configuração

- **Arquivo**: `android/app/google-services.json`
- **Package name**: `com.brago.smartgestor`

### 6.2 Fluxo de Push no APK

```
Servidor → Firebase Admin SDK → FCM → Dispositivo Android
```

1. Padeiro instala APK e faz login
2. App solicita permissão de notificação
3. FCM gera token único para o dispositivo
4. App envia token para `POST /api/push/subscribe` com `{ isNative: true, fcmToken: "..." }`
5. Servidor armazena em `push_subscriptions.fcmToken`
6. Quando gestor aciona notificação, servidor usa Firebase Admin SDK para enviar

---

## 7. GPS em Background no APK

### 7.1 Funcionamento

O plugin `@capacitor-community/background-geolocation` mantém o GPS ativo mesmo com o app minimizado.

**Arquivo relevante**: `public/js/location-service.js`

### 7.2 Fluxo de Sincronização GPS

```
GPS Hardware
    ↓ (pontos a cada X segundos)
location-service.js (buffer local)
    ↓ Socket online?
    ├─ SIM → Socket.IO 'update-location' (tempo real)
    └─ NÃO → localStorage buffer
              ↓ ao reconectar
              POST /api/tracking/sync (batch de pontos)
```

### 7.3 Permissões Android Necessárias

Em `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

---

## 8. Câmera no APK

**Plugin**: `@capacitor/camera`

**Uso em** `padeiro-flow.js` — step de fotos de produção:
```javascript
const photo = await Camera.getPhoto({
  quality: 70,
  allowEditing: false,
  resultType: CameraResultType.DataUrl,
  source: CameraSource.Camera
});
```

As fotos são:
1. Salvas como base64 no objeto `atividade.fotos`
2. Enviadas para `PUT /api/atividades/:id`
3. Armazenadas (se Google Drive ativo): `POST /api/upload/foto`

---

## 9. Service Worker vs APK

| Feature | Browser/PWA | APK (Capacitor) |
|---------|-------------|-----------------|
| Offline | Service Worker (`sw.js`) | Cache do Capacitor |
| Push | Web Push API (VAPID) | FCM nativo |
| GPS | `navigator.geolocation` | Plugin background-geolocation |
| Câmera | `<input type="file">` | Plugin Camera nativo |
| Instalação | "Adicionar à tela inicial" | `.apk` download e instalação |

### Detecção no Frontend

```javascript
// Em public/js/app.js ou location-service.js
const isNativeApp = window.Capacitor?.isNativePlatform() === true;

if (isNativeApp) {
  // Usar plugins Capacitor
} else {
  // Usar APIs Web padrão
}
```

---

## 10. Troubleshooting de Build

### Erro: `ANDROID_HOME not set`
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### Erro: `Gradle build failed - compileSdkVersion`
Verificar `android/variables.gradle` e garantir que o SDK está instalado via Android Studio.

### APK instalado mas não abre
- Verificar `versionCode` (deve ser maior que a versão instalada)
- Limpar cache do gradle: `cd android && ./gradlew clean`

### GPS não funciona no APK
- Verificar permissões `ACCESS_BACKGROUND_LOCATION` no Android 11+
- O usuário precisa conceder "Permitir sempre" nas configurações

### Push não chega no APK
- Verificar `google-services.json` com o `package_name: "com.brago.smartgestor"`
- Verificar se o servidor tem a chave correta do Firebase Admin SDK

### Fotos não aparecem após reiniciar
- Verificar se o campo `fotos` em `atividades` está sendo serializado como JSON
- O campo é `TEXT` no MySQL — parser automático em `mysqlDB.js` deve parsear arrays/objetos JSON

---

## 11. Comandos Úteis do Capacitor

```bash
# Abrir projeto no Android Studio
npx cap open android

# Executar no emulador conectado
npx cap run android

# Atualizar plugins
npx cap update

# Ver info do ambiente
npx cap doctor

# Listar dispositivos conectados
npx cap run android --list
```
