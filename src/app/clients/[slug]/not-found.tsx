import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ClientNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6">
      <h2 className="font-serif text-xl text-foreground">Client not found</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The client you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
      <Link href="/clients" className="mt-4">
        <Button variant="outline">Back to clients</Button>
      </Link>
    </div>
  );
}
