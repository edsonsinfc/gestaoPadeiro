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
        if (urlString == null) {
            call.reject("URL is required");
            return;
        }

        // Run download in a background thread to avoid blocking the UI thread
        new Thread(() -> {
            try {
                Context context = getContext();
                URL url = new URL(urlString);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("GET");
                connection.connect();

                if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                    call.reject("Server returned HTTP " + connection.getResponseCode());
                    return;
                }

                // Create a temporary file in the cache directory
                File cacheDir = context.getCacheDir();
                File apkFile = new File(cacheDir, "update.apk");
                if (apkFile.exists()) {
                    apkFile.delete();
                }

                InputStream inputStream = connection.getInputStream();
                FileOutputStream outputStream = new FileOutputStream(apkFile);

                byte[] buffer = new byte[4096];
                int bytesRead;
                int totalBytesRead = 0;
                int fileLength = connection.getContentLength();

                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, bytesRead);
                    totalBytesRead += bytesRead;
                    
                    // Optional: send progress event back to Web view
                    if (fileLength > 0) {
                        JSObject progressObj = new JSObject();
                        progressObj.put("progress", (float) totalBytesRead / fileLength);
                        notifyListeners("downloadProgress", progressObj);
                    }
                }

                outputStream.close();
                inputStream.close();
                connection.disconnect();

                Log.d(TAG, "APK downloaded successfully to: " + apkFile.getAbsolutePath());

                // Trigger installation
                installApk(context, apkFile, call);

            } catch (Exception e) {
                Log.e(TAG, "Error downloading or installing APK", e);
                call.reject("Error: " + e.getMessage());
            }
        }).start();
    }

    private void installApk(Context context, File apkFile, PluginCall call) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            Uri apkUri;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                // Use FileProvider for Android 7.0 (Nougat) and above
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
