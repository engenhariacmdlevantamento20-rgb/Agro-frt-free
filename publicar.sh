#!/bin/bash
# Mac/Linux: abra o Terminal na pasta e rode: bash publicar.sh
cd "$(dirname "$0")"
SITE="agrofretebr"
command -v node >/dev/null || { echo "Instale o Node.js (versão LTS) em https://nodejs.org e rode de novo."; exit 1; }
echo "[1/3] Instalando..."; npm install || exit 1
if [ ! -f .netlify/state.json ]; then
  echo "[2/3] Conectando ao Netlify..."
  npx --yes netlify-cli status >/dev/null 2>&1 || npx --yes netlify-cli login || exit 1
  if ! npx --yes netlify-cli link --name "$SITE"; then
    echo "Não achei o site \"$SITE\" nesta conta (o login salvo pode ser de outra conta)."
    read -r -p "Entrar com outra conta? Digite S e Enter (ou só Enter para escolher numa lista): " T
    if [[ "$T" =~ ^[sS]$ ]]; then
      npx --yes netlify-cli logout; npx --yes netlify-cli login || exit 1
      npx --yes netlify-cli link --name "$SITE" || npx --yes netlify-cli link || exit 1
    else
      npx --yes netlify-cli link || exit 1
    fi
  fi
fi
echo "[3/3] Construindo e publicando..."
npx --yes netlify-cli deploy --build --prod || { echo "Algo deu errado. Me mande as últimas linhas."; exit 1; }
echo "Pronto! Site publicado."
