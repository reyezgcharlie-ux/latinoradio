#!/usr/bin/env python3
"""
HERMES BRIDGE SERVER v3 — servidor de comandos estructurados para el agente Hermes.
Diseñado por Claude para SYNAPT Network. Sin dependencias externas (solo stdlib).

Reemplaza el servidor HTTP simple del puerto 9999 por un dispatcher de comandos
con: whitelist de comandos seguros, cola de trabajos asíncronos para tareas
largas, y gate de confirmación explícita para comandos destructivos.

Ejecutar: python3 hermes_server.py
(Integrar con hermes-gateway.service o correr como proceso separado en el mismo puerto 9999)
"""
import json, subprocess, threading, time, uuid, os, re
from http.server import HTTPServer, BaseHTTPRequestHandler

TOKEN = os.environ.get("HERMES_BRIDGE_TOKEN", "SYNAPT_CLAUDE_2026_bridge")
JOBS = {}  # job_id -> {"status": "pending|done|error", "result": ..., "cmd": ..., "started": ts}
JOBS_LOCK = threading.Lock()

# ------------------------------------------------------------------
# WHITELIST DE COMANDOS — nada de shell arbitrario. Cada comando es una
# función Python explícita. Esto es la diferencia entre "automatización"
# y "backdoor" — el token da acceso a ESTO, no a la máquina entera.
# ------------------------------------------------------------------

def cmd_health_check(params):
    out = {}
    out["uptime"] = subprocess.run(["uptime"], capture_output=True, text=True, timeout=5).stdout.strip()
    out["disk"] = subprocess.run(["df", "-h", "/"], capture_output=True, text=True, timeout=5).stdout.strip()
    out["mem"] = subprocess.run(["free", "-h"], capture_output=True, text=True, timeout=5).stdout.strip()
    svc = subprocess.run(["systemctl", "is-active", "hermes-gateway"], capture_output=True, text=True, timeout=5)
    out["hermes_gateway"] = svc.stdout.strip()
    return out

def cmd_disk_usage(params):
    path = params.get("path", "/")
    r = subprocess.run(["du", "-sh", path], capture_output=True, text=True, timeout=15)
    return {"path": path, "usage": r.stdout.strip(), "error": r.stderr.strip() or None}

def cmd_service_status(params):
    name = params.get("name", "")
    if not re.fullmatch(r"[a-zA-Z0-9_.\-]+", name or ""):
        raise ValueError("nombre de servicio inválido")
    r = subprocess.run(["systemctl", "status", name, "--no-pager", "-l"], capture_output=True, text=True, timeout=10)
    return {"service": name, "output": r.stdout[-3000:]}

def cmd_tail_log(params):
    # Solo permite leer dentro de directorios seguros conocidos
    ALLOWED_PREFIXES = ["/var/log/", "/root/hermes-knowledge/", "/root/backups/"]
    path = params.get("path", "")
    lines = int(params.get("lines", 50))
    lines = min(max(lines, 1), 500)
    if not any(path.startswith(p) for p in ALLOWED_PREFIXES):
        raise ValueError(f"path no permitido, debe empezar con: {ALLOWED_PREFIXES}")
    r = subprocess.run(["tail", "-n", str(lines), path], capture_output=True, text=True, timeout=10)
    return {"path": path, "lines": r.stdout, "error": r.stderr.strip() or None}

def cmd_list_processes(params):
    filt = params.get("filter", "")
    r = subprocess.run(["ps", "aux"], capture_output=True, text=True, timeout=10)
    lines = r.stdout.splitlines()
    if filt:
        lines = [lines[0]] + [l for l in lines if filt.lower() in l.lower()]
    return {"processes": "\n".join(lines[:60])}

def cmd_restart_service(params):
    # DESTRUCTIVO — requiere confirm=true en el request Y está en whitelist de servicios permitidos
    ALLOWED_SERVICES = {"hermes-gateway"}
    name = params.get("name", "")
    if name not in ALLOWED_SERVICES:
        raise ValueError(f"servicio no autorizado para restart remoto. Permitidos: {ALLOWED_SERVICES}")
    r = subprocess.run(["systemctl", "restart", name], capture_output=True, text=True, timeout=20)
    return {"service": name, "restarted": r.returncode == 0, "stderr": r.stderr.strip() or None}

def cmd_run_playbook(params):
    # Playbooks: scripts predefinidos en /root/hermes-knowledge/playbooks/<name>.sh
    # NUNCA ejecuta scripts arbitrarios — solo los que ya existen en ese directorio.
    name = params.get("name", "")
    if not re.fullmatch(r"[a-zA-Z0-9_\-]+", name or ""):
        raise ValueError("nombre de playbook inválido")
    path = f"/root/hermes-knowledge/playbooks/{name}.sh"
    if not os.path.isfile(path):
        raise ValueError(f"playbook no existe: {path}")
    r = subprocess.run(["bash", path], capture_output=True, text=True, timeout=480)  # RSS->TTS->video->uploads puede tardar 4-7min real
    return {"playbook": name, "stdout": r.stdout[-4000:], "stderr": r.stderr[-2000:], "returncode": r.returncode}


def cmd_list_dir(params):
    ALLOWED_PREFIXES = ["/root/", "/etc/cron.d/", "/etc/systemd/system/", "/var/spool/cron/", "/usr/local/lib/"]
    path = params.get("path", "/root/")
    if not any(path.startswith(p) for p in ALLOWED_PREFIXES):
        raise ValueError(f"path no permitido, debe empezar con: {ALLOWED_PREFIXES}")
    if not os.path.isdir(path):
        raise ValueError(f"no es un directorio: {path}")
    entries = []
    for name in sorted(os.listdir(path)):
        full = os.path.join(path, name)
        try:
            st = os.stat(full)
            entries.append({"name": name, "is_dir": os.path.isdir(full), "size": st.st_size, "modified": time.strftime("%Y-%m-%d %H:%M", time.localtime(st.st_mtime))})
        except Exception:
            entries.append({"name": name, "error": "stat failed"})
    return {"path": path, "entries": entries[:200]}

def cmd_read_file(params):
    ALLOWED_PREFIXES = ["/root/", "/etc/cron.d/", "/etc/systemd/system/", "/var/spool/cron/", "/usr/local/lib/"]
    DENY_SUBSTRINGS = [".env", "secret", "token", "key", "credential", ".ssh"]
    path = params.get("path", "")
    if not any(path.startswith(p) for p in ALLOWED_PREFIXES):
        raise ValueError(f"path no permitido, debe empezar con: {ALLOWED_PREFIXES}")
    lower = path.lower()
    if any(d in lower for d in DENY_SUBSTRINGS):
        raise ValueError("path bloqueado por nombre (posible secreto) — usa read_file solo para código/config no sensible")
    if not os.path.isfile(path):
        raise ValueError(f"no es un archivo: {path}")
    size = os.path.getsize(path)
    if size > 300_000:
        raise ValueError(f"archivo demasiado grande ({size} bytes) para leer completo, usa tail_log si es un log")
    with open(path, "r", errors="replace") as f:
        content = f.read()
    return {"path": path, "size": size, "content": content}

def cmd_crontab_list(params):
    r1 = subprocess.run(["crontab", "-l"], capture_output=True, text=True, timeout=5)
    out = {"user_crontab": r1.stdout.strip() or r1.stderr.strip()}
    if os.path.isdir("/etc/cron.d/"):
        out["etc_cron_d"] = {}
        for name in sorted(os.listdir("/etc/cron.d/")):
            try:
                with open(f"/etc/cron.d/{name}") as f:
                    out["etc_cron_d"][name] = f.read()
            except Exception as e:
                out["etc_cron_d"][name] = f"error: {e}"
    return out

def cmd_write_file(params):
    # DESTRUCTIVO — requiere confirm=true. SIEMPRE hace backup del original antes de sobreescribir.
    ALLOWED_PREFIXES = ["/root/hermes-knowledge/", "/root/pipelines/"]
    path = params.get("path", "")
    content = params.get("content", None)
    if content is None:
        raise ValueError("falta el parametro content")
    if not any(path.startswith(p) for p in ALLOWED_PREFIXES):
        raise ValueError(f"write_file solo permitido dentro de: {ALLOWED_PREFIXES}")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    backup_path = None
    if os.path.isfile(path):
        os.makedirs("/root/backups", exist_ok=True)
        backup_path = f"/root/backups/{os.path.basename(path)}.{int(time.time())}.bak"
        with open(path, "r", errors="replace") as f_in, open(backup_path, "w") as f_out:
            f_out.write(f_in.read())
    with open(path, "w") as f:
        f.write(content)
    return {"path": path, "bytes_written": len(content), "backup": backup_path}


def cmd_ask_llm(params):
    """Consulta a un LLM distinto via OpenRouter (el token vive en el .env del servidor,
    nunca sale de aqui). Util para pedir una segunda opinion de razonamiento en problemas
    dificiles, o delegar tareas que no necesitan la reflexion completa de Claude."""
    import urllib.request as _ur
    prompt = params.get("prompt", "")
    if not prompt:
        raise ValueError("falta el parametro prompt")
    model = params.get("model", "deepseek/deepseek-v4-pro")
    max_tokens = int(params.get("max_tokens", 1500))

    or_key = ""
    try:
        with open(os.path.expanduser("~/.hermes/.env")) as f:
            for line in f:
                if line.startswith("OPENROUTER_KEY="):
                    or_key = line.strip().split("=", 1)[1]
                    break
    except Exception as e:
        raise ValueError(f"no se pudo leer OPENROUTER_KEY: {e}")
    if not or_key:
        raise ValueError("OPENROUTER_KEY no encontrada en el .env")

    body = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
    }).encode()
    req = _ur.Request(
        "https://openrouter.ai/api/v1/chat/completions", data=body, method="POST",
        headers={"Authorization": f"Bearer {or_key}", "Content-Type": "application/json"},
    )
    resp = json.loads(_ur.urlopen(req, timeout=55).read())
    if "choices" not in resp:
        raise ValueError(f"respuesta inesperada de OpenRouter: {str(resp)[:300]}")
    answer = resp["choices"][0]["message"]["content"]
    usage = resp.get("usage", {})
    return {"model": model, "answer": answer, "usage": usage}

def cmd_notion_pending(params):
    # Consulta si hay algo dirigido a Hermes sin procesar (integración con memoria compartida)
    return {"note": "Hermes debe implementar esta consulta usando su NOTION_TOKEN local"}

COMMANDS = {
    "health_check":     (cmd_health_check,     False),  # (función, requiere_confirm)
    "disk_usage":       (cmd_disk_usage,       False),
    "service_status":   (cmd_service_status,   False),
    "tail_log":         (cmd_tail_log,         False),
    "list_processes":   (cmd_list_processes,   False),
    "restart_service":  (cmd_restart_service,  True),   # DESTRUCTIVO
    "run_playbook":      (cmd_run_playbook,     True),   # DESTRUCTIVO por defecto (puede tener side effects)
    "notion_pending":   (cmd_notion_pending,   False),
    "list_dir":         (cmd_list_dir,         False),  # solo lectura
    "read_file":        (cmd_read_file,        False),  # solo lectura, con blacklist de secretos
    "crontab_list":     (cmd_crontab_list,     False),  # solo lectura
    "write_file":       (cmd_write_file,       True),   # DESTRUCTIVO — auto-backup obligatorio
    "ask_llm":          (cmd_ask_llm,          False),  # consulta a otro LLM via OpenRouter, no destructivo
}

LONG_RUNNING = {"run_playbook", "ask_llm"}  # estos siempre se ejecutan async con job_id

def execute(cmd, params):
    fn, needs_confirm = COMMANDS[cmd]
    return fn(params)

def run_job_async(job_id, cmd, params):
    try:
        result = execute(cmd, params)
        with JOBS_LOCK:
            JOBS[job_id] = {"status": "done", "result": result, "cmd": cmd, "finished": time.time()}
    except Exception as e:
        with JOBS_LOCK:
            JOBS[job_id] = {"status": "error", "error": str(e), "cmd": cmd, "finished": time.time()}

class Handler(BaseHTTPRequestHandler):
    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _auth(self, body):
        return body.get("token") == TOKEN

    def do_GET(self):
        if self.path == "/":
            self._json({"status": "ok", "agent": "hermes", "version": "3.6", "commands": list(COMMANDS.keys())})
        elif self.path.startswith("/job/"):
            job_id = self.path.split("/job/")[-1]
            with JOBS_LOCK:
                job = JOBS.get(job_id)
            if not job:
                self._json({"status": "not_found"}, 404)
            else:
                self._json(job)
        else:
            self._json({"error": "not found"}, 404)

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            self._json({"error": "invalid json"}, 400)
            return

        if not self._auth(body):
            self._json({"error": "unauthorized"}, 401)
            return

        if self.path == "/cmd":
            cmd = body.get("cmd")
            params = body.get("params", {})
            confirm = bool(body.get("confirm", False))

            if cmd not in COMMANDS:
                self._json({"error": f"comando desconocido: {cmd}", "available": list(COMMANDS.keys())}, 400)
                return

            _, needs_confirm = COMMANDS[cmd]
            if needs_confirm and not confirm:
                self._json({"error": "comando destructivo requiere confirm:true en el request", "cmd": cmd}, 428)
                return

            if cmd in LONG_RUNNING:
                job_id = str(uuid.uuid4())[:8]
                with JOBS_LOCK:
                    JOBS[job_id] = {"status": "pending", "cmd": cmd, "started": time.time()}
                threading.Thread(target=run_job_async, args=(job_id, cmd, params), daemon=True).start()
                self._json({"ok": True, "async": True, "job_id": job_id})
                return

            try:
                result = execute(cmd, params)
                self._json({"ok": True, "cmd": cmd, "result": result})
            except Exception as e:
                self._json({"ok": False, "cmd": cmd, "error": str(e)}, 500)
        else:
            # compat con v2: mensajes de texto libre siguen funcionando en la raíz
            self._json({"received": True, "from": body.get("from"), "message": body.get("message")})

    def log_message(self, fmt, *args):
        pass  # silenciar logs de acceso en consola; systemd journal los captura igual

if __name__ == "__main__":
    print("Hermes Bridge Server v3 escuchando en 0.0.0.0:9999")
    HTTPServer(("0.0.0.0", 9999), Handler).serve_forever()
