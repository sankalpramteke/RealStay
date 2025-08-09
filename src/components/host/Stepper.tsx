import { Progress } from '@/components/ui/progress';

interface StepperProps {
  current: number; // 1..3
  total?: number; // default 3
  title?: string;
}

export default function Stepper({ current, total = 3, title }: StepperProps) {
  const pct = Math.min(100, Math.max(0, (current / total) * 100));
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">Step {current} of {total}</p>
        {title && <p className="text-sm font-medium">{title}</p>}
      </div>
      <Progress value={pct} />
    </div>
  );
}
