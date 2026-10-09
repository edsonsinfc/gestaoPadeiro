package com.brago.smartgestor;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaDataSource;
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
    private MediaDataSource currentDataSource;
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
                base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
            }
            base64Data = base64Data.trim();

            final byte[] audioBytes = Base64.decode(base64Data, Base64.DEFAULT);
            if (audioBytes == null || audioBytes.length == 0) {
                call.reject("Decoded audio bytes are empty");
                return;
            }

            Context context = getContext();
            AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            int currentVol = -1;
            int maxVol = -1;
            if (am != null) {
                try {
                    AudioManager.OnAudioFocusChangeListener afChangeListener = focusChange -> {};
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        android.media.AudioFocusRequest afr = new android.media.AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                            .setAudioAttributes(
                                new AudioAttributes.Builder()
                                    .setUsage(AudioAttributes.USAGE_MEDIA)
                                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                                    .build()
                            )
                            .setOnAudioFocusChangeListener(afChangeListener)
                            .build();
                        am.requestAudioFocus(afr);
                    } else {
                        am.requestAudioFocus(afChangeListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
                    }
                } catch (Exception ignored) {}
                currentVol = am.getStreamVolume(AudioManager.STREAM_MUSIC);
                maxVol = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                Log.i(TAG, "Media volume level: " + currentVol + " / " + maxVol);
            }

            synchronized (lock) {
                mediaPlayer = new MediaPlayer();
                mediaPlayer.setAudioAttributes(
                    new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build()
                );

                // MediaDataSource lê diretamente os bytes da memória RAM sem criar arquivos temporários em disco
                currentDataSource = new MediaDataSource() {
                    @Override
                    public int readAt(long position, byte[] buffer, int offset, int size) {
                        if (position >= audioBytes.length) {
                            return -1; // End of stream
                        }
                        int remaining = (int) (audioBytes.length - position);
                        int bytesToRead = Math.min(size, remaining);
                        System.arraycopy(audioBytes, (int) position, buffer, offset, bytesToRead);
                        return bytesToRead;
                    }

                    @Override
                    public long getSize() {
                        return audioBytes.length;
                    }

                    @Override
                    public void close() {}
                };

                mediaPlayer.setDataSource(currentDataSource);
                mediaPlayer.setVolume(1.0f, 1.0f);

                mediaPlayer.setOnCompletionListener(mp -> {
                    Log.i(TAG, "Reprodução nativa concluída.");
                    if (getActivity() != null) {
                        getActivity().runOnUiThread(() -> {
                            stopPlayback();
                            notifyListeners("onEnded", new JSObject());
                        });
                    } else {
                        stopPlayback();
                        notifyListeners("onEnded", new JSObject());
                    }
                });

                mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                    Log.e(TAG, "MediaPlayer error - what: " + what + ", extra: " + extra);
                    if (getActivity() != null) {
                        getActivity().runOnUiThread(() -> {
                            stopPlayback();
                            notifyListeners("onError", new JSObject().put("what", what).put("extra", extra));
                        });
                    } else {
                        stopPlayback();
                        notifyListeners("onError", new JSObject().put("what", what).put("extra", extra));
                    }
                    return true;
                });

                mediaPlayer.setOnPreparedListener(mp -> {
                    try {
                        mp.start();
                        Log.i(TAG, "Reprodução nativa iniciada com sucesso via MediaDataSource em RAM!");
                    } catch (Exception eStart) {
                        Log.e(TAG, "Falha ao iniciar MediaPlayer no onPrepared: " + eStart.getMessage());
                    }
                });

                mediaPlayer.prepareAsync();
            }

            int duration = 0;
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("bytes", audioBytes.length);
            ret.put("duration", duration);
            ret.put("volume", currentVol);
            ret.put("maxVolume", maxVol);
            ret.put("playing", true);
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
            if (currentDataSource != null) {
                try {
                    currentDataSource.close();
                } catch (Exception ignored) {}
                currentDataSource = null;
            }
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopPlayback();
        super.handleOnDestroy();
    }
}
