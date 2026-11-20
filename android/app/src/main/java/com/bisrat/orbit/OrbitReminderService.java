package com.bisrat.orbit;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.IBinder;
import android.os.SystemClock;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/** Foreground service that keeps Orbit alive and shows the persistent reminder bar. */
public class OrbitReminderService extends Service {
    public static final String CHANNEL_ID = "orbit_ongoing";
    private static final int NOTIFICATION_ID = 1001;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        createChannel();
        startForeground(NOTIFICATION_ID, buildNotification());
        return START_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Intent restart = new Intent(this, OrbitReminderService.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pending = PendingIntent.getService(this, 77, restart, flags);
        AlarmManager alarms = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (alarms != null) {
            alarms.set(AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    SystemClock.elapsedRealtime() + 1500, pending);
        }
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    /** Ask the service to refresh its notification after the due list changes. */
    public static void update(Context context) {
        try {
            Intent intent = new Intent(context, OrbitReminderService.class);
            if (Build.VERSION.SDK_INT >= 26) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (Exception ignored) {
        }
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Orbit reminder bar", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Always-visible reminders for promised calls and check-ins");
            channel.setSound(null, null);
            channel.enableVibration(false);
            nm.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        RemoteViews views = new RemoteViews(getPackageName(), R.layout.notification_reminder);
        String[] lines = {"", "", ""};
        int count = 0;
        try {
            SharedPreferences prefs = getSharedPreferences(ReminderWidgetProvider.PREFS, Context.MODE_PRIVATE);
            JSONArray items = new JSONArray(prefs.getString(ReminderWidgetProvider.KEY_DUE, "[]"));
            count = Math.min(3, items.length());
            for (int i = 0; i < count; i++) {
                JSONObject item = items.getJSONObject(i);
                String name = item.optString("name", "Friend");
                if (name.length() > 20) name = name.substring(0, 19) + "…";
                String status = item.optString("status", "");
                String due = item.optString("due", "");
                lines[i] = "• " + name + " — " + shortStatus(status) + " · " + due;
            }
        } catch (Exception ignored) {
        }

        int[] ids = {R.id.notif_line1, R.id.notif_line2, R.id.notif_line3};
        for (int i = 0; i < 3; i++) {
            views.setTextViewText(ids[i], i < count ? lines[i] : "");
            views.setViewVisibility(ids[i], i < count ? android.view.View.VISIBLE : android.view.View.GONE);
        }
        views.setViewVisibility(R.id.notif_empty, count == 0 ? android.view.View.VISIBLE : android.view.View.GONE);

        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pending = PendingIntent.getActivity(this, 101, open, flags);
        views.setOnClickPendingIntent(R.id.notif_title, pending);

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= 26) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }
        return builder
                .setSmallIcon(R.drawable.ic_stat_orbit)
                .setContent(views)
                .setContentIntent(pending)
                .setOngoing(true)
                .setCategory(Notification.CATEGORY_REMINDER)
                .setPriority(Notification.PRIORITY_LOW)
                .build();
    }

    private static String shortStatus(String status) {
        if (status == null) return "";
        if (status.length() > 18) return status.substring(0, 17) + "…";
        return status;
    }
}
