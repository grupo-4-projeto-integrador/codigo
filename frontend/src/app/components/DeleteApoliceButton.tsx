import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { request } from "../../api/client";
import { 
  AlertDialog, 
  AlertDialogTrigger, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogCancel, 
  AlertDialogAction 
} from "./ui/alert-dialog";

type DeleteApoliceButtonProps = {
  id: string;
};

export function DeleteApoliceButton({ id }: DeleteApoliceButtonProps) {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await request(`/apolices/${id}`, {
        method: "DELETE"
      });
      toast.success("Apólice excluída");
      navigate("/seguros");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao excluir apólice");
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="w-full bg-transparent hover:bg-red-50 dark:hover:bg-red-900/10 text-[#c4151f] font-medium text-[13px] py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2">
          <Trash2 className="w-4 h-4" />
          Excluir Apólice
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Apólice?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. A apólice e todo o seu histórico serão removidos permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
            {isDeleting ? "Excluindo..." : "Sim, excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
