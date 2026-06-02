export async function downloadArquivo(documentoId: number, nomeArquivo: string): Promise<void> {
  try {
    const response = await fetch(`/api/documentos/${documentoId}/download`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Erro ao baixar: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = nomeArquivo;
    
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    throw error;
  }
}
