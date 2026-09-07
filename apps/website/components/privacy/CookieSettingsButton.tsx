"use client";

import type { ComponentPropsWithoutRef } from "react";

export type CookieSettingsButtonProps = ComponentPropsWithoutRef<"button">;

export const CookieSettingsButton = ({
  type = "button",
  ...buttonProps
}: CookieSettingsButtonProps) => (
  <button
    {...buttonProps}
    type={type}
    onClick={() =>
      window.dispatchEvent(new Event("servora:open-cookie-settings"))
    }
  />
);
