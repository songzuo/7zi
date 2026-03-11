"use client";

import { useTranslations } from "next-intl";
import { useSettings } from "@/contexts/SettingsContext";

export function NotificationsSection() {
  const t = useTranslations("settings");
  const { settings, setNotifications } = useSettings();

  const toggles = [
    {
      key: "enabled",
      label: t("notifications.enabled.label"),
      description: t("notifications.enabled.description"),
      getValue: () => settings.notifications.enabled,
      setValue: (val: boolean) => setNotifications({ enabled: val }),
    },
    {
      key: "sound",
      label: t("notifications.sound.label"),
      description: t("notifications.sound.description"),
      getValue: () => settings.notifications.sound,
      setValue: (val: boolean) => setNotifications({ sound: val }),
    },
    {
      key: "email",
      label: t("notifications.email.label"),
      description: t("notifications.email.description"),
      getValue: () => settings.notifications.email,
      setValue: (val: boolean) => setNotifications({ email: val }),
    },
    {
      key: "push",
      label: t("notifications.push.label"),
      description: t("notifications.push.description"),
      getValue: () => settings.notifications.push,
      setValue: (val: boolean) => setNotifications({ push: val }),
    },
  ];

  return (
    <section className="mb-10">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
          {t("sections.notifications.title")}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t("sections.notifications.description")}
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-700">
        {toggles.map((toggle) => (
          <div key={toggle.key} className="p-4 flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium text-zinc-900 dark:text-white">{toggle.label}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{toggle.description}</p>
            </div>
            <ToggleButton
              enabled={toggle.getValue()}
              onChange={() => toggle.setValue(!toggle.getValue())}
              disabled={toggle.key !== "enabled" && !settings.notifications.enabled}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function ToggleButton({ enabled, onChange, disabled }: { enabled: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? "bg-cyan-500" : "bg-zinc-300 dark:bg-zinc-600"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
          enabled ? "left-7" : "left-1"
        }`}
      />
    </button>
  );
}
