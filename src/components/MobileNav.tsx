"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, Users, Search, Flag, User } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import styles from "./MobileNav.module.css";

export default function MobileNav() {
  const path = usePathname();
  const { user, loading } = useAuth();

  const NAV_ITEMS = [
    { href: "/",          icon: Home,     label: "Home"      },
    { href: "/reports",   icon: FileText, label: "Reports"   },
    { href: "/feed",      icon: Users,    label: "Feed"      },
    { href: "/search",    icon: Search,   label: "Search"    },
    ...(loading
      ? [{ href: "/login", icon: User, label: "Account" }]
      : user
        ? [{ href: "/account", icon: User, label: "Account" }]
        : [{ href: "/login", icon: User, label: "Sign in" }]
    ),
  ];

  return (
    <nav className={styles.bar} aria-label="Mobile navigation">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const isActive = path === href || (href !== "/" && path.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`${styles.item} ${isActive ? styles.active : ""}`}
          >
            <Icon
              size={20}
              strokeWidth={isActive ? 2.25 : 1.75}
              className={styles.icon}
            />
            <span className={styles.label}>{label}</span>
            {isActive && <span className={styles.dot} />}
          </Link>
        );
      })}
    </nav>
  );
}
