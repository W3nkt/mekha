import { useId, type InputHTMLAttributes } from "react";
export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  helperText?: string;
};
export function Input({
  label,
  error,
  helperText,
  id,
  className = "",
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  return (
    <label className="mk-field" htmlFor={inputId}>
      <span className="mk-field__label">{label}</span>
      <input
        id={inputId}
        className={`mk-input${error ? " mk-input--error" : ""} ${className}`.trim()}
        aria-invalid={Boolean(error)}
        aria-describedby={error || helperText ? messageId : undefined}
        {...props}
      />
      {(error || helperText) && (
        <span
          id={messageId}
          className={error ? "mk-field__error" : "mk-field__helper"}
        >
          {error ?? helperText}
        </span>
      )}
    </label>
  );
}
