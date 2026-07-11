"use client";

import Link from "next/link";

export type NavigationSection = "dashboard" | "lesson" | "glossary" | "case";
export type LanguageMode = "vi" | "en" | "bi";

type SiteNavigationProps = {
  current: NavigationSection;
  user: { displayName: string; email: string };
  signOutPath: string;
  language?: LanguageMode;
  onLanguageChange?: (mode: LanguageMode) => void;
};

const navigationItems = [
  { key: "dashboard", href: "/#dashboard", label: "Dashboard", shortLabel: "Tổng quan", icon: "CT" },
  { key: "lesson", href: "/#roadmap", label: "Lộ trình 24 tuần", shortLabel: "Học tập", icon: "24" },
  { key: "glossary", href: "/glossary", label: "Glossary", shortLabel: "Glossary", icon: "AZ" },
  { key: "case", href: "/case-study", label: "Case workspace", shortLabel: "Case", icon: "CS" },
] as const;

export default function SiteNavigation({
  current,
  user,
  signOutPath,
  language,
  onLanguageChange,
}: SiteNavigationProps) {
  return (
    <>
      <header className="site-header">
        <a className="skip-link" href="#main-content">
          Bỏ qua điều hướng, tới nội dung chính
        </a>
        <Link className="brand-lockup" href="/" aria-label="ctnascm — về dashboard">
          <span className="brand-symbol" aria-hidden="true">CT</span>
          <span>
            <strong>ctnascm</strong>
            <small>Chàng trai năm ấy</small>
          </span>
        </Link>

        <nav className="main-nav" aria-label="Điều hướng chính">
          {navigationItems.map((item) => {
            const active = current === item.key;
            return (
              <Link key={item.key} href={item.href} aria-current={active ? "page" : undefined}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="header-actions">
          {language && onLanguageChange ? (
            <div className="language-switch" role="group" aria-label="Chế độ ngôn ngữ">
              {(["vi", "en", "bi"] as LanguageMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={language === mode ? "active" : ""}
                  aria-pressed={language === mode}
                  onClick={() => onLanguageChange(mode)}
                >
                  {mode === "bi" ? "VI+EN" : mode.toUpperCase()}
                </button>
              ))}
            </div>
          ) : null}

          <details className="user-menu">
            <summary aria-label={`Mở menu tài khoản của ${user.displayName}`} title={user.email}>
              <span className="user-initial" aria-hidden="true">
                {user.displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="user-summary-copy">
                <strong>{user.displayName}</strong>
                <small>Tài khoản</small>
              </span>
            </summary>
            <div className="user-menu-panel">
              <strong>{user.displayName}</strong>
              <span>{user.email}</span>
              <a href={signOutPath}>Đăng xuất</a>
            </div>
          </details>
        </div>
      </header>

      <nav className="mobile-bottom-nav" aria-label="Điều hướng di động">
        {navigationItems.map((item) => {
          const active = current === item.key;
          return (
            <Link key={item.key} href={item.href} aria-current={active ? "page" : undefined}>
              <span aria-hidden="true">{item.icon}</span>
              {item.shortLabel}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
