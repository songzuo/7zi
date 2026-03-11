"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useSettings } from "@/contexts/SettingsContext";

export function useSettingsPage() {
  const locale = useLocale();
  const { resetSettings } = useSettings();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const message = locale === "zh" 
      ? "确定要重置所有设置吗？" 
      : "Are you sure you want to reset all settings?";
    if (confirm(message)) {
      resetSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return { saved, handleSave, handleReset };
}