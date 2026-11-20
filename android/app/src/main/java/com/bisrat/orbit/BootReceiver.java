package com.bisrat.orbit;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Restarts the reminder service after reboot, app update or vendor quick-boot. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)
                || "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {
            OrbitReminderService.update(context);
        }
    }
}
