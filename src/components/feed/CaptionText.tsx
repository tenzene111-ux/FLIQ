import Link from "next/link";
import { Fragment } from "react";

/** Renders text with #hashtags and @mentions as tappable links. */
export function CaptionText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_.]+)/g);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (/^#[a-zA-Z0-9_]+$/.test(part)) {
          return (
            <Link key={i} href={`/discover/hashtag/${part.slice(1).toLowerCase()}`} className="text-fliq-cyan font-medium hover:underline">
              {part}
            </Link>
          );
        }
        if (/^@[a-zA-Z0-9_.]+$/.test(part)) {
          return (
            <Link key={i} href={`/profile/${part.slice(1).toLowerCase()}`} className="text-fliq-cyan font-medium hover:underline">
              {part}
            </Link>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </span>
  );
}
