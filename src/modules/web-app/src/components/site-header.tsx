import { MoonIcon, ShieldIcon, SunIcon } from "src/components/icons";
import { useTheme } from "src/hooks/theme-context";

type SiteHeaderProps = {
  dependencyCount?: number;
  status?: "loaded" | "reading";
};

const SiteHeader = (props: SiteHeaderProps) => {
  const { dependencyCount, status = "loaded" } = props;
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <header className="border-b border-line/80">
      <div className="page-shell flex flex-wrap items-center justify-between gap-3 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-onink">
            <ShieldIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[0.9375rem] font-semibold leading-tight tracking-[-0.01em]">
              npm-audit-visualizer
            </p>
            <p className="text-xs leading-tight text-ink-muted">
              Audit evidence, kept local
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <span
              aria-hidden="true"
              className={
                status === "loaded"
                  ? "h-1.5 w-1.5 rounded-full bg-teal"
                  : "h-1.5 w-1.5 rounded-full bg-ink-muted"
              }
            />
            <span>
              {status === "loaded" ? "Report loaded" : "Reading report"}
            </span>
            {dependencyCount !== undefined && (
              <>
                <span aria-hidden="true" className="text-line">
                  /
                </span>
                <span className="num">
                  {dependencyCount.toLocaleString("en-US")} dependencies
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${nextTheme} mode`}
            title={`Switch to ${nextTheme} mode`}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted transition-colors hover:border-ink/25 hover:text-ink"
          >
            {theme === "dark" ? (
              <SunIcon className="h-4 w-4" />
            ) : (
              <MoonIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
