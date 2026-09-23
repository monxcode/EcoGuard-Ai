import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag className={`bg-white border border-[#EAEAEA] rounded-[14px] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] overflow-hidden ${className}`}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3">
      <div className="min-w-0">
        <h2 className="text-[13px] uppercase tracking-[0.04em] font-semibold text-[#111111]">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-[#888888]">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0 flex items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-5 ${className}`}>{children}</div>;
}
