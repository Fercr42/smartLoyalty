import { redirect } from "next/navigation";

// La landing nueva ya es la portada: /nueva lleva a la página principal.
export default function Nueva() {
  redirect("/");
}
