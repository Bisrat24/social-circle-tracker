package com.bisrat.orbit;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Vibrator;
import android.provider.CalendarContract;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;
    private static final String CHANNEL_ID = "orbit_reminders";

    public class AndroidBridge {
        @JavascriptInterface
        public void showNotification(final String title, final String message) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                        if (nm == null) return;

                        if (Build.VERSION.SDK_INT >= 26) {
                            NotificationChannel channel = new NotificationChannel(
                                    CHANNEL_ID,
                                    "Orbit Reminders",
                                    NotificationManager.IMPORTANCE_HIGH
                            );
                            channel.setDescription("Reminders for follow-ups and contact callbacks");
                            channel.enableVibration(true);
                            channel.enableLights(true);
                            nm.createNotificationChannel(channel);
                        }

                        Intent intent = new Intent(MainActivity.this, MainActivity.class);
                        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

                        int flags = 0;
                        if (Build.VERSION.SDK_INT >= 23) {
                            flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
                        } else {
                            flags = PendingIntent.FLAG_UPDATE_CURRENT;
                        }
                        PendingIntent pi = PendingIntent.getActivity(MainActivity.this, (int) System.currentTimeMillis(), intent, flags);

                        Notification.Builder builder;
                        if (Build.VERSION.SDK_INT >= 26) {
                            builder = new Notification.Builder(MainActivity.this, CHANNEL_ID);
                        } else {
                            builder = new Notification.Builder(MainActivity.this);
                        }

                        builder.setContentTitle(title)
                               .setContentText(message)
                               .setSmallIcon(R.mipmap.ic_launcher)
                               .setAutoCancel(true)
                               .setContentIntent(pi)
                               .setPriority(Notification.PRIORITY_HIGH);

                        nm.notify((int) (System.currentTimeMillis() % 100000), builder.build());
                    } catch (Exception ignored) {}
                }
            });
        }

        @JavascriptInterface
        public void openGoogleCalendar(final String title, final String description, final String location, final double startTimeMs, final double endTimeMs, final String gcalUrl) {
            final long start = (long) startTimeMs;
            final long end = (long) endTimeMs;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    // Strategy 1: Standard CalendarContract.Events.CONTENT_URI intent
                    try {
                        Intent intent = new Intent(Intent.ACTION_INSERT)
                                .setData(CalendarContract.Events.CONTENT_URI)
                                .putExtra(CalendarContract.Events.TITLE, title)
                                .putExtra(CalendarContract.Events.DESCRIPTION, description)
                                .putExtra(CalendarContract.Events.EVENT_LOCATION, location)
                                .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, start)
                                .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, end);
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                        return;
                    } catch (Exception ignored) {}

                    // Strategy 2: ACTION_EDIT with MIME vnd.android.cursor.item/event (supports OEM calendar apps)
                    try {
                        Intent editIntent = new Intent(Intent.ACTION_EDIT);
                        editIntent.setType("vnd.android.cursor.item/event");
                        editIntent.putExtra("title", title);
                        editIntent.putExtra("description", description);
                        editIntent.putExtra("eventLocation", location);
                        editIntent.putExtra("beginTime", start);
                        editIntent.putExtra("endTime", end);
                        editIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(editIntent);
                        return;
                    } catch (Exception ignored) {}

                    // Strategy 3: Direct Google Calendar web or app URL with full query parameters
                    try {
                        String targetUrl = (gcalUrl != null && !gcalUrl.trim().isEmpty()) ? gcalUrl :
                                ("https://calendar.google.com/calendar/render?action=TEMPLATE&text="
                                + Uri.encode(title)
                                + "&details=" + Uri.encode(description)
                                + "&location=" + Uri.encode(location));
                        Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(targetUrl));
                        webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(webIntent);
                    } catch (Exception ignored) {}
                }
            });
        }

        @JavascriptInterface
        public void openGoogleCalendar(final String title, final String description, final String location, final double startTimeMs, final double endTimeMs) {
            openGoogleCalendar(title, description, location, startTimeMs, endTimeMs, "");
        }

        @JavascriptInterface
        public void openGoogleCalendar(final String title, final String description, final String location, final long startTimeMs, final long endTimeMs, final String gcalUrl) {
            openGoogleCalendar(title, description, location, (double) startTimeMs, (double) endTimeMs, gcalUrl);
        }

        @JavascriptInterface
        public void openGoogleCalendar(final String title, final String description, final String location, final long startTimeMs, final long endTimeMs) {
            openGoogleCalendar(title, description, location, (double) startTimeMs, (double) endTimeMs, "");
        }

        @JavascriptInterface
        public void vibrate(long ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) {
                    v.vibrate(ms);
                }
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public boolean isNative() {
            return true;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Prevent edge trimming: set status and navigation bar colors matching Orbit theme
        if (Build.VERSION.SDK_INT >= 21) {
            getWindow().setStatusBarColor(0xFF0B0E17);
            getWindow().setNavigationBarColor(0xFF0B0E17);
        }

        // Native Android 13+ Notification Permission Prompt
        if (Build.VERSION.SDK_INT >= 33) {
            try {
                if (checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 101);
                }
            } catch (Exception ignored) {}
        }

        webView = new WebView(this);
        webView.setFitsSystemWindows(true);
        if (Build.VERSION.SDK_INT >= 19) {
            webView.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null);
        }
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        try {
            s.setAllowFileAccessFromFileURLs(true);
            s.setAllowUniversalAccessFromFileURLs(true);
        } catch (Exception ignored) {}
        s.setLoadWithOverviewMode(false);
        s.setUseWideViewPort(false);
        s.setRenderPriority(WebSettings.RenderPriority.HIGH);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            request.grant(request.getResources());
                        } catch (Exception e) {
                            try { request.deny(); } catch (Exception ignored) {}
                        }
                    }
                });
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request != null && request.getUrl() != null) {
                    return handleExternalUrl(request.getUrl().toString());
                }
                return false;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleExternalUrl(url);
            }

            private boolean handleExternalUrl(String url) {
                if (url == null || url.startsWith("file://") || url.contains("ship.place")) {
                    return false;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }
        });

        // Load local asset web app completely offline
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}