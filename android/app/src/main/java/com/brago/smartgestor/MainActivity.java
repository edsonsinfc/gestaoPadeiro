package com.brago.smartgestor;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApkUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
        setupAudioSettings();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupAudioSettings();
    }

    @Override
    public void onResume() {
        super.onResume();
        setupAudioSettings();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            setupAudioSettings();
        }
    }

    private void setupAudioSettings() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebSettings settings = getBridge().getWebView().getSettings();
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setJavaScriptCanOpenWindowsAutomatically(true);
            }
        } catch (Exception ignored) {}
    }
}

