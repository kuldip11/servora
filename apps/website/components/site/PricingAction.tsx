"use client";
import Link from "next/link";
import { track } from "@/lib/analytics";
export function PricingAction() {
  return (
    <Link
      className="action"
      href="/book-a-demo"
      onClick={() =>
        track({
          event: "pricing_cta_click",
          plan_name: "Restaurant setup enquiry",
        })
      }
    >
      Discuss your setup ↗
    </Link>
  );
}
