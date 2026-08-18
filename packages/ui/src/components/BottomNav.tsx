import type { ReactNode } from "react";
export type BottomNavItem = {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
};
export function BottomNav({
  items,
  activeId,
  onSelect,
}: {
  items: readonly BottomNavItem[];
  activeId: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <nav className="mk-bottom-nav" aria-label="Seller navigation">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <a
            key={item.id}
            href={item.href ?? `#${item.id}`}
            className={`mk-bottom-nav__item${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
            onClick={(event) => {
              if (onSelect) {
                event.preventDefault();
                onSelect(item.id);
              }
            }}
          >
            <span className="mk-bottom-nav__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
