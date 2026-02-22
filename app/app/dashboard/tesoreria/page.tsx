import { redirect } from "next/navigation";

export default function TesoreriaPage() {
    // Redirigimos por defecto a la vista de Cuadre
    redirect("/dashboard/tesoreria/cuadre");
}
