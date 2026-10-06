#!/bin/bash
# Mac/Linux: bash verificar.sh — mostra quais arquivos do projeto estão faltando nesta pasta.
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Instale o Node.js 22 ou superior."; exit 1; }
npm run check || exit 1
npm run typecheck
