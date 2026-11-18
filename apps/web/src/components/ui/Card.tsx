import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "article" | "div" | "section";
  padding?: "sm" | "md" | "lg";
};

const paddingClasses = {
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
} as const;

function Card({
  as: Element = "section",
  children,
  className = "",
  padding = "md",
  ...props
}: CardProps) {
  return (
    <Element
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </Element>
  );
}

export { Card };
export type { CardProps };
