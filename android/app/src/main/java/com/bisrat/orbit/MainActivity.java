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
import android.database.Cursor;
import android.provider.CallLog;
import android.provider.CalendarContract;
import android.provider.ContactsContract;
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
    private static final int REQ_PERM_CONTACTS = 201;
    private static final int REQ_PERM_CALL_LOG = 202;
    private static final int REQ_PICK_CONTACT = 203;
    private static final int REQ_PERM_ALL = 204;
    private static final int REQ_CREATE_DRIVE_BACKUP = 205;
    private static final int REQ_OPEN_DRIVE_BACKUP = 206;
    private String pendingBackupJson = null;

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
        public boolean hasContactsPermission() {
            if (Build.VERSION.SDK_INT >= 23) {
                return checkSelfPermission("android.permission.READ_CONTACTS") == PackageManager.PERMISSION_GRANTED;
            }
            return true;
        }

        @JavascriptInterface
        public void requestContactsPermission() {
            if (Build.VERSION.SDK_INT >= 23) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            requestPermissions(new String[]{"android.permission.READ_CONTACTS"}, REQ_PERM_CONTACTS);
                        } catch (Exception ignored) {}
                    }
                });
            }
        }

        @JavascriptInterface
        public boolean hasCallLogPermission() {
            if (Build.VERSION.SDK_INT >= 23) {
                return checkSelfPermission("android.permission.READ_CALL_LOG") == PackageManager.PERMISSION_GRANTED;
            }
            return true;
        }

        @JavascriptInterface
        public void requestCallLogPermission() {
            if (Build.VERSION.SDK_INT >= 23) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            java.util.List<String> list = new java.util.ArrayList<String>();
                            if (checkSelfPermission("android.permission.READ_CALL_LOG") != PackageManager.PERMISSION_GRANTED) {
                                list.add("android.permission.READ_CALL_LOG");
                            }
                            if (checkSelfPermission("android.permission.READ_PHONE_STATE") != PackageManager.PERMISSION_GRANTED) {
                                list.add("android.permission.READ_PHONE_STATE");
                            }
                            if (!list.isEmpty()) {
                                requestPermissions(list.toArray(new String[0]), REQ_PERM_CALL_LOG);
                            }
                        } catch (Exception ignored) {}
                    }
                });
            }
        }

        @JavascriptInterface
        public void requestAllPhonePermissions() {
            if (Build.VERSION.SDK_INT >= 23) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            java.util.List<String> list = new java.util.ArrayList<String>();
                            if (checkSelfPermission("android.permission.READ_CONTACTS") != PackageManager.PERMISSION_GRANTED) {
                                list.add("android.permission.READ_CONTACTS");
                            }
                            if (checkSelfPermission("android.permission.READ_CALL_LOG") != PackageManager.PERMISSION_GRANTED) {
                                list.add("android.permission.READ_CALL_LOG");
                            }
                            if (checkSelfPermission("android.permission.READ_PHONE_STATE") != PackageManager.PERMISSION_GRANTED) {
                                list.add("android.permission.READ_PHONE_STATE");
                            }
                            if (!list.isEmpty()) {
                                requestPermissions(list.toArray(new String[0]), REQ_PERM_ALL);
                            }
                        } catch (Exception ignored) {}
                    }
                });
            }
        }

        @JavascriptInterface
        public void pickContact() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent intent = new Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI);
                        startActivityForResult(intent, REQ_PICK_CONTACT);
                    } catch (Exception e) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_PICK, ContactsContract.Contacts.CONTENT_URI);
                            startActivityForResult(intent, REQ_PICK_CONTACT);
                        } catch (Exception ignored) {}
                    }
                }
            });
        }

        @JavascriptInterface
        public String getDeviceContacts(int limit) {
            if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission("android.permission.READ_CONTACTS") != PackageManager.PERMISSION_GRANTED) {
                requestContactsPermission();
                return "[]";
            }
            StringBuilder sb = new StringBuilder("[");
            Cursor cursor = null;
            try {
                int max = limit > 0 ? limit : 300;
                cursor = getContentResolver().query(
                    ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                    null,
                    null,
                    null,
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
                );
                if (cursor != null) {
                    int colName = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME);
                    int colNumber = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);
                    int count = 0;
                    boolean first = true;
                    while (cursor.moveToNext() && count < max) {
                        String name = colName != -1 ? cursor.getString(colName) : "";
                        String number = colNumber != -1 ? cursor.getString(colNumber) : "";
                        if (number != null && !number.trim().isEmpty()) {
                            if (!first) sb.append(",");
                            first = false;
                            sb.append("{\"name\":").append(escapeJson(name == null ? "" : name))
                              .append(",\"phone\":").append(escapeJson(number))
                              .append("}");
                            count++;
                        }
                    }
                }
            } catch (Exception ignored) {
            } finally {
                if (cursor != null) {
                    try { cursor.close(); } catch (Exception ignored) {}
                }
            }
            sb.append("]");
            return sb.toString();
        }

        @JavascriptInterface
        public String getRecentCallLogs(int limit) {
            if (Build.VERSION.SDK_INT >= 23) {
                if (checkSelfPermission("android.permission.READ_CALL_LOG") != PackageManager.PERMISSION_GRANTED) {
                    requestCallLogPermission();
                    return "{\"permissionGranted\":false,\"calls\":[]}";
                }
            }
            Cursor cursor = null;
            try {
                int max = limit > 0 ? limit : 100;
                cursor = getContentResolver().query(
                    CallLog.Calls.CONTENT_URI,
                    null,
                    null,
                    null,
                    CallLog.Calls.DATE + " DESC"
                );
                if (cursor == null) {
                    return "{\"permissionGranted\":true,\"calls\":[]}";
                }

                int colNumber = cursor.getColumnIndex(CallLog.Calls.NUMBER);
                int colName = cursor.getColumnIndex(CallLog.Calls.CACHED_NAME);
                int colType = cursor.getColumnIndex(CallLog.Calls.TYPE);
                int colDate = cursor.getColumnIndex(CallLog.Calls.DATE);
                int colDuration = cursor.getColumnIndex(CallLog.Calls.DURATION);

                StringBuilder sb = new StringBuilder("{\"permissionGranted\":true,\"calls\":[");
                int count = 0;
                boolean first = true;
                while (cursor.moveToNext() && count < max) {
                    String number = colNumber != -1 ? cursor.getString(colNumber) : "";
                    String cachedName = colName != -1 ? cursor.getString(colName) : "";
                    int typeInt = colType != -1 ? cursor.getInt(colType) : CallLog.Calls.INCOMING_TYPE;
                    long dateMs = colDate != -1 ? cursor.getLong(colDate) : System.currentTimeMillis();
                    long durationSec = colDuration != -1 ? cursor.getLong(colDuration) : 0;

                    String typeStr = "call";
                    String direction = "me";
                    if (typeInt == CallLog.Calls.INCOMING_TYPE) {
                        direction = "them";
                        typeStr = "call";
                    } else if (typeInt == CallLog.Calls.OUTGOING_TYPE) {
                        direction = "me";
                        typeStr = "call";
                    } else if (typeInt == CallLog.Calls.MISSED_TYPE || typeInt == CallLog.Calls.REJECTED_TYPE) {
                        direction = "them";
                        typeStr = "missed";
                    }

                    if (!first) sb.append(",");
                    first = false;
                    sb.append("{")
                      .append("\"number\":").append(escapeJson(number == null ? "" : number)).append(",")
                      .append("\"cachedName\":").append(escapeJson(cachedName == null ? "" : cachedName)).append(",")
                      .append("\"type\":").append(escapeJson(typeStr)).append(",")
                      .append("\"direction\":").append(escapeJson(direction)).append(",")
                      .append("\"date\":").append(dateMs).append(",")
                      .append("\"duration\":").append(durationSec)
                      .append("}");
                    count++;
                }
                sb.append("]}");
                return sb.toString();
            } catch (Exception e) {
                android.util.Log.e("Orbit", "CallLog read error: " + e.getMessage(), e);
                return "{\"permissionGranted\":false,\"error\":" + escapeJson(e.getMessage()) + ",\"calls\":[]}";
            } finally {
                if (cursor != null) {
                    try { cursor.close(); } catch (Exception ignored) {}
                }
            }
        }

        @JavascriptInterface
        public void exportToGoogleDrive(final String jsonData, final String filename) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        pendingBackupJson = jsonData;
                        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                        intent.addCategory(Intent.CATEGORY_OPENABLE);
                        intent.setType("application/json");
                        String fname = (filename != null && !filename.trim().isEmpty()) ? filename.trim() : "orbit_backup.json";
                        intent.putExtra(Intent.EXTRA_TITLE, fname);
                        startActivityForResult(intent, REQ_CREATE_DRIVE_BACKUP);
                    } catch (Exception e) {
                        try {
                            Intent sendIntent = new Intent(Intent.ACTION_SEND);
                            sendIntent.setType("text/plain");
                            sendIntent.putExtra(Intent.EXTRA_SUBJECT, "Orbit Social Backup");
                            sendIntent.putExtra(Intent.EXTRA_TEXT, jsonData);
                            startActivity(Intent.createChooser(sendIntent, "Save Backup to Google Drive"));
                        } catch (Exception ignored) {}
                    }
                }
            });
        }

        @JavascriptInterface
        public void restoreFromGoogleDrive() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                        intent.addCategory(Intent.CATEGORY_OPENABLE);
                        intent.setType("*/*");
                        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain", "application/octet-stream", "*/*"});
                        startActivityForResult(intent, REQ_OPEN_DRIVE_BACKUP);
                    } catch (Exception e) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                            intent.addCategory(Intent.CATEGORY_OPENABLE);
                            intent.setType("*/*");
                            startActivityForResult(intent, REQ_OPEN_DRIVE_BACKUP);
                        } catch (Exception ignored) {}
                    }
                }
            });
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

        // Request permissions on startup
        if (Build.VERSION.SDK_INT >= 23) {
            java.util.List<String> startupPerms = new java.util.ArrayList<String>();
            if (checkSelfPermission("android.permission.READ_CONTACTS") != PackageManager.PERMISSION_GRANTED) {
                startupPerms.add("android.permission.READ_CONTACTS");
            }
            if (checkSelfPermission("android.permission.READ_CALL_LOG") != PackageManager.PERMISSION_GRANTED) {
                startupPerms.add("android.permission.READ_CALL_LOG");
            }
            if (checkSelfPermission("android.permission.READ_PHONE_STATE") != PackageManager.PERMISSION_GRANTED) {
                startupPerms.add("android.permission.READ_PHONE_STATE");
            }
            if (Build.VERSION.SDK_INT >= 33) {
                if (checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                    startupPerms.add("android.permission.POST_NOTIFICATIONS");
                }
            }
            if (!startupPerms.isEmpty()) {
                try {
                    requestPermissions(startupPerms.toArray(new String[0]), REQ_PERM_ALL);
                } catch (Exception ignored) {}
            }
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

    private String escapeJson(String s) {
        if (s == null) return "\"\"";
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\b': sb.append("\\b"); break;
                case '\f': sb.append("\\f"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < ' ') {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
            }
        }
        sb.append("\"");
        return sb.toString();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_PICK_CONTACT && resultCode == RESULT_OK && data != null) {
            Uri contactUri = data.getData();
            if (contactUri != null) {
                Cursor cursor = null;
                try {
                    cursor = getContentResolver().query(
                        contactUri,
                        new String[]{
                            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                            ContactsContract.CommonDataKinds.Phone.NUMBER
                        },
                        null, null, null
                    );
                    if (cursor != null && cursor.moveToFirst()) {
                        String name = cursor.getString(0);
                        String number = cursor.getString(1);
                        final String json = "{\"name\":" + escapeJson(name == null ? "" : name) + ",\"phone\":" + escapeJson(number == null ? "" : number) + "}";
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                if (webView != null) {
                                    webView.evaluateJavascript("if(window.onNativeContactPicked)window.onNativeContactPicked(" + json + ");", null);
                                }
                            }
                        });
                    }
                } catch (Exception ignored) {
                } finally {
                    if (cursor != null) cursor.close();
                }
            }
        } else if (requestCode == REQ_CREATE_DRIVE_BACKUP && resultCode == RESULT_OK && data != null) {
            Uri uri = data.getData();
            if (uri != null && pendingBackupJson != null) {
                try {
                    java.io.OutputStream os = getContentResolver().openOutputStream(uri);
                    if (os != null) {
                        os.write(pendingBackupJson.getBytes("UTF-8"));
                        os.flush();
                        os.close();
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                if (webView != null) {
                                    webView.evaluateJavascript("if(window.onNativeGoogleDriveSaved)window.onNativeGoogleDriveSaved(true);", null);
                                }
                            }
                        });
                    }
                } catch (Exception e) {
                    android.util.Log.e("Orbit", "Failed to write backup to Drive: " + e.getMessage(), e);
                } finally {
                    pendingBackupJson = null;
                }
            }
        } else if (requestCode == REQ_OPEN_DRIVE_BACKUP && resultCode == RESULT_OK && data != null) {
            Uri uri = data.getData();
            if (uri != null) {
                try {
                    java.io.InputStream is = getContentResolver().openInputStream(uri);
                    if (is != null) {
                        java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(is, "UTF-8"));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) {
                            sb.append(line).append("\n");
                        }
                        reader.close();
                        final String jsonContent = sb.toString();
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                if (webView != null) {
                                    webView.evaluateJavascript("if(window.onNativeGoogleDriveRestore)window.onNativeGoogleDriveRestore(" + escapeJson(jsonContent) + ");", null);
                                }
                            }
                        });
                    }
                } catch (Exception e) {
                    android.util.Log.e("Orbit", "Failed to read backup from Drive: " + e.getMessage(), e);
                }
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        final boolean granted = grantResults != null && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        if (requestCode == REQ_PERM_CONTACTS) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (webView != null) {
                        webView.evaluateJavascript("if(window.onNativeContactsPermissionResult)window.onNativeContactsPermissionResult(" + granted + ");", null);
                    }
                }
            });
        } else if (requestCode == REQ_PERM_CALL_LOG) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (webView != null) {
                        webView.evaluateJavascript("if(window.onNativeCallLogPermissionResult)window.onNativeCallLogPermissionResult(" + granted + ");", null);
                    }
                }
            });
        } else if (requestCode == REQ_PERM_ALL) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (webView != null) {
                        webView.evaluateJavascript("if(window.onNativeAllPermissionsResult)window.onNativeAllPermissionsResult();", null);
                    }
                }
            });
        }
    }
}