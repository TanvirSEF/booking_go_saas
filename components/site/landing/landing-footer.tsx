import Link from "next/link";
import type { IFooterSetting, ICustomPageItem } from "@/types/landing-page";

interface LandingFooterProps {
  data: IFooterSetting;
  customPages?: ICustomPageItem[];
}

export function LandingFooter({ data, customPages = [] }: LandingFooterProps) {
  if (!data?.status) return null;

  const footerCustomPages = customPages.filter((p) => p.footer);

  return (
    <footer className="w-full bg-card border-t border-border text-foreground pt-16 pb-12">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand & About Column */}
          <div className="md:col-span-4 space-y-4">
            {data.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.logo} alt={data.websiteName} className="h-8 w-auto object-contain" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="size-7 rounded-md bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm">
                  B
                </span>
                <span className="font-bold text-base tracking-tight">{data.websiteName}</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              {data.description}
            </p>
          </div>

          {/* Navigation Columns */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-6">
            {data.sections.map((col, idx) => (
              <div key={idx} className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {col.heading}
                </h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {col.links.map((link, lIdx) => (
                    <li key={lIdx}>
                      <Link
                        href={link.link || "#"}
                        className="hover:text-foreground transition-colors"
                      >
                        {link.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Custom CMS Pages with footer: true */}
            {footerCustomPages.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Pages & Legal
                </h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {footerCustomPages.map((page) => (
                    <li key={page.id}>
                      <Link
                        href={
                          page.templateType === "url"
                            ? (page.pageUrl || "#")
                            : `/pages/${page.slug}`
                        }
                        className="hover:text-foreground transition-colors"
                      >
                        {page.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            {data.copyright}{" "}
            <a
              href={data.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:underline"
            >
              {data.websiteName}
            </a>
            .
          </p>
          <div className="flex items-center gap-4">
            <Link href="/pages/terms_and_conditions" className="hover:underline">
              Terms & Conditions
            </Link>
            <Link href="/pages/privacy_policy" className="hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
