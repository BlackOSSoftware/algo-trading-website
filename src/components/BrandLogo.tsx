import Image from "next/image";

export function BrandLogo({
  size = 44,
  priority = false,
}: {
  size?: number;
  priority?: boolean;
}) {
  return (
    <span
      className="brand-mark brand-mark-logo"
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-hidden="true"
    >
      <Image
        src="/logo.png"
        alt="Emotionless Traders logo"
        width={size}
        height={size}
        priority={priority}
        className="brand-mark-image"
      />
    </span>
  );
}
