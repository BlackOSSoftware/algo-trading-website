import type { ReactNode } from "react";
import { BackToTopButton } from "./BackToTopButton";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNavbar } from "./MarketingNavbar";
import { ScrollProgress } from "./ScrollProgress";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="page marketing-page">
      <ScrollProgress />
      <MarketingNavbar />
      <main>{children}</main>
      <MarketingFooter />
      <BackToTopButton />
    </div>
  );
}
