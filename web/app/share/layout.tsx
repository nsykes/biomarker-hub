export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="h-screen overflow-auto">{children}</div>;
}
