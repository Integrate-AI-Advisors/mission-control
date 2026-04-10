import { Sidebar } from "@/components/sidebar";
import { getClients } from "@/lib/clients";

export default async function ClientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clients = await getClients();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar clients={clients} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
