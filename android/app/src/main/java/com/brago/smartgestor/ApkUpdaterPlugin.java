package com.brago.smartgestor;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
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

@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {

    private static final String TAG = "ApkUpdaterPlugin";

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String urlString = call.getString("url");
        if (urlString == null || urlString.isEmpty()) {
            call.reject("URL is required");
            return;
        }

        // Run download in a background thread to avoid blocking the UI thread
        new Thread(() -> {
            HttpURLConnection connection = null;
            InputStream inputStream = null;
            FileOutputStream outputStream = null;

            try {
                Context context = getContext();
                URL url = new URL(urlString);

                // Handle redirects (GitHub Releases redirect 302 to AWS S3)
                int redirectCount = 0;
                while (redirectCount < 7) {
                    connection = (HttpURLConnection) url.openConnection();
                    connection.setRequestMethod("GET");
                    connection.setInstanceFollowRedirects(true);
                    connection.setRequestProperty("User-Agent", "SmartGestor-App");
                    connection.setConnectTimeout(15000);
                    connection.setReadTimeout(30000);
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
                            url = new URL(newUrl);
                            redirectCount++;
                            continue;
                        }
                    }

                    if (responseCode != HttpURLConnection.HTTP_OK) {
                        call.reject("Server returned HTTP " + responseCode);
                        return;
                    }
                    break;
                }

                // Create or overwrite the temporary file in the cache directory
                File cacheDir = context.getCacheDir();
                File apkFile = new File(cacheDir, "update.apk");
                if (apkFile.exists()) {
                    apkFile.delete();
                }

                inputStream = connection.getInputStream();
                outputStream = new FileOutputStream(apkFile);

                byte[] buffer = new byte[8192];
                int bytesRead;
                long totalBytesRead = 0;
                long fileLength = connection.getContentLengthLong();

                long lastNotifyTime = 0;

                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, bytesRead);
                    totalBytesRead += bytesRead;

                    long now = System.currentTimeMillis();
                    if (fileLength > 0 && (now - lastNotifyTime > 150)) {
                        lastNotifyTime = now;
                        JSObject progressObj = new JSObject();
                        progressObj.put("progress", (float) totalBytesRead / fileLength);
                        progressObj.put("bytes", totalBytesRead);
                        progressObj.put("total", fileLength);
                        notifyListeners("downloadProgress", progressObj);
                    }
                }

                outputStream.flush();
                outputStream.close();
                outputStream = null;

                inputStream.close();
                inputStream = null;
                connection.disconnect();
                connection = null;

                Log.d(TAG, "APK downloaded successfully to: " + apkFile.getAbsolutePath() + " (" + totalBytesRead + " bytes)");

                // Send 100% progress
                JSObject finalProgress = new JSObject();
                finalProgress.put("progress", 1.0f);
                finalProgress.put("bytes", totalBytesRead);
                finalProgress.put("total", totalBytesRead);
                notifyListeners("downloadProgress", finalProgress);

                // Trigger installation
                installApk(context, apkFile, call);

            } catch (Exception e) {
                Log.e(TAG, "Error downloading or installing APK", e);
                call.reject("Error: " + e.getMessage());
            } finally {
                try { if (outputStream != null) outputStream.close(); } catch (Exception ignored) {}
                try { if (inputStream != null) inputStream.close(); } catch (Exception ignored) {}
                try { if (connection != null) connection.disconnect(); } catch (Exception ignored) {}
            }
        }).start();
    }

    private void installApk(Context context, File apkFile, PluginCall call) {
        try {
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
            Log.e(TAG, "Error launching installer intent", e);
            call.reject("Failed to trigger installer: " + e.getMessage());
        }
    }
}
