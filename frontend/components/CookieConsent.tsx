"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { acceptCookieConsent } from "@/app/actions/session-cookie";

const subscribe = () => () => {};
const getSnapshot = () => document.cookie.split("; ").some((c) => c.startsWith("cookie-consent="));
const getServerSnapshot = () => true;

export function CookieConsent() {
  const hasConsent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);

  if (hasConsent || dismissed) return null;

  const handleAccept = async () => {
    await acceptCookieConsent();
    setDismissed(true);
  };

  const handleDecline = () => {
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-fade-in-up">
      <div className="rounded-xl border bg-card/95 backdrop-blur-sm p-4 shadow-lg">
        <p className="text-sm text-foreground mb-1 font-medium">Cookie Notice</p>
        <p className="text-xs text-muted-foreground mb-3">
          We use a cookie to remember your active session so you don&apos;t lose your place when
          refreshing the page. No tracking or analytics.
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleDecline}>
            Decline
          </Button>
          <Button size="sm" onClick={handleAccept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
