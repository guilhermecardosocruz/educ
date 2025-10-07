type Props = { className?: string };

export default function Brand({ className = "" }: Props) {
  return (
    <div className={`select-none ${className}`}>
      <span className="text-3xl font-extrabold tracking-tight">EDUC</span>
    </div>
  );
}
