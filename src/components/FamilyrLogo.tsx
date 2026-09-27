import { FamilyrMark } from "@/components/FamilyrMark";
import Link from "next/link";
import type { ReactNode } from "react";

export function FamilyrLogo({
  href = "/",
  className = "",
  markClassName = "h-5 w-5",
  textClassName,
  wordmarkClassName = "font-brand text-xl",
  suffix,
}: {
  href?: string | null;
  className?: string;
  markClassName?: string;
  textClassName?: string;
  wordmarkClassName?: string;
  suffix?: ReactNode;
}) {
  const wordmark = textClassName ?? wordmarkClassName;
  const content = (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <FamilyrMark className={markClassName} />
      <span className={wordmark}>Familyr</span>
      {suffix}
    </span>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
