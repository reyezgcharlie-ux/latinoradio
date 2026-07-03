#!/bin/bash
# Playbook: diagnóstico completo del Hetzner. Solo lectura, no destructivo.
echo "=== UPTIME ==="; uptime
echo "=== DISCO ==="; df -h /
echo "=== MEMORIA ==="; free -h
echo "=== SERVICIOS HERMES ==="; systemctl status hermes-gateway --no-pager -l | head -20
echo "=== ÚLTIMOS 20 ERRORES DEL JOURNAL ==="; journalctl -u hermes-gateway --no-pager -n 20 -p err 2>/dev/null || echo "sin errores recientes"
echo "=== CONEXIONES DE RED ESCUCHANDO ==="; ss -tlnp 2>/dev/null | head -15
echo "=== PROCESOS TOP POR CPU ==="; ps aux --sort=-%cpu | head -8
