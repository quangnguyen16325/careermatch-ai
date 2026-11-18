import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";

type FeedbackMessageProps = {
  tone: "success" | "error" | "loading";
  children: string;
};

const styles = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
  loading: "border-sky-200 bg-sky-50 text-sky-800",
} as const;

function FeedbackMessage({ children, tone }: FeedbackMessageProps) {
  const Icon =
    tone === "success" ? CircleCheck : tone === "error" ? CircleAlert : LoaderCircle;

  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${styles[tone]}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${tone === "loading" ? "animate-spin" : ""}`} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export { FeedbackMessage };
