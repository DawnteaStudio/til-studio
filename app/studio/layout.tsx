import { type ReactNode } from "react";
import { requireAdminPage } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: ReactNode }) {
  await requireAdminPage();
  return children;
}
