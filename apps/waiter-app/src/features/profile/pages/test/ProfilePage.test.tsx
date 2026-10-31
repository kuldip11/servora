import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeProvider } from "@pos/ui";
import { ProfilePage } from "@/features/profile/pages/ProfilePage";

describe("ProfilePage", () => {
  it("renders profile and theme controls", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <ProfilePage waiterName="Asha" onBack={vi.fn()} />
      </ThemeProvider>,
    );
    expect(html).toContain("Profile");
    expect(html).toContain("Asha");
    expect(html).toContain("Appearance");
  });
});
