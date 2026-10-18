import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Save } from "lucide-react";
import { revalidatePath } from "next/cache";

export default async function ContactsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const contacts = await prisma.contact.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "desc" },
  });

  // Server Action to delete
  async function deleteContact(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.contact.delete({
      where: { id, workspaceId: user!.workspaceId },
    });
    revalidatePath("/contacts");
  }

  // Server Action to update name
  async function updateContact(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    await prisma.contact.update({
      where: { id, workspaceId: user!.workspaceId },
      data: { name },
    });
    revalidatePath("/contacts");
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold mb-6">Contacts</h1>
      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium text-zinc-500 w-1/2">
                  Name
                </th>
                <th className="px-6 py-3 font-medium text-zinc-500 w-1/3">
                  Phone
                </th>
                <th className="px-6 py-3 font-medium text-zinc-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4">
                    {/* Inline Form to Update Name */}
                    <form
                      action={updateContact}
                      className="flex items-center gap-2 max-w-xs"
                    >
                      <input type="hidden" name="id" value={c.id} />
                      <Input
                        name="name"
                        defaultValue={c.name}
                        className="h-8 text-sm"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        title="Save Name"
                      >
                        <Save className="h-4 w-4 text-indigo-600" />
                      </Button>
                    </form>
                  </td>
                  <td className="px-6 py-4 text-zinc-500 font-mono text-xs">
                    {c.phone || "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <form action={deleteContact}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button
                        type="submit"
                        variant="danger"
                        size="sm"
                        title="Delete Contact"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
