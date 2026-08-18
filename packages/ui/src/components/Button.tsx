import type { ButtonHTMLAttributes } from "react";
export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};
export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`mk-button mk-button--${variant} ${className}`.trim()}
      {...props}
    />
  );
}
