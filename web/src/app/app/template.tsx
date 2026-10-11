/** Remounts on every in-app navigation, so each screen rises softly out of the surface. */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-rise">{children}</div>;
}
