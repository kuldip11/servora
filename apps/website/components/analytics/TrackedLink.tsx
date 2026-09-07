"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { track } from "@/lib/analytics";

type Tracking =
  | { kind: "module"; moduleSlug: string }
  | { kind: "navigation"; location: "header" | "footer" | "mobile_sticky" }
  | { kind: "pricing"; planName: string };

export interface TrackedLinkProps extends Omit<
  ComponentPropsWithoutRef<typeof Link>,
  "onClick"
> {
  children: ReactNode;
  tracking: Tracking;
}

export const TrackedLink = ({
  children,
  tracking,
  ...linkProps
}: TrackedLinkProps) => {
  const handleClick = () => {
    switch (tracking.kind) {
      case "module":
        track({
          event: "module_card_click",
          module_slug: tracking.moduleSlug,
          source_page: window.location.pathname,
        });
        return;
      case "navigation":
        track({ event: "nav_cta_click", location: tracking.location });
        return;
      case "pricing":
        track({ event: "pricing_cta_click", plan_name: tracking.planName });
    }
  };

  return (
    <Link {...linkProps} onClick={handleClick}>
      {children}
    </Link>
  );
};
