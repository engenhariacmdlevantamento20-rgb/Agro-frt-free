export const CATEGORIES: Record<string, string> = {
  boi: "Boi", vaca: "Vaca", novilho: "Novilho", novilha: "Novilha", bezerro: "Bezerro", bezerra: "Bezerra", touro: "Touro", outros: "Outros bovinos",
};

export const STATUS_LABEL: Record<string, string> = {
  documentation: "Documentação", ready: "Pronto para embarque", loading: "Embarcando", in_transit: "Em trânsito",
  unloading: "Desembarcando", completed: "Concluído", cancelled: "Cancelado",
};

export const FLOW: Record<string, { to: string; who: "both" | "transporter"; label: string }> = {
  documentation: { to: "ready", who: "both", label: "Documentação conferida" },
  ready: { to: "loading", who: "transporter", label: "Iniciar embarque" },
  loading: { to: "in_transit", who: "transporter", label: "Iniciar viagem" },
  in_transit: { to: "unloading", who: "transporter", label: "Cheguei ao destino" },
  unloading: { to: "completed", who: "both", label: "Concluir transporte" },
};
