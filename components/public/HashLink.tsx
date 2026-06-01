"use client";

import type { MouseEvent, ReactNode } from "react";

interface HashLinkProps {
  children: ReactNode;
  className?: string;
  href: string;
}

export function HashLink({ children, className, href }: HashLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!href.startsWith("#")) return;

    event.preventDefault();
    const target = document.getElementById(decodeHash(href.slice(1)));
    target?.scrollIntoView({ behavior: "smooth", block: "start" });

    if (window.location.hash !== href) {
      window.history.replaceState(null, "", href);
    }
  }

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}

function decodeHash(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
