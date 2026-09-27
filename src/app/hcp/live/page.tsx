import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LiveDemoPage() {
  redirect("/hcp");
}
