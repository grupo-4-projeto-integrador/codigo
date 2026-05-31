export type LargeCurrencyFormat = {
  value: string;
  suffix: "M" | "B" | "";
};

export function formatLargeCurrency(amount: number): LargeCurrencyFormat {
  const absolute = Math.abs(amount);

  if (absolute >= 1_000_000_000) {
    return {
      value: `R$ ${(amount / 1_000_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`,
      suffix: "B",
    };
  }

  if (absolute >= 1_000_000) {
    return {
      value: `R$ ${(amount / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`,
      suffix: "M",
    };
  }

  return {
    value: `R$ ${amount.toLocaleString("pt-BR")}`,
    suffix: "",
  };
}