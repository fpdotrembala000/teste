interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, right }: Props) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6 animate-slide-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-white/55 mt-1 text-sm md:text-base">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
