import Image from "next/image";
import { cn } from "cn";

export function MasterAvatar({
  name,
  photoUrl,
  size = 56,
  className,
}: {
  name: string;
  photoUrl: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-primary", className)}
      style={{ width: size, height: size }}
    >
      {photoUrl ? (
        <Image src={photoUrl} alt={name} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span className="font-semibold" style={{ fontSize: size * 0.36 }} aria-hidden>
          {initials}
        </span>
      )}
    </span>
  );
}
