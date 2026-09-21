type MetricProps = { label: string; value: string; unit: string };

export function Metric({ label, value, unit }: MetricProps) {
  return (
    <div className="flex justify-between border-b border-[#d7e1dc] py-3.25 text-[13px] text-[#60736c]">
      <span>{label}</span>
      <strong className="font-mono text-[15px] font-medium text-[#18231f]">
        {value}
        <small className="ml-1.5 text-[10px] text-[#587168]">{unit}</small>
      </strong>
    </div>
  );
}
