import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    icon?: React.ReactNode;
  };
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="flex min-h-16 items-center justify-between border-b border-border px-8">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] leading-none text-text-primary">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
        ) : null}
      </div>
      {action ? (
        <Button size="sm">
          {action.icon}
          {action.label}
        </Button>
      ) : null}
    </header>
  );
}
