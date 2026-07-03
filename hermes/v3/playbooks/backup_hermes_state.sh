#!/bin/bash
# Playbook: respalda el estado de conocimiento de Hermes antes de cambios grandes.
mkdir -p /root/backups
TS=$(date +%Y%m%d_%H%M%S)
tar -czf "/root/backups/hermes-knowledge_$TS.tar.gz" /root/hermes-knowledge/ 2>&1
echo "Backup creado: /root/backups/hermes-knowledge_$TS.tar.gz"
ls -lh /root/backups/ | tail -5
