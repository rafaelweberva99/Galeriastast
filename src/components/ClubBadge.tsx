export function ClubBadge({ primary, secondary, size = 44 }: { primary: string; secondary: string; size?: number }) {
  return (
    <span
      className="club-badge"
      aria-hidden
      style={{ width: size, height: size, background: primary, borderColor: secondary }}
    />
  );
}
