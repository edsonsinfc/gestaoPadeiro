package com.brago.smartgestor;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {

    private static final String TAG = "ApkUpdaterPlugin";
    private static final AtomicBoolean isDownloading = new AtomicBoolean(false);

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String urlString = call.getString("url");
        if (urlString == null || urlString.isEmpty()) {
            call.reject("URL is required");
            return;
        }

        // Concurrency Guard: prevent multiple download threads from running concurrently
        if (!isDownloading.compareAndSet(false, true)) {
            Log.w(TAG, "Download already in progress. Ignoring duplicate request.");
            call.reject("Download já está em andamento. Aguarde a conclusão.");
            return;
        }

        new Thread(() -> {
            HttpURLConnection connection = null;
            InputStream inputStream = null;
            FileOutputStream outputStream = null;
            File tempFile = null;

            try {
                Context context = getContext();
                URL url = new URL(urlString);

                // Handle redirects (e.g. GitHub Releases 302 to AWS S3)
                int redirectCount = 0;
                while (redirectCount < 7) {
                    connection = (HttpURLConnection) url.openConnection();
                    connection.setRequestMethod("GET");
                    connection.setInstanceFollowRedirects(true);
                    connection.setRequestProperty("User-Agent", "SmartGestor-App");
                    connection.setConnectTimeout(20000);
                    connection.setReadTimeout(45000);
                    connection.connect();

                    int responseCode = connection.getResponseCode();
                    if (responseCode == HttpURLConnection.HTTP_MOVED_TEMP
                            || responseCode == HttpURLConnection.HTTP_MOVED_PERM
                            || responseCode == HttpURLConnection.HTTP_SEE_OTHER
                            || responseCode == 307
                            || responseCode == 308) {
                        String newUrl = connection.getHeaderField("Location");
                        connection.disconnect();
                        if (newUrl != null && !newUrl.isEmpty()) {
                            url = new URL(url, newUrl);
                            redirectCount++;
                            continue;
                        }
                    }

                    if (responseCode != HttpURLConnection.HTTP_OK) {
                        call.reject("Servidor retornou HTTP " + responseCode);
                        return;
                    }
                    break;
                }

                // Prefer external cache dir for FileProvider accessibility across all Android versions
                File storageDir = context.getExternalCacheDir();
                if (storageDir == null) {
                    storageDir = context.getCacheDir();
                }

                File apkFile = new File(storageDir, "update.apk");
                tempFile = new File(storageDir, "update.apk.download");
                if (tempFile.exists()) {
                    tempFile.delete();
                }

                inputStream = connection.getInputStream();
                outputStream = new FileOutputStream(tempFile);

                byte[] buffer = new byte[16384];
                int bytesRead;
                long totalBytesRead = 0;
                long fileLength = connection.getContentLengthLong();

                long lastNotifyTime = 0;
                float lastProgress = 0f;

                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, bytesRead);
                    totalBytesRead += bytesRead;

                    long now = System.currentTimeMillis();
                    if (fileLength > 0 && (now - lastNotifyTime > 120)) {
                        lastNotifyTime = now;
                        float progress = (float) totalBytesRead / fileLength;
                        if (progress >= lastProgress) {
                            lastProgress = progress;
                            JSObject progressObj = new JSObject();
                            progressObj.put("progress", progress);
                            progressObj.put("bytes", totalBytesRead);
                            progressObj.put("total", fileLength);
                            notifyListeners("downloadProgress", progressObj);
                        }
                    }
                }

                outputStream.flush();
                outputStream.close();
                outputStream = null;

                inputStream.close();
                inputStream = null;
                connection.disconnect();
                connection = null;

                Log.d(TAG, "Download completo para arquivo temporário: " + tempFile.length() + " bytes");

                // Validate complete file length if fileLength was known
                if (fileLength > 0 && tempFile.length() < fileLength) {
                    tempFile.delete();
                    call.reject("Download incompleto (" + tempFile.length() + " de " + fileLength + " bytes). Tente novamente.");
                    return;
                }

                // Atomic rename to final target file
                if (apkFile.exists()) {
                    apkFile.delete();
                }
                if (!tempFile.renameTo(apkFile)) {
                    // Fallback to tempFile if rename fails
                    apkFile = tempFile;
                }

                // Validate APK structure using Android PackageManager
                PackageManager pm = context.getPackageManager();
                PackageInfo info = pm.getPackageArchiveInfo(apkFile.getAbsolutePath(), 0);
                if (info == null) {
                    apkFile.delete();
                    Log.e(TAG, "APK baixado está corrompido (getPackageArchiveInfo retornou null)");
                    call.reject("O arquivo de atualização baixado está corrompido. Tente novamente.");
                    return;
                }

                Log.d(TAG, "APK válido verificado: " + info.packageName + " v" + info.versionName + " (" + info.versionCode + ")");

                // Send 100% progress
                JSObject finalProgress = new JSObject();
                finalProgress.put("progress", 1.0f);
                finalProgress.put("bytes", totalBytesRead);
                finalProgress.put("total", totalBytesRead);
                notifyListeners("downloadProgress", finalProgress);

                // Trigger installation
                installApk(context, apkFile, call);

            } catch (Exception e) {
                Log.e(TAG, "Erro durante download ou instalação do APK", e);
                if (tempFile != null && tempFile.exists()) {
                    tempFile.delete();
                }
                call.reject("Falha no download da atualização: " + e.getMessage());
            } finally {
                isDownloading.set(false);
                try { if (outputStream != null) outputStream.close(); } catch (Exception ignored) {}
                try { if (inputStream != null) inputStream.close(); } catch (Exception ignored) {}
                try { if (connection != null) connection.disconnect(); } catch (Exception ignored) {}
            }
        }).start();
    }

    private void installApk(Context context, File apkFile, PluginCall call) {
        try {
            // Check unknown sources installation permission on Android 8.0+ (Oreo+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!context.getPackageManager().canRequestPackageInstalls()) {
                    Log.w(TAG, "Permissão REQUEST_INSTALL_PACKAGES necessária.");
                    Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + context.getPackageName()));
                    settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(settingsIntent);
                    call.reject("Ative a permissão 'Instalar fontes desconhecidas' para o Smart Gestor e tente novamente.");
                    return;
                }
            }

            Intent intent = new Intent(Intent.ACTION_VIEW);
            Uri apkUri;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                String authority = context.getPackageName() + ".fileprovider";
                apkUri = FileProvider.getUriForFile(context, authority, apkFile);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else {
                apkUri = Uri.fromFile(apkFile);
            }

            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            context.startActivity(intent);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao disparar instalador do APK", e);
            call.reject("Falha ao abrir instalador: " + e.getMessage());
        }
    }
}
