"use client";
import ProfitCalculator from "@/components/ProfitCalculator";

export default function Calculadora() {
  return (
    <main className="larga">
      <h1>Calculadora de lucro</h1>
      <p className="pequeno">Informe os km, o diesel e o que você cobra para ver o lucro do transporte. Seus valores (diesel, consumo, preço por km, impostos e despesas) ficam salvos quando você toca em “Salvar meus valores”. Nas Oportunidades, os km já vêm calculados a partir de onde você está.</p>
      <ProfitCalculator />
    </main>
  );
}
