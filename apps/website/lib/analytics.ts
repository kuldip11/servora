export type AnalyticsEvent =
  | { event: "page_view"; path: string; referrer?: string }
  | { event: "nav_cta_click"; location: "header" | "footer" | "mobile_sticky" }
  | { event: "module_card_click"; module_slug: string; source_page: string }
  | { event: "demo_form_start"; source_page: string }
  | { event: "demo_form_submit"; location_count_bucket: string }
  | { event: "demo_form_error"; error_type: string }
  | { event: "pricing_cta_click"; plan_name: string }
  | { event: "faq_item_expand"; question: string }
  | { event: "contact_form_start"; source_page: string }
  | { event: "contact_form_submit"; subject: string }
  | { event: "contact_form_error"; error_type: string };

export const track = (event: AnalyticsEvent) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("servora:analytics", { detail: event }));
  const consent = window.localStorage.getItem("servora_cookie_consent");
  if (consent !== "accepted") return;
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void })
    .gtag;
  if (event.event === "page_view") {
    gtag?.("event", "page_view", {
      page_path: event.path,
      page_location: `${window.location.origin}${event.path}`,
      page_title: document.title,
    });
    return;
  }
  gtag?.("event", event.event, { ...event, event: undefined });
};
