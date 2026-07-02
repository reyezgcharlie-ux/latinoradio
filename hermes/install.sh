#!/bin/bash
# HERMES OS v2 — instalador (ejecutar EN el Hetzner como root)
set -e
DIR=/root/hermes-knowledge
mkdir -p $DIR /root/backups
BASE=https://raw.githubusercontent.com/reyezgcharlie-ux/latinoradio/main/hermes
curl -sL $BASE/HERMES_KNOWLEDGE.md -o $DIR/HERMES_KNOWLEDGE.md
curl -sL $BASE/HERMES_RUNBOOKS.md  -o $DIR/HERMES_RUNBOOKS.md
echo "Descargados:"; wc -c $DIR/*.md
echo ""
echo "SIGUIENTE PASO MANUAL (depende del framework):"
echo "1. Localiza el config del agente: systemctl cat hermes* | grep -E 'ExecStart|WorkingDirectory'"
echo "2. En el system prompt del agente agrega la línea:"
echo "   'Tu sistema operativo cognitivo está en /root/hermes-knowledge/HERMES_KNOWLEDGE.md y tus comandos en HERMES_RUNBOOKS.md. Léelos al iniciar.'"
echo "   (o si el framework soporta archivos de prompt, apunta directamente a HERMES_KNOWLEDGE.md)"
echo "3. systemctl restart hermes*"
echo "4. Prueba por Telegram: 'Hermes, ¿cuál es tu regla más importante?' — debe responder sobre la memoria dinámica en Notion."
