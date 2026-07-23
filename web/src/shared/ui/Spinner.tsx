import './Spinner.css';

type SpinnerProps = {
  size?: number;
  onDark?: boolean;
  label?: string;
  className?: string;
};

export default function Spinner({ size = 20, onDark = false, label = 'Loading', className = '' }: SpinnerProps) {
  return (
    <span
      className={`spinner${onDark ? ' spinner--on-dark' : ''}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      role="status"
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}
