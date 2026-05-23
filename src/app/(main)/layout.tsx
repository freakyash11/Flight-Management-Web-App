export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No width constraints here — individual pages add their own max-width
  // containers so that hero sections can span the full browser width.
  return <>{children}</>;
}
