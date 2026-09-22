import Script from "next/script";
import { generatePlatformPixelSnippet } from "@/lib/landing-page";
import type { ISeoSetting, IPixelItem, ICustomCodeSetting } from "@/types/landing-page";

interface LandingScriptsProps {
  seo?: ISeoSetting;
  pixels?: IPixelItem[];
  customCode?: ICustomCodeSetting;
}

export function LandingScripts({
  seo,
  pixels = [],
  customCode,
}: LandingScriptsProps) {
  return (
    <>
      {/* GA4 Script */}
      {seo?.googleAnalyticsId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${seo.googleAnalyticsId}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${seo.googleAnalyticsId}');
            `}
          </Script>
        </>
      )}

      {/* Facebook Pixel */}
      {seo?.facebookPixelId && (
        <Script id="fb-pixel-init" strategy="afterInteractive">
          {generatePlatformPixelSnippet("facebook", seo.facebookPixelId)}
        </Script>
      )}

      {/* Multi-Platform Tracking Pixels */}
      {pixels.map((pix) => (
        <Script
          key={pix.id || pix.pixelId}
          id={`pixel-${pix.platform}-${pix.id || pix.pixelId}`}
          strategy="afterInteractive"
        >
          {generatePlatformPixelSnippet(pix.platform, pix.pixelId)}
        </Script>
      ))}

      {/* Custom CSS Injection */}
      {customCode?.customCss && (
        <style dangerouslySetInnerHTML={{ __html: customCode.customCss }} />
      )}

      {/* Custom JS Injection */}
      {customCode?.customJs && (
        <Script id="custom-js" strategy="afterInteractive">
          {customCode.customJs}
        </Script>
      )}
    </>
  );
}
