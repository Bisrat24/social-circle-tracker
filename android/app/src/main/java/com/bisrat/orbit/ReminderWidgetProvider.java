package com.bisrat.orbit;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/** Home-screen widget showing the three contacts that need attention most. */
public class ReminderWidgetProvider extends AppWidgetProvider {

    public static final String PREFS = "orbit_widget";
    public static final String KEY_DUE = "due";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            updateOne(context, manager, id);
        }
    }

    public static void refresh(Context context) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, ReminderWidgetProvider.class));
            for (int id : ids) {
                updateOne(context, manager, id);
            }
        } catch (Exception ignored) {
        }
    }

    private static void updateOne(Context context, AppWidgetManager manager, int widgetId) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.reminder_widget);
            SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String raw = prefs.getString(KEY_DUE, "[]");
            JSONArray items = new JSONArray(raw);

            int[] lineIds = { R.id.widget_line1, R.id.widget_line2, R.id.widget_line3 };
            String[] names = { "", "", "" };
            String[] details = { "", "", "" };
            String[] ids = { "", "", "" };

            int count = Math.min(3, items.length());
            for (int i = 0; i < count; i++) {
                JSONObject item = items.getJSONObject(i);
                String name = item.optString("name", "Friend");
                if (name.length() > 18) name = name.substring(0, 17) + "…";
                names[i] = name;
                String status = item.optString("status", "");
                if (status.length() > 16) status = status.substring(0, 15) + "…";
                details[i] = status + " · " + item.optString("due", "");
                ids[i] = item.optString("id", "");
            }

            for (int i = 0; i < 3; i++) {
                views.setTextViewText(lineIds[i], i < count ? names[i] : "");
                views.setTextViewText(i == 0 ? R.id.widget_detail1 : (i == 1 ? R.id.widget_detail2 : R.id.widget_detail3),
                        i < count ? details[i] : "");
                views.setViewVisibility(lineIds[i], i < count ? android.view.View.VISIBLE : android.view.View.GONE);
                views.setViewVisibility(i == 0 ? R.id.widget_detail1 : (i == 1 ? R.id.widget_detail2 : R.id.widget_detail3),
                        i < count ? android.view.View.VISIBLE : android.view.View.GONE);
                if (i < count) {
                    Intent open = new Intent(context, MainActivity.class);
                    open.putExtra("contactId", ids[i]);
                    open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (android.os.Build.VERSION.SDK_INT >= 23) {
                        flags |= PendingIntent.FLAG_IMMUTABLE;
                    }
                    PendingIntent pending = PendingIntent.getActivity(context, widgetId * 10 + i, open, flags);
                    views.setOnClickPendingIntent(lineIds[i], pending);
                }
            }

            views.setViewVisibility(R.id.widget_empty, count == 0 ? android.view.View.VISIBLE : android.view.View.GONE);

            Intent openApp = new Intent(context, MainActivity.class);
            openApp.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (android.os.Build.VERSION.SDK_INT >= 23) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            views.setOnClickPendingIntent(R.id.widget_root,
                    PendingIntent.getActivity(context, widgetId * 10 + 9, openApp, flags));

            manager.updateAppWidget(widgetId, views);
        } catch (Exception ignored) {
        }
    }
}
