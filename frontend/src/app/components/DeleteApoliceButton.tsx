import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { request } from "../../api/client";
import { reverterUltimaAcao } from "../../api/audit";
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
      toast.success("Apólice excluída", {
        action: {
          label: "Desfazer",
          onClick: async () => {
            try {
              await reverterUltimaAcao({ entidade: "apolice", entidade_id: id, acao: "excluir" });
              toast.success("Apólice restaurada com sucesso");
              // Refresh na página atual para recarregar as apólices
              window.location.reload();
            } catch (err) {
              toast.error("Erro ao reverter exclusão");
            }
          }
        }
      });
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
            Tem certeza que deseja excluir esta apólice? Você poderá desfazer esta ação logo em seguida ou pelo Painel de Auditoria.
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
