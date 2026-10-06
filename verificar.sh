#!/bin/bash
# Mac/Linux: bash verificar.sh — mostra quais arquivos do projeto estão faltando nesta pasta.
cd "$(dirname "$0")"
[ -f tools/arquivos.txt ] || { echo "Falta a pasta tools. Copie-a do zip completo."; exit 1; }
falta=0
while IFS= read -r f; do [ -f "$f" ] || { echo "FALTA: $f"; falta=1; }; done < tools/arquivos.txt
[ $falta -eq 0 ] && echo "Tudo certo: nenhum arquivo faltando." || echo "Copie os arquivos acima do zip completo para esta pasta."
