"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { CONSENT_REGIONS, GTM_ID, track } from "@/lib/analytics";
import { useStore } from "./store";

/**
 * Google Tag Manager with Consent Mode v2.
 * Defaults: denied in the EEA/UK/CH (until the visitor accepts), granted elsewhere.
 * The consent default must be queued BEFORE gtm.js loads, hence beforeInteractive.
 */
export function GtmHead() {
  const regions = JSON.stringify(CONSENT_REGIONS);
  return (
    <>
      <Script id="gtm-consent" strategy="beforeInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500,region:${regions}});
gtag('consent','default',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});
try{if(localStorage.getItem('jw_consent')==='granted'){gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});}}catch(e){}
gtag('set','ads_data_redaction',true);gtag('set','url_passthrough',true);`}
      </Script>
      <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
    </>
  );
}

export function GtmNoscript() {
  return (
    <noscript>
      <iframe src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} title="gtm" />
    </noscript>
  );
}

/** Small consent bar, shown only to visitors in consent-required countries who haven't chosen yet. */
export function ConsentBanner() {
  const { country } = useStore();
  const [show, setShow] = useState(false);
  useEffect(() => {
    let choice: string | null = null;
    try {
      choice = localStorage.getItem("jw_consent");
    } catch {}
    setShow(!choice && CONSENT_REGIONS.includes(country));
  }, [country]);
  const choose = (granted: boolean) => {
    const v = granted ? "granted" : "denied";
    try {
      localStorage.setItem("jw_consent", v);
    } catch {}
    window.dataLayer = window.dataLayer || [];
    // eslint-disable-next-line prefer-rest-params
    (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.("consent", "update", {
      ad_storage: v,
      ad_user_data: v,
      ad_personalization: v,
      analytics_storage: v,
    });
    setShow(false);
  };
  if (!show) return null;
  return (
    <div className="consent" role="dialog" aria-label="Cookie preferences">
      <p>
        We use cookies to understand what you love and to show you relevant ads. Essential cookies (your bag, currency) are always on.{" "}
        <a href="/help/privacy" className="gold">
          Privacy
        </a>
      </p>
      <div className="row-gap">
        <button className="btn btn-sm btn-ghost" onClick={() => choose(false)}>
          Essential only
        </button>
        <button className="btn btn-sm btn-red" onClick={() => choose(true)}>
          Accept all
        </button>
      </div>
    </div>
  );
}

/** Fires view_item once for a product page. */
export function TrackViewItem({ slug, name, price, category }: { slug: string; name: string; price: number; category: string }) {
  useEffect(() => {
    track("view_item", [{ slug, name, price, category }]);
  }, [slug, name, price, category]);
  return null;
}
