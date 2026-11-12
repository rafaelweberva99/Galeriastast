import { redirect } from "next/navigation";

/** La Comunidad ahora arranca en los rankings de hinchas. */
export default function ComunidadPage() {
  redirect("/rankings");
}
