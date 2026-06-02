from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch

def create_pdf(filename, title, content):
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4
    
    # Header
    c.setFillColor(HexColor("#c4151f"))
    c.setFont("Helvetica-Bold", 18)
    c.drawString(1 * inch, height - 1 * inch, "Shopping Flamboyant")
    
    # Separator
    c.setStrokeColor(HexColor("#cccccc"))
    c.line(1 * inch, height - 1.2 * inch, width - 1 * inch, height - 1.2 * inch)
    
    # Title
    c.setFillColor(HexColor("#333333"))
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2.0, height - 1.6 * inch, title)
    
    # Content
    c.setFont("Helvetica", 12)
    textobject = c.beginText()
    textobject.setTextOrigin(1 * inch, height - 2.2 * inch)
    
    for line in content:
        textobject.textLine(line)
        
    c.drawText(textobject)
    
    # Footer
    c.setFont("Helvetica-Oblique", 9)
    c.setFillColor(HexColor("#888888"))
    c.drawString(1 * inch, 0.5 * inch, "Apólice AP-2025-067")
    c.drawRightString(width - 1 * inch, 0.5 * inch, "Gerado eletronicamente")
    
    c.showPage()
    c.save()

if __name__ == "__main__":
    create_pdf(
        "uploads/apolices/teste/Apolice_Completa.pdf",
        "APÓLICE DE SEGURO COMPLETA",
        [
            "ID da Apólice: AP-2025-067",
            "Segurado: Lojas Americanas S.A.",
            "Seguradora: Porto Seguro",
            "Tipo de Cobertura: Compreensiva Empresarial",
            "Vigência: 01/01/2026 a 31/12/2026",
            "Valor Segurado: R$ 5.000.000,00",
            "",
            "Este documento atesta a contratação da apólice de seguro.",
            "Todos os direitos e deveres estão estabelecidos nas condições gerais."
        ]
    )
    print("Criado Apolice_Completa.pdf")
    
    create_pdf(
        "uploads/apolices/teste/Condicoes_Gerais.pdf",
        "CONDIÇÕES GERAIS DO SEGURO",
        [
            "1. COBERTURAS BÁSICAS",
            "   1.1 Incêndio, Queda de Raio e Explosão",
            "   1.2 Fumaça",
            "",
            "2. COBERTURAS ADICIONAIS",
            "   2.1 Danos Elétricos",
            "   2.2 Pagamento de Aluguel",
            "   2.3 Responsabilidade Civil Operações",
            "",
            "3. EXCLUSÕES GERAIS",
            "   Danos decorrentes de má fé ou dolo do segurado.",
            "",
            "Para mais detalhes, consulte o manual completo."
        ]
    )
    print("Criado Condicoes_Gerais.pdf")
