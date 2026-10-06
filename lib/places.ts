export const PLACE_KINDS: Record<string, { name: string; plural: string; color: string }> = {
  frigorifico: { name: "Frigorífico", plural: "Frigoríficos", color: "#b34938" },
  matadouro: { name: "Matadouro", plural: "Matadouros", color: "#b34938" },
  leilao: { name: "Leilão", plural: "Leilões", color: "#a77124" },
  confinamento: { name: "Confinamento", plural: "Confinamentos", color: "#765536" },
  armazem: { name: "Armazém", plural: "Armazéns", color: "#466b91" },
  fazenda: { name: "Fazenda", plural: "Fazendas", color: "#1e3b2a" },
  outro: { name: "Outro", plural: "Outros locais", color: "#626262" },
};

export const kindName = (kind: string) => PLACE_KINDS[kind]?.name ?? kind;
export const kindColor = (kind: string) => PLACE_KINDS[kind]?.color ?? "#626262";
