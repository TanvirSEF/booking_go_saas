"use client";

import * as React from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { getPublicRecaptchaConfigAction } from "@/actions/recaptcha";
import type { PublicRecaptchaConfigDTO } from "@/types/recaptcha";

export interface RecaptchaWidgetProps {
  action?: string;
  onChange?: (token: string | null) => void;
  onExpired?: () => void;
  onError?: () => void;
  theme?: "light" | "dark";
  size?: "normal" | "compact";
  className?: string;
}

export interface RecaptchaWidgetRef {
  reset: () => void;
  execute: (customAction?: string) => Promise<string | null>;
  getValue: () => string | null;
  isEnabled: boolean;
  version: "v2" | "v3" | null;
}

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      reset: (widgetId?: number) => void;
    };
  }
}

export const RecaptchaWidget = React.forwardRef<
  RecaptchaWidgetRef,
  RecaptchaWidgetProps
>(function RecaptchaWidget(
  {
    action = "submit",
    onChange,
    onExpired,
    onError,
    theme = "light",
    size = "normal",
    className = "",
  },
  ref
) {
  const [config, setConfig] = React.useState<PublicRecaptchaConfigDTO | null>(
    null
  );
  const [currentToken, setCurrentToken] = React.useState<string | null>(null);
  const v2Ref = React.useRef<ReCAPTCHA>(null);

  // Load public reCAPTCHA config on mount
  React.useEffect(() => {
    let isSubscribed = true;

    async function loadConfig() {
      try {
        const res = await getPublicRecaptchaConfigAction();
        if (isSubscribed && res.success && res.data) {
          setConfig(res.data);
        }
      } catch {
        // Fallback: disabled
      }
    }

    void loadConfig();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Inject Google reCAPTCHA v3 script if v3 is enabled
  React.useEffect(() => {
    if (!config?.isEnabled || config.version !== "v3" || !config.siteKey) {
      return;
    }

    const scriptId = "google-recaptcha-v3-script";
    const existingScript = document.getElementById(scriptId);

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(
        config.siteKey
      )}`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [config]);

  // Imperative handle for parent forms
  React.useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        setCurrentToken(null);
        if (config?.version === "v2" && v2Ref.current) {
          v2Ref.current.reset();
        }
        onChange?.(null);
      },
      getValue: () => {
        if (config?.version === "v2" && v2Ref.current) {
          return v2Ref.current.getValue() || currentToken;
        }
        return currentToken;
      },
      execute: async (customAction?: string): Promise<string | null> => {
        // 1. If reCAPTCHA is not enabled, return null gracefully (bypassed)
        if (!config?.isEnabled || !config.siteKey) {
          return null;
        }

        // 2. If v2, return current checked token
        if (config.version === "v2") {
          const val = v2Ref.current?.getValue() || currentToken;
          return val;
        }

        // 3. If v3, execute grecaptcha invisible token generation
        if (config.version === "v3") {
          if (typeof window === "undefined" || !window.grecaptcha) {
            return null;
          }

          try {
            return await new Promise<string | null>((resolve) => {
              window.grecaptcha?.ready(async () => {
                try {
                  const token = await window.grecaptcha!.execute(
                    config.siteKey,
                    { action: customAction || action }
                  );
                  setCurrentToken(token);
                  onChange?.(token);
                  resolve(token);
                } catch {
                  onError?.();
                  resolve(null);
                }
              });
            });
          } catch {
            onError?.();
            return null;
          }
        }

        return null;
      },
      isEnabled: Boolean(config?.isEnabled && config.siteKey),
      version: config?.isEnabled ? config.version : null,
    }),
    [config, action, currentToken, onChange, onError]
  );

  // If disabled or unconfigured, render nothing
  if (!config?.isEnabled || !config.siteKey) {
    return null;
  }

  // If v3, invisible (no visible element required)
  if (config.version === "v3") {
    return null;
  }

  // If v2, render interactive checkbox widget
  return (
    <div
      className={`my-2 flex justify-center overflow-hidden rounded-lg ${className}`}
    >
      <ReCAPTCHA
        ref={v2Ref}
        sitekey={config.siteKey}
        theme={theme}
        size={size}
        onChange={(token) => {
          setCurrentToken(token);
          onChange?.(token);
        }}
        onExpired={() => {
          setCurrentToken(null);
          onExpired?.();
          onChange?.(null);
        }}
        onErrored={() => {
          setCurrentToken(null);
          onError?.();
          onChange?.(null);
        }}
      />
    </div>
  );
});
