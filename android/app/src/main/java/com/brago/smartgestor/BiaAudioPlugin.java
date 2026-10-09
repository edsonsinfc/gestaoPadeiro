package com.brago.smartgestor;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.util.Base64;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;

@CapacitorPlugin(name = "BiaAudio")
public class BiaAudioPlugin extends Plugin {

    private static final String TAG = "BiaAudioPlugin";
    private MediaPlayer mediaPlayer;
    private final Object lock = new Object();

    @PluginMethod
    public void playBase64(PluginCall call) {
        String base64Data = call.getString("base64");
        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("base64 string is required");
            return;
        }

        try {
            stopPlayback();

            if (base64Data.contains(",")) {
                base64Data = base64Data.split(",")[1];
            }

            byte[] audioBytes = Base64.decode(base64Data, Base64.DEFAULT);
            if (audioBytes == null || audioBytes.length == 0) {
                call.reject("Decoded audio bytes are empty");
                return;
            }

            Context context = getContext();
            File tempAudioFile = new File(context.getCacheDir(), "bia_speech_cache.mp3");
            if (tempAudioFile.exists()) {
                tempAudioFile.delete();
            }

            try (FileOutputStream fos = new FileOutputStream(tempAudioFile)) {
                fos.write(audioBytes);
                fos.flush();
                try {
                    fos.getFD().sync();
                } catch (Exception ignored) {}
            }

            AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            int currentVol = -1;
            int maxVol = -1;
            if (am != null) {
                currentVol = am.getStreamVolume(AudioManager.STREAM_MUSIC);
                maxVol = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                Log.i(TAG, "Media volume level: " + currentVol + " / " + maxVol);
            }

            synchronized (lock) {
                mediaPlayer = new MediaPlayer();
                mediaPlayer.setAudioAttributes(
                    new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setLegacyStreamType(AudioManager.STREAM_MUSIC)
                        .build()
                );

                try (java.io.FileInputStream fis = new java.io.FileInputStream(tempAudioFile)) {
                    mediaPlayer.setDataSource(fis.getFD());
                }

                mediaPlayer.setVolume(1.0f, 1.0f);

                mediaPlayer.setOnPreparedListener(mp -> {
                    try {
                        mp.start();
                        Log.i(TAG, "Reprodução nativa iniciada com sucesso!");
                        notifyListeners("onPlay", new JSObject());
                    } catch (Exception e) {
                        Log.e(TAG, "Error starting playback: " + e.getMessage());
                        notifyListeners("onError", new JSObject().put("error", e.getMessage()));
                    }
                });

                mediaPlayer.setOnCompletionListener(mp -> {
                    Log.i(TAG, "Reprodução nativa concluída.");
                    stopPlayback();
                    notifyListeners("onEnded", new JSObject());
                });

                mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                    Log.e(TAG, "MediaPlayer error - what: " + what + ", extra: " + extra);
                    stopPlayback();
                    notifyListeners("onError", new JSObject().put("what", what).put("extra", extra));
                    return true;
                });

                mediaPlayer.prepareAsync();
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("bytes", audioBytes.length);
            ret.put("volume", currentVol);
            ret.put("maxVolume", maxVol);
            call.resolve(ret);

        } catch (Exception e) {
            Log.e(TAG, "Exception during playBase64", e);
            stopPlayback();
            call.reject("Falha ao reproduzir áudio nativo: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isPlaying(PluginCall call) {
        boolean playing = false;
        synchronized (lock) {
            if (mediaPlayer != null) {
                try {
                    playing = mediaPlayer.isPlaying();
                } catch (Exception ignored) {}
            }
        }
        JSObject ret = new JSObject();
        ret.put("isPlaying", playing);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopAudio(PluginCall call) {
        stopPlayback();
        if (call != null) {
            call.resolve(new JSObject().put("success", true));
        }
    }

    private void stopPlayback() {
        synchronized (lock) {
            if (mediaPlayer != null) {
                try {
                    if (mediaPlayer.isPlaying()) {
                        mediaPlayer.stop();
                    }
                    mediaPlayer.reset();
                    mediaPlayer.release();
                } catch (Exception ignored) {}
                mediaPlayer = null;
            }
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopPlayback();
        super.handleOnDestroy();
    }
}
