# SKILL: Recuperación de Infraestructura (firewall, servicios, timeouts)
Casos reales resueltos en la sesión 2026-07-03.

## SSH bloqueado: diagnóstico sin necesitar SSH
Si SSH (puerto 22) deja de responder, NO entres en pánico — si el bridge
(puerto 9999) sigue vivo, tienes control TOTAL del servidor igual:
1. `ufw status verbose` vía playbook — revisa si falta la regla de 22/tcp.
   Causa típica: alguien corrió `ufw enable` (default deny incoming) SIN
   agregar `ufw allow 22/tcp` primero.
2. Fix: `ufw allow 22/tcp` vía el mismo canal — no requiere SSH para nada.
3. Si sigue sin responder desde afuera tras arreglar ufw, hay una SEGUNDA capa
   (firewall de la nube, ej. Hetzner Cloud Firewall) que se configura aparte
   y necesita revisión manual en la consola web — el bridge no puede tocar esa
   capa (vive fuera del sistema operativo del servidor).

## Reiniciar servicios propios sin autodestruirte
Un proceso NO puede reiniciarse a sí mismo limpiamente desde dentro de su
propia ejecución (se mata a medio comando). Si el bridge necesita reiniciarse
tras una actualización, pídele a alguien CON acceso externo (SSH, o el propio
Hermes si el servicio a reiniciar es DISTINTO de su propio proceso principal)
que corra `systemctl restart <servicio>` desde afuera de esa ejecución.
Diferencia clave: reiniciar TU PROPIO proceso = problema. Reiniciar un
servicio hermano/separado = seguro, sin importar desde dónde se dispare.

## Timeouts de scripts largos
Pipelines de contenido reales (RSS→TTS→video→multi-publicación) tardan 2-7
minutos. Si algo se corta a los 120s o 280s sin terminar, el timeout está mal
calibrado para el trabajo real, no es que el pipeline esté roto. Sube el
timeout ANTES de seguir depurando síntomas que en realidad son solo "se quedó
sin tiempo".

## Verificación siempre después de un fix de red/firewall
Nunca asumas que un cambio de firewall/regla "ya debería funcionar" — pruébalo
desde AFUERA del servidor (otra máquina, o un servicio externo) después de
cada cambio. Un `ufw status` sano en el host no garantiza que una capa de
firewall de la nube por encima no siga bloqueando.
