import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
      <div>
        <h1 className="text-3xl font-bold text-[#111111] tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-sm text-[#666666] font-medium">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </header>
  );
}
