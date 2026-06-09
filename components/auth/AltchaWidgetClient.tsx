"use client";

import "altcha";
import { shouldBypassAltcha } from "@/lib/auth-client";

type AltchaWidgetClientProps = {
    challengeUrl: string;
};

export default function AltchaWidgetClient({ challengeUrl }: AltchaWidgetClientProps) {
    if (typeof window !== "undefined" && shouldBypassAltcha(window.location.hostname, challengeUrl)) {
        return null;
    }

    return (
        <altcha-widget
            name="altchaPayload"
            challengeurl={challengeUrl}
            auto="off"
            overlay
        />
    );
}
