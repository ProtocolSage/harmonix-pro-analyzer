interface TimelineGridProps {
  ticks: string[];
}

export function TimelineGrid({ ticks }: TimelineGridProps) {
  return (
    <div className="hp-timeline">
      {ticks.map((tick) => (
        <span key={tick}>{tick}</span>
      ))}
    </div>
  );
}
