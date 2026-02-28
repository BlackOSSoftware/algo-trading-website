import UserShell from "@/components/UserShell";

export default function UserLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <UserShell>{children}</UserShell>;
}
