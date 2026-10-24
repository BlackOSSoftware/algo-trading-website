import SharekhanShell from "@/components/SharekhanShell";

export default function SharekhanLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SharekhanShell>{children}</SharekhanShell>;
}
