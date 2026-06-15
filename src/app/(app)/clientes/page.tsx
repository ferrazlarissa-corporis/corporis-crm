import { getClientes, getClienteStats } from "@/lib/queries/clientes";
import { ClientesClient } from "./clientes-client";

export const metadata = { title: "Clientes · Corporis" };

export default async function ClientesPage() {
  const clientes = await getClientes();
  const stats = getClienteStats(clientes);
  return <ClientesClient clientes={clientes} stats={stats} />;
}
