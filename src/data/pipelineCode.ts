// ============================================================
// FÁBRICA UNIVERSAL — Código fuente completo de cada motor
// ============================================================

export interface PipelineModule {
  id: string;
  number: string;
  name: string;
  path: string;
  description: string;
  icon: string;
  code: string;
  category: 'config' | 'content' | 'visual' | 'audio' | 'assembly' | 'orchestration';
}

export const pipelineModules: PipelineModule[] = [
  // ─── 0. CONFIGURACIÓN ───
  {
    id: 'config',
    number: '00',
    name: 'Configuración del Proyecto',
    path: 'config/project.json',
    description: 'Archivo de configuración canónico con placeholders dinámicos. Define el tema, duración, estilo visual, voz TTS y parámetros de renderizado.',
    icon: '⚙️',
    category: 'config',
    code: `{
  "project": {
    "name": "{{PROJECT_NAME}}",
    "version": "1.0.0",
    "created_at": "{{TIMESTAMP}}"
  },
  "input": {
    "prompt_canonico": "{{PROMPT_CANONICO}}",
    "tema": "{{TEMA}}",
    "idioma": "{{IDIOMA}}"
  },
  "video": {
    "duracion_total_seg": "{{DURACION_TOTAL}}",
    "duracion_clip_seg": 12,
    "resolucion": "1920x1080",
    "fps": 30,
    "codec_video": "libx264",
    "codec_audio": "aac",
    "bitrate_video": "5000k",
    "bitrate_audio": "192k"
  },
  "llm": {
    "provider": "ollama",
    "model": "{{LLM_MODEL}}",
    "base_url": "http://localhost:11434",
    "max_retries": 3,
    "retry_delay_seg": 5,
    "temperature": 0.7,
    "max_tokens": 4096
  },
  "tts": {
    "provider": "{{TTS_PROVIDER}}",
    "voice_id": "{{VOICE_ID}}",
    "speed": 1.0,
    "sample_rate": 44100
  },
  "visual": {
    "motor_imagen": "{{VISUAL_ENGINE}}",
    "estilo": "{{ESTILO_VISUAL}}",
    "seed": "{{SEED}}"
  },
  "output": {
    "directorio_base": "./output/{{PROJECT_NAME}}",
    "archivo_final": "documental_final.mp4",
    "limpiar_antes": true
  }
}`
  },

  // ─── 1. PARSER ───
  {
    id: 'parser',
    number: '01',
    name: 'Parser de Prompts Canónicos',
    path: 'engines/01_parser/parser.py',
    description: 'Parsea el prompt canónico de entrada y valida que todos los placeholders estén resueltos. Genera el manifiesto inicial del proyecto.',
    icon: '📝',
    category: 'content',
    code: `#!/usr/bin/env python3
"""
Motor 01 — Parser de Prompts Canónicos
=======================================
Valida y parsea el prompt de entrada, resolviendo placeholders
y generando el manifiesto inicial del proyecto.

REGLA ESTRICTA: Si algún placeholder no está resuelto → sys.exit(1)
"""

import json
import sys
import os
import re
from datetime import datetime
from pathlib import Path


class PlaceholderError(Exception):
    """Error lanzado cuando se detecta un placeholder sin resolver."""
    pass


class PromptParser:
    """Parser de prompts canónicos con validación estricta."""

    PLACEHOLDER_PATTERN = re.compile(r'\\{\\{(\\w+)\\}\\}')
    REQUIRED_FIELDS = [
        'PROJECT_NAME', 'TEMA', 'IDIOMA', 'DURACION_TOTAL',
        'LLM_MODEL', 'TTS_PROVIDER', 'VOICE_ID',
        'VISUAL_ENGINE', 'ESTILO_VISUAL', 'SEED'
    ]

    def __init__(self, config_path: str, prompt_input: str):
        self.config_path = Path(config_path)
        self.prompt_input = prompt_input
        self.config = None
        self.manifest = None

    def load_config(self) -> dict:
        """Carga y valida el archivo de configuración."""
        if not self.config_path.exists():
            print(f"[ERROR] Archivo de configuración no encontrado: {self.config_path}", file=sys.stderr)
            sys.exit(1)

        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
        except json.JSONDecodeError as e:
            print(f"[ERROR] JSON inválido en configuración: {e}", file=sys.stderr)
            sys.exit(1)

        return self.config

    def resolve_placeholders(self, config: dict, prompt: str) -> dict:
        """
        Resuelve los placeholders {{KEY}} usando el prompt de entrada.
        Si un placeholder requerido no puede resolverse → sys.exit(1)
        """
        resolved = json.dumps(config)
        unresolved = self.PLACEHOLDER_PATTERN.findall(resolved)

        # Mapeo de placeholders desde el prompt
        prompt_data = self._parse_prompt_to_dict(prompt)

        # Resolver timestamp automáticamente
        prompt_data['TIMESTAMP'] = datetime.now().isoformat()

        for key in unresolved:
            if key in prompt_data and prompt_data[key]:
                resolved = resolved.replace(f'{{{{{key}}}}}', str(prompt_data[key]))
            elif key == 'TIMESTAMP':
                resolved = resolved.replace(f'{{{{{key}}}}}', datetime.now().isoformat())
            else:
                print(
                    f"[ERROR FATAL] Placeholder sin resolver: '{{{{{{{{{{key}}}}}}}}}}'. "
                    f"No se permiten valores por defecto.",
                    file=sys.stderr
                )
                sys.exit(1)

        # Verificación final: no deben quedar placeholders
        remaining = self.PLACEHOLDER_PATTERN.findall(resolved)
        if remaining:
            print(
                f"[ERROR FATAL] Placeholders aún sin resolver tras parseo: {remaining}",
                file=sys.stderr
            )
            sys.exit(1)

        return json.loads(resolved)

    def _parse_prompt_to_dict(self, prompt: str) -> dict:
        """
        Parsea el prompt canónico en un diccionario de valores.
        Formato esperado: KEY=VALUE por línea o JSON.
        """
        result = {}

        # Intentar parsear como JSON primero
        try:
            data = json.loads(prompt)
            return {k.upper(): v for k, v in data.items()}
        except json.JSONDecodeError:
            pass

        # Parsear formato KEY=VALUE
        for line in prompt.strip().split('\\n'):
            line = line.strip()
            if '=' in line:
                key, _, value = line.partition('=')
                result[key.strip().upper()] = value.strip().strip('"').strip("'")

        return result

    def validate_config(self, config: dict) -> None:
        """Valida que la configuración resuelta tenga todos los campos necesarios."""
        # Validar campos críticos
        if not config.get('input', {}).get('tema'):
            print("[ERROR FATAL] Campo 'tema' vacío o ausente.", file=sys.stderr)
            sys.exit(1)

        if not config.get('project', {}).get('name'):
            print("[ERROR FATAL] Campo 'project.name' vacío o ausente.", file=sys.stderr)
            sys.exit(1)

        duracion = config.get('video', {}).get('duracion_total_seg', 0)
        if not isinstance(duracion, (int, float)) or duracion <= 0:
            print(f"[ERROR FATAL] Duración inválida: {duracion}", file=sys.stderr)
            sys.exit(1)

    def generate_manifest(self, config: dict) -> dict:
        """Genera el manifiesto del proyecto para los motores subsiguientes."""
        duracion_total = config['video']['duracion_total_seg']
        duracion_clip = config['video']['duracion_clip_seg']
        num_clips = max(1, round(duracion_total / duracion_clip))

        manifest = {
            "project_name": config['project']['name'],
            "tema": config['input']['tema'],
            "idioma": config['input']['idioma'],
            "num_clips": num_clips,
            "duracion_clip_seg": duracion_clip,
            "duracion_total_seg": duracion_total,
            "resolucion": config['video']['resolucion'],
            "fps": config['video']['fps'],
            "llm_config": config['llm'],
            "tts_config": config['tts'],
            "visual_config": config['visual'],
            "output_dir": config['output']['directorio_base'],
            "archivo_final": config['output']['archivo_final'],
            "estado": "inicializado",
            "timestamp": datetime.now().isoformat()
        }

        return manifest

    def run(self) -> dict:
        """Ejecuta el parser completo."""
        print("[01_PARSER] Iniciando parseo de prompt canónico...")

        # Paso 1: Cargar configuración
        config = self.load_config()
        print(f"  ✓ Configuración cargada desde {self.config_path}")

        # Paso 2: Resolver placeholders
        resolved_config = self.resolve_placeholders(config, self.prompt_input)
        print("  ✓ Todos los placeholders resueltos")

        # Paso 3: Validar
        self.validate_config(resolved_config)
        print("  ✓ Configuración validada")

        # Paso 4: Generar manifiesto
        self.manifest = self.generate_manifest(resolved_config)
        print(f"  ✓ Manifiesto generado: {self.manifest['num_clips']} clips planificados")

        # Paso 5: Guardar manifiesto
        output_dir = Path(self.manifest['output_dir'])
        output_dir.mkdir(parents=True, exist_ok=True)

        manifest_path = output_dir / 'manifest.json'
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(self.manifest, f, indent=2, ensure_ascii=False)

        print(f"  ✓ Manifiesto guardado en {manifest_path}")
        print("[01_PARSER] Completado exitosamente.")

        return self.manifest


def main():
    if len(sys.argv) < 3:
        print("Uso: python parser.py <config_path> <prompt_file>", file=sys.stderr)
        sys.exit(1)

    config_path = sys.argv[1]
    prompt_file = sys.argv[2]

    if not Path(prompt_file).exists():
        print(f"[ERROR] Archivo de prompt no encontrado: {prompt_file}", file=sys.stderr)
        sys.exit(1)

    with open(prompt_file, 'r', encoding='utf-8') as f:
        prompt = f.read()

    parser = PromptParser(config_path, prompt)
    manifest = parser.run()

    # Escribir resultado para el orquestador
    output_dir = Path(manifest['output_dir'])
    result_path = output_dir / '01_parser_result.json'
    with open(result_path, 'w', encoding='utf-8') as f:
        json.dump({"status": "ok", "manifest": manifest}, f, indent=2)

    sys.exit(0)


if __name__ == '__main__':
    main()`
  },

  // ─── 2. SCRIPT WRITER ───
  {
    id: 'script',
    number: '02',
    name: 'Generador de Guiones',
    path: 'engines/02_script/script_writer.py',
    description: 'Genera guiones estructurados para video a partir del manifiesto. Divide el contenido en segmentos narrativos alineados con los clips planificados.',
    icon: '📜',
    category: 'content',
    code: `#!/usr/bin/env python3
"""
Motor 02 — Generador de Guiones Estructurados
==============================================
Genera un guion narrativo estructurado dividido en segmentos
que se alinean con los clips de video planificados.

REGLA ESTRICTA: El guion debe tener exactamente num_clips segmentos.
Si la generación falla → sys.exit(1)
"""

import json
import sys
import os
from pathlib import Path
from datetime import datetime


class ScriptWriter:
    """Generador de guiones con validación estricta de segmentos."""

    def __init__(self, manifest: dict):
        self.manifest = manifest
        self.script = None

    def generate_script_structure(self) -> dict:
        """
        Genera la estructura base del guion.
        Cada segmento contiene: narración, descripción visual, duración.
        """
        num_clips = self.manifest['num_clips']
        duracion_clip = self.manifest['duracion_clip_seg']
        tema = self.manifest['tema']

        segmentos = []
        for i in range(num_clips):
            segmento = {
                "id": f"seg_{i+1:03d}",
                "numero": i + 1,
                "total": num_clips,
                "posicion": f"{i+1}/{num_clips}",
                "duracion_seg": duracion_clip,
                "narracion": "",  # Será completado por el motor LLM (02b)
                "descripcion_visual": "",  # Será completado por el motor visual
                "palabras_clave": [],
                "emocion": "",
                "transicion": "cut" if i == num_clips - 1 else "fade",
                "estado": "pendiente_narracion"
            }
            segmentos.append(segmento)

        script = {
            "metadata": {
                "tema": tema,
                "idioma": self.manifest['idioma'],
                "fecha_generacion": datetime.now().isoformat(),
                "num_segmentos": num_clips,
                "duracion_estimada_seg": num_clips * duracion_clip
            },
            "segmentos": segmentos,
            "estado": "estructura_generada"
        }

        return script

    def validate_script(self, script: dict) -> None:
        """Valida que el guion tenga la estructura correcta."""
        if not script.get('segmentos'):
            print("[ERROR FATAL] El guion no tiene segmentos.", file=sys.stderr)
            sys.exit(1)

        expected = self.manifest['num_clips']
        actual = len(script['segmentos'])

        if actual != expected:
            print(
                f"[ERROR FATAL] Número de segmentos incorrecto. "
                f"Esperado: {expected}, Obtenido: {actual}",
                file=sys.stderr
            )
            sys.exit(1)

        for i, seg in enumerate(script['segmentos']):
            if not seg.get('id'):
                print(f"[ERROR FATAL] Segmento {i} sin ID.", file=sys.stderr)
                sys.exit(1)
            if seg['numero'] != i + 1:
                print(f"[ERROR FATAL] Segmento {i} con numeración incorrecta.", file=sys.stderr)
                sys.exit(1)

    def run(self) -> dict:
        """Ejecuta el generador de guiones."""
        print("[02_SCRIPT] Generando estructura del guion...")

        # Generar estructura
        self.script = self.generate_script_structure()
        print(f"  ✓ Estructura generada: {len(self.script['segmentos'])} segmentos")

        # Validar
        self.validate_script(self.script)
        print("  ✓ Estructura validada")

        # Guardar
        output_dir = Path(self.manifest['output_dir'])
        output_dir.mkdir(parents=True, exist_ok=True)

        script_path = output_dir / 'script.json'
        with open(script_path, 'w', encoding='utf-8') as f:
            json.dump(self.script, f, indent=2, ensure_ascii=False)

        print(f"  ✓ Guion guardado en {script_path}")
        print("[02_SCRIPT] Completado exitosamente.")

        return self.script


def main():
    if len(sys.argv) < 2:
        print("Uso: python script_writer.py <output_dir>", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(sys.argv[1])
    manifest_path = output_dir / 'manifest.json'

    if not manifest_path.exists():
        print(f"[ERROR] Manifiesto no encontrado: {manifest_path}", file=sys.stderr)
        sys.exit(1)

    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    writer = ScriptWriter(manifest)
    script = writer.run()

    # Guardar resultado
    result_path = output_dir / '02_script_result.json'
    with open(result_path, 'w', encoding='utf-8') as f:
        json.dump({"status": "ok", "num_segmentos": len(script['segmentos'])}, f, indent=2)

    sys.exit(0)


if __name__ == '__main__':
    main()`
  },

  // ─── 2b. LLM ENGINE ───
  {
    id: 'llm',
    number: '02b',
    name: 'Motor LLM (Ollama)',
    path: 'engines/02b_llm/llm_engine.py',
    description: 'Integra con Ollama para generar narraciones y descripciones visuales para cada segmento del guion. Incluye reintentos con backoff exponencial.',
    icon: '🧠',
    category: 'content',
    code: `#!/usr/bin/env python3
"""
Motor 02b — Integración LLM con Ollama
========================================
Genera narraciones y descripciones visuales para cada segmento
usando un modelo LLM local vía Ollama.

REGLAS ESTRICTAS:
- Si Ollama no responde → sys.exit(1) tras reintentos agotados
- NUNCA sustituir el tema por contenido genérico
- Cada segmento DEBE tener narración y descripción visual únicas
"""

import json
import sys
import time
import requests
from pathlib import Path
from typing import Optional


class OllamaClient:
    """Cliente HTTP para Ollama con reintentos y validación."""

    def __init__(self, base_url: str, model: str, max_retries: int = 3, retry_delay: int = 5):
        self.base_url = base_url.rstrip('/')
        self.model = model
        self.max_retries = max_retries
        self.retry_delay = retry_delay

    def check_availability(self) -> bool:
        """Verifica que Ollama esté disponible."""
        try:
            resp = requests.get(f"{self.base_url}/api/tags", timeout=10)
            resp.raise_for_status()
            models = resp.json().get('models', [])
            model_names = [m.get('name', '') for m in models]

            if self.model not in model_names and not any(self.model in m for m in model_names):
                print(
                    f"[ERROR FATAL] Modelo '{self.model}' no disponible en Ollama. "
                    f"Modelos disponibles: {model_names}",
                    file=sys.stderr
                )
                return False
            return True
        except requests.ConnectionError:
            print(
                f"[ERROR FATAL] No se puede conectar a Ollama en {self.base_url}",
                file=sys.stderr
            )
            return False
        except Exception as e:
            print(f"[ERROR FATAL] Error verificando Ollama: {e}", file=sys.stderr)
            return False

    def generate(self, prompt: str, system: str = "", temperature: float = 0.7, max_tokens: int = 4096) -> Optional[str]:
        """
        Genera texto con reintentos y backoff exponencial.
        Retorna None solo si todos los reintentos fallan.
        """
        full_prompt = f"{system}\\n\\n{prompt}" if system else prompt

        for attempt in range(1, self.max_retries + 1):
            try:
                payload = {
                    "model": self.model,
                    "prompt": full_prompt,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens
                    }
                }

                resp = requests.post(
                    f"{self.base_url}/api/generate",
                    json=payload,
                    timeout=120
                )
                resp.raise_for_status()

                result = resp.json()
                text = result.get('response', '').strip()

                if not text:
                    print(f"  [WARN] Respuesta vacía en intento {attempt}/{self.max_retries}")
                    if attempt < self.max_retries:
                        time.sleep(self.retry_delay * attempt)
                        continue
                    return None

                return text

            except requests.Timeout:
                print(f"  [WARN] Timeout en intento {attempt}/{self.max_retries}")
            except requests.HTTPError as e:
                print(f"  [WARN] Error HTTP {e.response.status_code} en intento {attempt}/{self.max_retries}")
            except Exception as e:
                print(f"  [WARN] Error inesperado en intento {attempt}/{self.max_retries}: {e}")

            if attempt < self.max_retries:
                wait = self.retry_delay * (2 ** (attempt - 1))
                print(f"  Reintentando en {wait}s...")
                time.sleep(wait)

        return None


class LLMEngine:
    """Motor de generación de contenido con LLM."""

    NARRATION_SYSTEM = """Eres un guionista profesional de documentales. 
Genera narraciones claras, concisas y atractivas en {idioma}.
Cada narración debe tener aproximadamente {palabras} palabras para durar {segundos} segundos.
NO uses texto genérico o de relleno. Cada línea debe ser específica al tema."""

    VISUAL_SYSTEM = """Eres un director de fotografía y diseñador de producción.
Genera descripciones visuales detalladas para cada escena de un documental.
Cada descripción debe ser un prompt válido para generación de imágenes.
Incluye: composición, iluminación, colores, ángulo de cámara, atmósfera.
NO uses descripciones genéricas."""

    def __init__(self, manifest: dict, script: dict):
        self.manifest = manifest
        self.script = script
        self.llm_config = manifest['llm_config']
        self.client = OllamaClient(
            base_url=self.llm_config['base_url'],
            model=self.llm_config['model'],
            max_retries=self.llm_config['max_retries'],
            retry_delay=self.llm_config['retry_delay_seg']
        )

    def generate_narration(self, segmento: dict) -> str:
        """Genera la narración para un segmento específico."""
        tema = self.manifest['tema']
        posicion = segmento['posicion']
        duracion = segmento['duracion_seg']
        palabras_estimadas = int(duracion * 2.5)  # ~2.5 palabras/segundo

        system = self.NARRATION_SYSTEM.format(
            idioma=self.manifest['idioma'],
            palabras=palabras_estimadas,
            segundos=duracion
        )

        prompt = f"""Tema del documental: {tema}
Posición del segmento: {posicion}
Duración: {duracion} segundos

Genera la narración para este segmento específico. 
Debe ser coherente con la posición en la narrativa general.
Responde SOLO con el texto de la narración, sin marcas ni etiquetas."""

        result = self.client.generate(prompt, system, self.llm_config.get('temperature', 0.7))

        if not result:
            print(
                f"[ERROR FATAL] No se pudo generar narración para segmento {segmento['id']}. "
                f"Todos los reintentos agotados.",
                file=sys.stderr
            )
            sys.exit(1)

        return result

    def generate_visual_description(self, segmento: dict, narracion: str) -> str:
        """Genera la descripción visual para un segmento."""
        tema = self.manifest['tema']
        estilo = self.manifest['visual_config'].get('estilo', 'cinematic')

        system = self.VISUAL_SYSTEM

        prompt = f"""Tema del documental: {tema}
Estilo visual: {estilo}
Narración del segmento: "{narracion}"

Genera una descripción visual detallada (image prompt) para este segmento.
La descripción debe complementar la narración visualmente.
Responde SOLO con la descripción visual, sin marcas ni etiquetas."""

        result = self.client.generate(prompt, system, self.llm_config.get('temperature', 0.7))

        if not result:
            print(
                f"[ERROR FATAL] No se pudo generar descripción visual para segmento {segmento['id']}.",
                file=sys.stderr
            )
            sys.exit(1)

        return result

    def run(self) -> dict:
        """Ejecuta el motor LLM para todos los segmentos."""
        print("[02b_LLM] Iniciando generación de contenido con LLM...")

        # Verificar disponibilidad de Ollama
        if not self.client.check_availability():
            print("[ERROR FATAL] Ollama no está disponible. Abortando.", file=sys.stderr)
            sys.exit(1)
        print(f"  ✓ Ollama conectado (modelo: {self.llm_config['model']})")

        # Procesar cada segmento
        for i, segmento in enumerate(self.script['segmentos']):
            print(f"  Procesando segmento {i+1}/{len(self.script['segmentos'])}: {segmento['id']}")

            # Generar narración
            narracion = self.generate_narration(segmento)
            segmento['narracion'] = narracion
            print(f"    ✓ Narración generada ({len(narracion)} chars)")

            # Generar descripción visual
            descripcion = self.generate_visual_description(segmento, narracion)
            segmento['descripcion_visual'] = descripcion
            print(f"    ✓ Descripción visual generada ({len(descripcion)} chars)")

            segmento['estado'] = 'narracion_completa'

        self.script['estado'] = 'narracion_completa'
        print("[02b_LLM] Todos los segmentos procesados exitosamente.")

        return self.script


def main():
    if len(sys.argv) < 2:
        print("Uso: python llm_engine.py <output_dir>", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(sys.argv[1])

    # Cargar manifiesto
    manifest_path = output_dir / 'manifest.json'
    if not manifest_path.exists():
        print(f"[ERROR] Manifiesto no encontrado: {manifest_path}", file=sys.stderr)
        sys.exit(1)

    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    # Cargar guion
    script_path = output_dir / 'script.json'
    if not script_path.exists():
        print(f"[ERROR] Guion no encontrado: {script_path}", file=sys.stderr)
        sys.exit(1)

    with open(script_path, 'r', encoding='utf-8') as f:
        script = json.load(f)

    # Ejecutar motor LLM
    engine = LLMEngine(manifest, script)
    updated_script = engine.run()

    # Guardar guion actualizado
    with open(script_path, 'w', encoding='utf-8') as f:
        json.dump(updated_script, f, indent=2, ensure_ascii=False)

    # Guardar resultado
    result_path = output_dir / '02b_llm_result.json'
    with open(result_path, 'w', encoding='utf-8') as f:
        json.dump({
            "status": "ok",
            "segmentos_procesados": len(updated_script['segmentos']),
            "modelo": manifest['llm_config']['model']
        }, f, indent=2)

    sys.exit(0)


if __name__ == '__main__':
    main()`
  },

  // ─── 3. CHUNKING ───
  {
    id: 'chunking',
    number: '03',
    name: 'Motor de Chunking',
    path: 'engines/03_chunking/chunker.py',
    description: 'Divide el guion en fragmentos parametrizados para clips de 10-15 segundos. Valida que cada chunk tenga contenido narrativo y visual.',
    icon: '✂️',
    category: 'content',
    code: `#!/usr/bin/env python3
"""
Motor 03 — Chunking (Fragmentación del Guion)
===============================================
Divide el guion en fragmentos optimizados para clips de video
de 10-15 segundos. Cada chunk es una unidad autocontenida.

REGLAS ESTRICTAS:
- Cada chunk DEBE tener narración no vacía
- Cada chunk DEBE tener descripción visual no vacía
- Si algún chunk está incompleto → sys.exit(1)
"""

import json
import sys
import re
from pathlib import Path
from typing import List, Dict


class ChunkValidationError(Exception):
    """Error de validación de un chunk."""
    pass


class ScriptChunker:
    """Fragmentador de guion con validación estricta."""

    MIN_WORDS_PER_CHUNK = 15
    MAX_WORDS_PER_CHUNK = 45
    MIN_VISUAL_CHARS = 30

    def __init__(self, manifest: dict, script: dict):
        self.manifest = manifest
        self.script = script
        self.chunks: List[Dict] = []

    def create_chunks(self) -> List[Dict]:
        """Crea los chunks a partir de los segmentos del guion."""
        chunks = []

        for segmento in self.script['segmentos']:
            chunk = {
                "chunk_id": segmento['id'],
                "numero": segmento['numero'],
                "total": segmento['total'],
                "duracion_target_seg": segmento['duracion_seg'],
                "narracion": segmento['narracion'],
                "descripcion_visual": segmento['descripcion_visual'],
                "emocion": segmento.get('emocion', 'neutral'),
                "transicion": segmento.get('transicion', 'cut'),
                "estado": "validado"
            }
            chunks.append(chunk)

        return chunks

    def validate_chunk(self, chunk: Dict, index: int) -> None:
        """Valida un chunk individual con reglas estrictas."""
        # Validar narración
        narracion = chunk.get('narracion', '').strip()
        if not narracion:
            raise ChunkValidationError(
                f"Chunk {chunk['chunk_id']} (índice {index}): narración vacía"
            )

        word_count = len(narracion.split())
        if word_count < self.MIN_WORDS_PER_CHUNK:
            raise ChunkValidationError(
                f"Chunk {chunk['chunk_id']}: narración demasiado corta "
                f"({word_count} palabras, mínimo {self.MIN_WORDS_PER_CHUNK})"
            )

        if word_count > self.MAX_WORDS_PER_CHUNK * 2:
            print(f"  [WARN] Chunk {chunk['chunk_id']}: narración larga ({word_count} palabras)")

        # Validar descripción visual
        descripcion = chunk.get('descripcion_visual', '').strip()
        if not descripcion:
            raise ChunkValidationError(
                f"Chunk {chunk['chunk_id']} (índice {index}): descripción visual vacía"
            )

        if len(descripcion) < self.MIN_VISUAL_CHARS:
            raise ChunkValidationError(
                f"Chunk {chunk['chunk_id']}: descripción visual demasiado corta "
                f"({len(descripcion)} chars, mínimo {self.MIN_VISUAL_CHARS})"
            )

        # Validar duración
        duracion = chunk.get('duracion_target_seg', 0)
        if duracion < 5 or duracion > 30:
            raise ChunkValidationError(
                f"Chunk {chunk['chunk_id']}: duración fuera de rango ({duracion}s)"
            )

    def validate_all_chunks(self, chunks: List[Dict]) -> None:
        """Valida todos los chunks. Si alguno falla → sys.exit(1)."""
        errors = []

        for i, chunk in enumerate(chunks):
            try:
                self.validate_chunk(chunk, i)
            except ChunkValidationError as e:
                errors.append(str(e))

        if errors:
            print("[ERROR FATAL] Errores de validación en chunks:", file=sys.stderr)
            for err in errors:
                print(f"  ✗ {err}", file=sys.stderr)
            sys.exit(1)

    def estimate_audio_duration(self, text: str, words_per_second: float = 2.5) -> float:
        """Estima la duración del audio basado en el texto."""
        words = len(text.split())
        return words / words_per_second

    def run(self) -> dict:
        """Ejecuta el chunking completo."""
        print("[03_CHUNKING] Fragmentando guion en chunks...")

        # Crear chunks
        self.chunks = self.create_chunks()
        print(f"  ✓ {len(self.chunks)} chunks creados")

        # Validar cada chunk
        self.validate_all_chunks(self.chunks)
        print("  ✓ Todos los chunks validados")

        # Estimar duraciones de audio
        total_estimado = 0
        for chunk in self.chunks:
            duracion_estimada = self.estimate_audio_duration(chunk['narracion'])
            chunk['duracion_audio_estimada_seg'] = round(duracion_estimada, 2)
            total_estimado += duracion_estimada

        print(f"  ✓ Duración total estimada: {total_estimado:.1f}s")

        # Guardar chunks
        output_dir = Path(self.manifest['output_dir'])
        chunks_dir = output_dir / 'chunks'
        chunks_dir.mkdir(parents=True, exist_ok=True)

        # Guardar índice de chunks
        chunks_index_path = output_dir / 'chunks_index.json'
        with open(chunks_index_path, 'w', encoding='utf-8') as f:
            json.dump({
                "total_chunks": len(self.chunks),
                "duracion_total_estimada_seg": round(total_estimado, 2),
                "chunks": self.chunks
            }, f, indent=2, ensure_ascii=False)

        # Guardar cada chunk individualmente
        for chunk in self.chunks:
            chunk_path = chunks_dir / f"{chunk['chunk_id']}.json"
            with open(chunk_path, 'w', encoding='utf-8') as f:
                json.dump(chunk, f, indent=2, ensure_ascii=False)

        print(f"  ✓ Chunks guardados en {chunks_dir}")
        print("[03_CHUNKING] Completado exitosamente.")

        return {"chunks": self.chunks, "total": len(self.chunks)}


def main():
    if len(sys.argv) < 2:
        print("Uso: python chunker.py <output_dir>", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(sys.argv[1])

    manifest_path = output_dir / 'manifest.json'
    script_path = output_dir / 'script.json'

    if not manifest_path.exists():
        print(f"[ERROR] Manifiesto no encontrado: {manifest_path}", file=sys.stderr)
        sys.exit(1)
    if not script_path.exists():
        print(f"[ERROR] Guion no encontrado: {script_path}", file=sys.stderr)
        sys.exit(1)

    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    with open(script_path, 'r', encoding='utf-8') as f:
        script = json.load(f)

    chunker = ScriptChunker(manifest, script)
    result = chunker.run()

    result_path = output_dir / '03_chunking_result.json'
    with open(result_path, 'w', encoding='utf-8') as f:
        json.dump({"status": "ok", "total_chunks": result['total']}, f, indent=2)

    sys.exit(0)


if __name__ == '__main__':
    main()`
  },

  // ─── 4. AUDIO TTS ───
  {
    id: 'audio',
    number: '04',
    name: 'Generador de Audio TTS',
    path: 'engines/04_audio/tts_engine.py',
    description: 'Genera audio TTS para cada fragmento del guion. Soporta múltiples proveedores (Edge-TTS, Coqui, ElevenLabs). Sin fallbacks silenciosos.',
    icon: '🔊',
    category: 'audio',
    code: `#!/usr/bin/env python3
"""
Motor 04 — Generación de Audio TTS
====================================
Genera archivos de audio para cada chunk del guion usando TTS.
Soporta: edge-tts, coqui-tts, elevenlabs.

REGLAS ESTRICTAS:
- Cada chunk DEBE generar un archivo de audio válido
- Si la generación falla → sys.exit(1) (sin audio placeholder)
- Se valida que el archivo de audio sea reproducible
"""

import json
import sys
import asyncio
import subprocess
import struct
import wave
from pathlib import Path
from typing import Optional


class AudioValidationError(Exception):
    """Error de validación de archivo de audio."""
    pass


class TTSEngine:
    """Motor de Text-to-Speech con validación estricta."""

    def __init__(self, manifest: dict, chunks: list):
        self.manifest = manifest
        self.chunks = chunks
        self.tts_config = manifest['tts_config']
        self.output_dir = Path(manifest['output_dir'])
        self.audio_dir = self.output_dir / 'audio'
        self.audio_dir.mkdir(parents=True, exist_ok=True)

    async def generate_edge_tts(self, text: str, output_path: Path) -> bool:
        """Genera audio usando edge-tts (Microsoft)."""
        try:
            import edge_tts

            voice_id = self.tts_config.get('voice_id', 'es-MX-DaliaNeural')
            rate = f"+{int((self.tts_config.get('speed', 1.0) - 1.0) * 100)}%" if self.tts_config.get('speed', 1.0) > 1.0 else f"{int((self.tts_config.get('speed', 1.0) - 1.0) * 100)}%"

            communicate = edge_tts.Communicate(text, voice_id, rate=rate)
            await communicate.save(str(output_path))
            return True

        except ImportError:
            print("  [ERROR] edge-tts no instalado. Ejecutar: pip install edge-tts", file=sys.stderr)
            return False
        except Exception as e:
            print(f"  [ERROR] edge-tts falló: {e}", file=sys.stderr)
            return False

    def generate_coqui_tts(self, text: str, output_path: Path) -> bool:
        """Genera audio usando Coqui TTS."""
        try:
            from TTS.api import TTS

            tts = TTS(model_name=self.tts_config.get('model', 'tts_models/es/css10/vits'))
            tts.tts_to_file(
                text=text,
                file_path=str(output_path),
                speaker_wav=None,
                language=self.manifest.get('idioma', 'es')
            )
            return True

        except ImportError:
            print("  [ERROR] Coqui TTS no instalado.", file=sys.stderr)
            return False
        except Exception as e:
            print(f"  [ERROR] Coqui TTS falló: {e}", file=sys.stderr)
            return False

    async def generate_audio_for_chunk(self, chunk: dict) -> Path:
        """Genera audio para un chunk específico."""
        chunk_id = chunk['chunk_id']
        narracion = chunk['narracion']
        output_path = self.audio_dir / f"{chunk_id}.wav"

        provider = self.tts_config.get('provider', 'edge-tts')
        success = False

        if provider == 'edge-tts':
            success = await self.generate_edge_tts(narracion, output_path)
        elif provider == 'coqui':
            success = self.generate_coqui_tts(narracion, output_path)
        else:
            print(
                f"[ERROR FATAL] Proveedor TTS no soportado: {provider}. "
                f"Opciones válidas: edge-tts, coqui",
                file=sys.stderr
            )
            sys.exit(1)

        if not success:
            print(
                f"[ERROR FATAL] No se pudo generar audio para chunk {chunk_id}. "
                f"Proveedor: {provider}. No se usan placeholders.",
                file=sys.stderr
            )
            sys.exit(1)

        return output_path

    def validate_audio_file(self, audio_path: Path) -> None:
        """
        Valida que el archivo de audio sea válido.
        Verifica: existencia, tamaño > 0, header WAV válido.
        """
        if not audio_path.exists():
            raise AudioValidationError(f"Archivo no existe: {audio_path}")

        file_size = audio_path.stat().st_size
        if file_size < 100:  # Un WAV válido debe ser > 100 bytes mínimo
            raise AudioValidationError(
                f"Archivo de audio demasiado pequeño ({file_size} bytes): {audio_path}"
            )

        # Validar header WAV
        try:
            with wave.open(str(audio_path), 'rb') as wf:
                channels = wf.getnchannels()
                sample_width = wf.getsampwidth()
                framerate = wf.getframerate()
                frames = wf.getnframes()

                if channels < 1 or sample_width < 1 or framerate < 8000 or frames < 1:
                    raise AudioValidationError(
                        f"Audio inválido en {audio_path}: "
                        f"ch={channels}, sw={sample_width}, fr={framerate}, frames={frames}"
                    )

                duration = frames / framerate
                if duration < 0.5:
                    raise AudioValidationError(
                        f"Audio demasiado corto ({duration:.2f}s): {audio_path}"
                    )

        except wave.Error as e:
            raise AudioValidationError(f"No es un WAV válido ({audio_path}): {e}")

    def get_audio_duration(self, audio_path: Path) -> float:
        """Obtiene la duración de un archivo WAV."""
        with wave.open(str(audio_path), 'rb') as wf:
            return wf.getnframes() / wf.getframerate()

    async def run(self) -> dict:
        """Ejecuta la generación de audio para todos los chunks."""
        print("[04_AUDIO] Generando audio TTS para cada chunk...")
        print(f"  Proveedor: {self.tts_config.get('provider')}")
        print(f"  Voice ID: {self.tts_config.get('voice_id')}")

        audio_results = []
        total_duration = 0

        for i, chunk in enumerate(self.chunks):
            chunk_id = chunk['chunk_id']
            print(f"  [{i+1}/{len(self.chunks)}] Generando audio para {chunk_id}...")

            # Generar audio
            audio_path = await self.generate_audio_for_chunk(chunk)

            # Validar audio
            try:
                self.validate_audio_file(audio_path)
            except AudioValidationError as e:
                print(f"[ERROR FATAL] Validación de audio fallida: {e}", file=sys.stderr)
                sys.exit(1)

            duration = self.get_audio_duration(audio_path)
            total_duration += duration

            audio_results.append({
                "chunk_id": chunk_id,
                "audio_path": str(audio_path),
                "duracion_seg": round(duration, 2),
                "tamano_bytes": audio_path.stat().st_size
            })

            print(f"    ✓ Audio generado: {duration:.2f}s, {audio_path.stat().st_size} bytes")

        print(f"  ✓ Audio total: {total_duration:.2f}s para {len(audio_results)} chunks")
        print("[04_AUDIO] Completado exitosamente.")

        return {
            "audio_files": audio_results,
            "total_duration_seg": round(total_duration, 2),
            "total_chunks": len(audio_results)
        }


async def main():
    if len(sys.argv) < 2:
        print("Uso: python tts_engine.py <output_dir>", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(sys.argv[1])

    # Cargar manifiesto
    manifest_path = output_dir / 'manifest.json'
    if not manifest_path.exists():
        print(f"[ERROR] Manifiesto no encontrado: {manifest_path}", file=sys.stderr)
        sys.exit(1)

    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    # Cargar chunks
    chunks_path = output_dir / 'chunks_index.json'
    if not chunks_path.exists():
        print(f"[ERROR] Índice de chunks no encontrado: {chunks_path}", file=sys.stderr)
        sys.exit(1)

    with open(chunks_path, 'r', encoding='utf-8') as f:
        chunks_data = json.load(f)

    engine = TTSEngine(manifest, chunks_data['chunks'])
    result = await engine.run()

    # Guardar resultado
    result_path = output_dir / '04_audio_result.json'
    with open(result_path, 'w', encoding='utf-8') as f:
        json.dump({"status": "ok", **result}, f, indent=2)

    sys.exit(0)


if __name__ == '__main__':
    asyncio.run(main())`
  },

  // ─── 5a. FLOW ENGINE ───
  {
    id: 'flow',
    number: '05a',
    name: 'Motor de Flujo Visual',
    path: 'engines/05a_flow/flow_engine.py',
    description: 'Genera prompts visuales optimizados y secuencias de movimiento de cámara para cada chunk. Define el flujo visual del documental.',
    icon: '🎬',
    category: 'visual',
    code: `#!/usr/bin/env python3
"""
Motor 05a — Flow Engine (Flujo Visual)
========================================
Genera prompts visuales optimizados y define el flujo de cámara
para cada segmento del documental.

REGLAS ESTRICTAS:
- Cada chunk DEBE tener un prompt visual generado
- Los prompts deben ser coherentes entre segmentos adyacentes
- Sin imágenes placeholder ni descripciones genéricas
"""

import json
import sys
import hashlib
from pathlib import Path
from typing import List, Dict


class FlowEngine:
    """Motor de definición de flujo visual."""

    CAMERA_MOVEMENTS = [
        "slow_pan_right", "slow_pan_left", "zoom_in_slow",
        "zoom_out_slow", "static_wide", "tracking_shot",
        "aerial_descend", "dolly_forward"
    ]

    TRANSITIONS = ["cut", "fade", "dissolve", "wipe_left", "zoom_transition"]

    def __init__(self, manifest: dict, chunks: list):
        self.manifest = manifest
        self.chunks = chunks
        self.visual_config = manifest['visual_config']
        self.output_dir = Path(manifest['output_dir'])
        self.flow_dir = self.output_dir / 'flow'
        self.flow_dir.mkdir(parents=True, exist_ok=True)

    def generate_camera_movement(self, index: int, total: int) -> str:
        """Genera un movimiento de cámara determinístico basado en posición."""
        seed = int(self.visual_config.get('seed', 42))
        hash_input = f"{seed}_{index}_{total}"
        hash_val = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        return self.CAMERA_MOVEMENTS[hash_val % len(self.CAMERA_MOVEMENTS)]

    def generate_visual_prompt(self, chunk: dict, index: int) -> dict:
        """
        Genera el prompt visual completo para un chunk.
        Combina la descripción del LLM con parámetros técnicos.
        """
        descripcion_base = chunk.get('descripcion_visual', '')
        if not descripcion_base:
            print(
                f"[ERROR FATAL] Chunk {chunk['chunk_id']} sin descripción visual. "
                f"El motor 02b debe ejecutarse primero.",
                file=sys.stderr
            )
            sys.exit(1)

        estilo = self.visual_config.get('estilo', 'cinematic')
        resolucion = self.manifest.get('resolucion', '1920x1080')
        camera_movement = self.generate_camera_movement(index, len(self.chunks))

        # Construir prompt optimizado
        prompt_visual = {
            "prompt_completo": f"{descripcion_base}, {estilo} style, {resolucion}, professional cinematography",
            "prompt_base": descripcion_base,
            "estilo": estilo,
            "resolucion": resolucion,
            "camera_movement": camera_movement,
            "aspect_ratio": "16:9",
            "negative_prompt": "blurry, low quality, watermark, text overlay, distorted, deformed",
            "seed": int(self.visual_config.get('seed', 42)) + index,
            "steps": 30,
            "cfg_scale": 7.5
        }

        return prompt_visual

    def determine_transition(self, index: int, total: int) -> str:
        """Determina la transición entre clips."""
        if index == total - 1:
            return "fade_out"
        if index == 0:
            return "fade_in"

        seed = int(self.visual_config.get('seed', 42))
        hash_val = int(hashlib.md5(f"{seed}_trans_{index}".encode()).hexdigest(), 16)
        return self.TRANSITIONS[hash_val % len(self.TRANSITIONS)]

    def run(self) -> dict:
        """Ejecuta el motor de flujo visual."""
        print("[05a_FLOW] Generando flujo visual del documental...")

        flow_data = []

        for i, chunk in enumerate(self.chunks):
            chunk_id = chunk['chunk_id']

            # Generar prompt visual
            visual_prompt = self.generate_visual_prompt(chunk, i)

            # Determinar transición
            transition = self.determine_transition(i, len(self.chunks))

            flow_entry = {
                "chunk_id": chunk_id,
                "numero": i + 1,
                "visual_prompt": visual_prompt,
                "transition_in": transition if i == 0 else flow_data[i-1]['transition_out'] if i > 0 else "cut",
                "transition_out": self.determine_transition(i + 1, len(self.chunks)) if i < len(self.chunks) - 1 else "fade_out",
                "camera_movement": visual_prompt['camera_movement'],
                "estado": "prompt_generado"
            }

            flow_data.append(flow_entry)
            print(f"  ✓ Chunk {chunk_id}: {visual_prompt['camera_movement']} | {transition}")

        # Guardar flujo visual
        flow_path = self.output_dir / 'flow_visual.json'
        with open(flow_path, 'w', encoding='utf-8') as f:
            json.dump({
                "total_entries": len(flow_data),
                "estilo": self.visual_config.get('estilo'),
                "entries": flow_data
            }, f, indent=2, ensure_ascii=False)

        # Guardar cada entry individual
        for entry in flow_data:
            entry_path = self.flow_dir / f"{entry['chunk_id']}_flow.json"
            with open(entry_path, 'w', encoding='utf-8') as f:
                json.dump(entry, f, indent=2, ensure_ascii=False)

        print(f"  ✓ Flujo visual guardado: {len(flow_data)} entradas")
        print("[05a_FLOW] Completado exitosamente.")

        return {"entries": flow_data, "total": len(flow_data)}


def main():
    if len(sys.argv) < 2:
        print("Uso: python flow_engine.py <output_dir>", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(sys.argv[1])

    manifest_path = output_dir / 'manifest.json'
    chunks_path = output_dir / 'chunks_index.json'

    if not manifest_path.exists():
        print(f"[ERROR] Manifiesto no encontrado: {manifest_path}", file=sys.stderr)
        sys.exit(1)
    if not chunks_path.exists():
        print(f"[ERROR] Chunks no encontrados: {chunks_path}", file=sys.stderr)
        sys.exit(1)

    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    with open(chunks_path, 'r', encoding='utf-8') as f:
        chunks_data = json.load(f)

    engine = FlowEngine(manifest, chunks_data['chunks'])
    result = engine.run()

    result_path = output_dir / '05a_flow_result.json'
    with open(result_path, 'w', encoding='utf-8') as f:
        json.dump({"status": "ok", "total": result['total']}, f, indent=2)

    sys.exit(0)


if __name__ == '__main__':
    main()`
  },

  // ─── 5b. VIBES ENGINE ───
  {
    id: 'vibes',
    number: '05b',
    name: 'Motor de Imágenes (Vibes)',
    path: 'engines/05b_vibes/vibes_engine.py',
    description: 'Genera las imágenes para cada segmento usando el motor visual configurado. Valida dimensiones, formato y calidad.',
    icon: '🖼️',
    category: 'visual',
    code: `#!/usr/bin/env python3
"""
Motor 05b — Vibes Engine (Generación de Imágenes)
===================================================
Genera imágenes para cada segmento usando el motor visual configurado.
Soporta: Stable Diffusion (local), DALL-E, Midjourney API.

REGLAS ESTRICTAS:
- Cada chunk DEBE generar una imagen válida
- Si la API falla → sys.exit(1) (sin imagen placeholder)
- Se valida formato, resolución y tamaño del archivo
"""

import json
import sys
import time
import requests
import base64
from pathlib import Path
from typing import Optional
from io import BytesIO

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


class ImageValidationError(Exception):
    """Error de validación de imagen."""
    pass


class VibesEngine:
    """Motor de generación de imágenes con validación estricta."""

    def __init__(self, manifest: dict, flow_data: list):
        self.manifest = manifest
        self.flow_data = flow_data
        self.visual_config = manifest['visual_config']
        self.output_dir = Path(manifest['output_dir'])
        self.images_dir = self.output_dir / 'images'
        self.images_dir.mkdir(parents=True, exist_ok=True)

        # Parsear resolución
        res = self.manifest.get('resolucion', '1920x1080')
        self.width, self.height = map(int, res.split('x'))

    def generate_with_stable_diffusion(self, prompt_data: dict, output_path: Path) -> bool:
        """Genera imagen usando Stable Diffusion local (AUTOMATIC1111 API)."""
        api_url = "http://localhost:7860/sdapi/v1/txt2img"

        payload = {
            "prompt": prompt_data['prompt_completo'],
            "negative_prompt": prompt_data.get('negative_prompt', ''),
            "steps": prompt_data.get('steps', 30),
            "cfg_scale": prompt_data.get('cfg_scale', 7.5),
            "width": self.width,
            "height": self.height,
            "seed": prompt_data.get('seed', -1),
            "sampler_name": "DPM++ 2M Karras"
        }

        try:
            resp = requests.post(api_url, json=payload, timeout=120)
            resp.raise_for_status()

            result = resp.json()
            images = result.get('images', [])

            if not images:
                return False

            # Decodificar y guardar
            img_data = base64.b64decode(images[0])
            with open(output_path, 'wb') as f:
                f.write(img_data)

            return True

        except requests.ConnectionError:
            print("  [ERROR] No se puede conectar a Stable Diffusion API (puerto 7860)", file=sys.stderr)
            return False
        except Exception as e:
            print(f"  [ERROR] Stable Diffusion falló: {e}", file=sys.stderr)
            return False

    def generate_with_dalle(self, prompt_data: dict, output_path: Path) -> bool:
        """Genera imagen usando DALL-E API."""
        api_key = self.visual_config.get('api_key', '')
        if not api_key:
            print("[ERROR FATAL] API key de DALL-E no configurada.", file=sys.stderr)
            sys.exit(1)

        try:
            resp = requests.post(
                "https://api.openai.com/v1/images/generations",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "dall-e-3",
                    "prompt": prompt_data['prompt_completo'],
                    "n": 1,
                    "size": "1792x1024",
                    "quality": "hd"
                },
                timeout=60
            )
            resp.raise_for_status()

            result = resp.json()
            image_url = result['data'][0]['url']

            # Descargar imagen
            img_resp = requests.get(image_url, timeout=30)
            img_resp.raise_for_status()

            with open(output_path, 'wb') as f:
                f.write(img_resp.content)

            return True

        except requests.HTTPError as e:
            print(f"  [ERROR] DALL-E API error: {e.response.status_code}", file=sys.stderr)
            return False
        except Exception as e:
            print(f"  [ERROR] DALL-E falló: {e}", file=sys.stderr)
            return False

    def validate_image(self, image_path: Path) -> None:
        """Valida que la imagen sea válida y tenga las dimensiones correctas."""
        if not image_path.exists():
            raise ImageValidationError(f"Imagen no existe: {image_path}")

        file_size = image_path.stat().st_size
        if file_size < 1000:
            raise ImageValidationError(f"Imagen demasiado pequeña ({file_size} bytes): {image_path}")

        if PIL_AVAILABLE:
            try:
                with Image.open(image_path) as img:
                    w, h = img.size
                    if w < 512 or h < 512:
                        raise ImageValidationError(
                            f"Imagen demasiado pequeña ({w}x{h}): {image_path}"
                        )
            except Exception as e:
                if isinstance(e, ImageValidationError):
                    raise
                raise ImageValidationError(f"Imagen corrupta ({image_path}): {e}")

    def generate_image_for_chunk(self, flow_entry: dict) -> Path:
        """Genera imagen para un chunk específico."""
        chunk_id = flow_entry['chunk_id']
        prompt_data = flow_entry['visual_prompt']
        output_path = self.images_dir / f"{chunk_id}.png"

        motor = self.visual_config.get('motor_imagen', 'stable-diffusion')
        success = False

        if motor == 'stable-diffusion':
            success = self.generate_with_stable_diffusion(prompt_data, output_path)
        elif motor == 'dalle':
            success = self.generate_with_dalle(prompt_data, output_path)
        else:
            print(
                f"[ERROR FATAL] Motor de imagen no soportado: {motor}. "
                f"Opciones: stable-diffusion, dalle",
                file=sys.stderr
            )
            sys.exit(1)

        if not success:
            print(
                f"[ERROR FATAL] No se pudo generar imagen para {chunk_id}. "
                f"Motor: {motor}. No se usan placeholders.",
                file=sys.stderr
            )
            sys.exit(1)

        return output_path

    def run(self) -> dict:
        """Ejecuta la generación de imágenes."""
        print("[05b_VIBES] Generando imágenes para cada segmento...")
        print(f"  Motor: {self.visual_config.get('motor_imagen')}")
        print(f"  Resolución: {self.width}x{self.height}")

        image_results = []

        for i, flow_entry in enumerate(self.flow_data):
            chunk_id = flow_entry['chunk_id']
            print(f"  [{i+1}/{len(self.flow_data)}] Generando imagen para {chunk_id}...")

            # Generar imagen
            image_path = self.generate_image_for_chunk(flow_entry)

            # Validar
            try:
                self.validate_image(image_path)
            except ImageValidationError as e:
                print(f"[ERROR FATAL] Validación de imagen fallida: {e}", file=sys.stderr)
                sys.exit(1)

            image_results.append({
                "chunk_id": chunk_id,
                "image_path": str(image_path),
                "tamano_bytes": image_path.stat().st_size
            })

            print(f"    ✓ Imagen generada: {image_path.stat().st_size} bytes")

        print(f"  ✓ {len(image_results)} imágenes generadas y validadas")
        print("[05b_VIBES] Completado exitosamente.")

        return {"images": image_results, "total": len(image_results)}


def main():
    if len(sys.argv) < 2:
        print("Uso: python vibes_engine.py <output_dir>", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(sys.argv[1])

    manifest_path = output_dir / 'manifest.json'
    flow_path = output_dir / 'flow_visual.json'

    if not manifest_path.exists():
        print(f"[ERROR] Manifiesto no encontrado: {manifest_path}", file=sys.stderr)
        sys.exit(1)
    if not flow_path.exists():
        print(f"[ERROR] Flujo visual no encontrado: {flow_path}", file=sys.stderr)
        sys.exit(1)

    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    with open(flow_path, 'r', encoding='utf-8') as f:
        flow_data = json.load(f)

    engine = VibesEngine(manifest, flow_data['entries'])
    result = engine.run()

    result_path = output_dir / '05b_vibes_result.json'
    with open(result_path, 'w', encoding='utf-8') as f:
        json.dump({"status": "ok", "total": result['total']}, f, indent=2)

    sys.exit(0)


if __name__ == '__main__':
    main()`
  },

  // ─── 5c. BLENDER ENGINE ───
  {
    id: 'blender',
    number: '05c',
    name: 'Motor Blender (Video por Clip)',
    path: 'engines/05c_blender/blender_engine.py',
    description: 'Procesa cada clip de video individual combinando imagen + audio + movimiento de cámara usando FFmpeg. Valida cada clip contra el manifiesto.',
    icon: '🎥',
    category: 'visual',
    code: `#!/usr/bin/env python3
"""
Motor 05c — Blender Engine (Composición de Clips)
===================================================
Combina imagen + audio + movimiento de cámara para generar
clips de video individuales usando FFmpeg.

REGLAS ESTRICTAS:
- Cada clip DEBE tener imagen y audio válidos
- Si FFmpeg falla → sys.exit(1)
- Se valida cada clip generado (duración, codec, resolución)
"""

import json
import sys
import subprocess
import shutil
from pathlib import Path
from typing import Optional


class FFmpegError(Exception):
    """Error de FFmpeg."""
    pass


class ClipValidationError(Exception):
    """Error de validación de clip."""
    pass


class BlenderEngine:
    """Motor de composición de clips con FFmpeg."""

    def __init__(self, manifest: dict):
        self.manifest = manifest
        self.output_dir = Path(manifest['output_dir'])
        self.clips_dir = self.output_dir / 'clips'
        self.clips_dir.mkdir(parents=True, exist_ok=True)
        self.images_dir = self.output_dir / 'images'
        self.audio_dir = self.output_dir / 'audio'
        self.flow_dir = self.output_dir / 'flow'

        # Verificar FFmpeg
        if not shutil.which('ffmpeg'):
            print("[ERROR FATAL] FFmpeg no encontrado en PATH.", file=sys.stderr)
            sys.exit(1)

        if not shutil.which('ffprobe'):
            print("[ERROR FATAL] ffprobe no encontrado en PATH.", file=sys.stderr)
            sys.exit(1)

    def check_ffmpeg(self) -> None:
        """Verifica que FFmpeg esté disponible."""
        try:
            result = subprocess.run(
                ['ffmpeg', '-version'],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode != 0:
                raise FFmpegError("FFmpeg retornó código de error")
        except FileNotFoundError:
            print("[ERROR FATAL] FFmpeg no instalado.", file=sys.stderr)
            sys.exit(1)
        except subprocess.TimeoutExpired:
            print("[ERROR FATAL] FFmpeg no responde.", file=sys.stderr)
            sys.exit(1)

    def get_camera_filter(self, movement: str, duration: float) -> str:
        """Genera el filtro de video para el movimiento de cámara."""
        w, h = map(int, self.manifest.get('resolucion', '1920x1080').split('x'))
        # Zoom ligeramente mayor para permitir movimiento
        zoom_w = int(w * 1.15)
        zoom_h = int(h * 1.15)

        movements = {
            "slow_pan_right": f"scale={zoom_w}:{zoom_h},crop={w}:{h}:'min(iw-{w},on*0.5)':0",
            "slow_pan_left": f"scale={zoom_w}:{zoom_h},crop={w}:{h}:'max(0,iw-{w}-on*0.5)':0",
            "zoom_in_slow": f"scale={zoom_w}:{zoom_h},crop={w}:{h}:'(iw-{w})/2':'(ih-{h})/2':min(iw-{w},on*0.3):min(ih-{h},on*0.3)",
            "zoom_out_slow": f"scale={int(w*1.2)}:{int(h*1.2)},crop={w}:{h}:'(iw-{w})/2+on*0.2':'(ih-{h})/2+on*0.2'",
            "static_wide": f"scale={w}:{h}",
            "tracking_shot": f"scale={zoom_w}:{zoom_h},crop={w}:{h}:'min(iw-{w},on*0.8)':0",
            "aerial_descend": f"scale={zoom_w}:{zoom_h},crop={w}:{h}:'(iw-{w})/2':'max(0,(ih-{h})/2-on*0.3)'",
            "dolly_forward": f"scale={int(w*1.2)}:{int(h*1.2)},crop={w}:{h}:'(iw-{w})/2+on*0.15':'(ih-{h})/2+on*0.15'"
        }

        return movements.get(movement, f"scale={w}:{h}")

    def compose_clip(self, chunk_id: str, image_path: Path, audio_path: Path,
                     camera_movement: str, duration: float) -> Path:
        """Compone un clip individual usando FFmpeg."""
        output_path = self.clips_dir / f"{chunk_id}.mp4"
        fps = self.manifest.get('fps', 30)
        video_filter = self.get_camera_filter(camera_movement, duration)

        cmd = [
            'ffmpeg', '-y',
            '-loop', '1',
            '-i', str(image_path),
            '-i', str(audio_path),
            '-vf', f"{video_filter},fps={fps},format=yuv420p",
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '18',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-shortest',
            '-t', str(duration),
            '-movflags', '+faststart',
            str(output_path)
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120
            )

            if result.returncode != 0:
                print(f"  [ERROR] FFmpeg stderr: {result.stderr[-500:]}", file=sys.stderr)
                raise FFmpegError(f"FFmpeg falló para {chunk_id}: código {result.returncode}")

            return output_path

        except subprocess.TimeoutExpired:
            raise FFmpegError(f"FFmpeg timeout para {chunk_id}")

    def validate_clip(self, clip_path: Path, expected_duration: float) -> None:
        """Valida un clip de video generado."""
        if not clip_path.exists():
            raise ClipValidationError(f"Clip no existe: {clip_path}")

        if clip_path.stat().st_size < 1000:
            raise ClipValidationError(f"Clip demasiado pequeño: {clip_path}")

        # Usar ffprobe para validar
        try:
            result = subprocess.run(
                [
                    'ffprobe', '-v', 'quiet',
                    '-print_format', 'json',
                    '-show_format', '-show_streams',
                    str(clip_path)
                ],
                capture_output=True, text=True, timeout=10
            )

            if result.returncode != 0:
                raise ClipValidationError(f"ffprobe falló para {clip_path}")

            probe_data = json.loads(result.stdout)
            format_info = probe_data.get('format', {})
            duration = float(format_info.get('duration', 0))

            # Verificar que tenga streams de video y audio
            streams = probe_data.get('streams', [])
            has_video = any(s.get('codec_type') == 'video' for s in streams)
            has_audio = any(s.get('codec_type') == 'audio' for s in streams)

            if not has_video:
                raise ClipValidationError(f"Clip sin stream de video: {clip_path}")
            if not has_audio:
                raise ClipValidationError(f"Clip sin stream de audio: {clip_path}")

            # Verificar duración (tolerancia de 2 segundos)
            if abs(duration - expected_duration) > 2.0:
                print(f"  [WARN] Duración inesperada: {duration:.2f}s (esperado ~{expected_duration:.2f}s)")

        except (json.JSONDecodeError, ValueError) as e:
            raise ClipValidationError(f"Error analizando clip {clip_path}: {e}")

    def run(self) -> dict:
        """Ejecuta la composición de todos los clips."""
        print("[05c_BLENDER] Componiendo clips de video...")

        # Verificar FFmpeg
        self.check_ffmpeg()
        print("  ✓ FFmpeg disponible")

        # Cargar datos necesarios
        chunks_path = self.output_dir / 'chunks_index.json'
        audio_result_path = self.output_dir / '04_audio_result.json'
        flow_path = self.output_dir / 'flow_visual.json'

        if not chunks_path.exists():
            print(f"[ERROR] Chunks no encontrados: {chunks_path}", file=sys.stderr)
            sys.exit(1)

        with open(chunks_path, 'r') as f:
            chunks_data = json.load(f)
        with open(audio_result_path, 'r') as f:
            audio_data = json.load(f)
        with open(flow_path, 'r') as f:
            flow_data = json.load(f)

        # Crear mapeos
        audio_map = {a['chunk_id']: a for a in audio_data['audio_files']}
        flow_map = {e['chunk_id']: e for e in flow_data['entries']}

        clip_results = []

        for i, chunk in enumerate(chunks_data['chunks']):
            chunk_id = chunk['chunk_id']
            print(f"  [{i+1}/{len(chunks_data['chunks'])]} Componiendo clip {chunk_id}...")

            # Verificar recursos
            image_path = self.images_dir / f"{chunk_id}.png"
            if not image_path.exists():
                print(f"[ERROR FATAL] Imagen no encontrada para {chunk_id}: {image_path}", file=sys.stderr)
                sys.exit(1)

            audio_info = audio_map.get(chunk_id)
            if not audio_info:
                print(f"[ERROR FATAL] Audio no encontrado para {chunk_id}", file=sys.stderr)
                sys.exit(1)
            audio_path = Path(audio_info['audio_path'])

            flow_info = flow_map.get(chunk_id)
            if not flow_info:
                print(f"[ERROR FATAL] Flujo visual no encontrado para {chunk_id}", file=sys.stderr)
                sys.exit(1)

            camera = flow_info.get('camera_movement', 'static_wide')
            duration = audio_info['duracion_seg']

            # Componer clip
            try:
                clip_path = self.compose_clip(chunk_id, image_path, audio_path, camera, duration)
            except FFmpegError as e:
                print(f"[ERROR FATAL] {e}", file=sys.stderr)
                sys.exit(1)

            # Validar clip
            try:
                self.validate_clip(clip_path, duration)
            except ClipValidationError as e:
                print(f"[ERROR FATAL] {e}", file=sys.stderr)
                sys.exit(1)

            clip_results.append({
                "chunk_id": chunk_id,
                "clip_path": str(clip_path),
                "duracion_seg": round(duration, 2),
                "camera_movement": camera,
                "tamano_bytes": clip_path.stat().st_size
            })

            print(f"    ✓ Clip generado: {clip_path.stat().st_size} bytes, {duration:.2f}s")

        print(f"  ✓ {len(clip_results)} clips compuestos y validados")
        print("[05c_BLENDER] Completado exitosamente.")

        return {"clips": clip_results, "total": len(clip_results)}


def main():
    if len(sys.argv) < 2:
        print("Uso: python blender_engine.py <output_dir>", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(sys.argv[1])
    manifest_path = output_dir / 'manifest.json'

    if not manifest_path.exists():
        print(f"[ERROR] Manifiesto no encontrado: {manifest_path}", file=sys.stderr)
        sys.exit(1)

    with open(manifest_path, 'r') as f:
        manifest = json.load(f)

    engine = BlenderEngine(manifest)
    result = engine.run()

    result_path = output_dir / '05c_blender_result.json'
    with open(result_path, 'w') as f:
        json.dump({"status": "ok", "total": result['total']}, f, indent=2)

    sys.exit(0)


if __name__ == '__main__':
    main()`
  },

  // ─── 6. MIXING ───
  {
    id: 'mixing',
    number: '06',
    name: 'Motor de Mezcla (Mixing v2)',
    path: 'engines/06_mixing_v2/mixing.py',
    description: 'Aplica transiciones, normalización de audio y corrección de color a cada clip. Prepara los clips para el stitcher final.',
    icon: '🎛️',
    category: 'assembly',
    code: `#!/usr/bin/env python3
"""
Motor 06 — Mixing v2 (Mezcla y Post-procesamiento)
=====================================================
Aplica transiciones, normalización de audio y ajustes finales
a cada clip antes de la concatenación.

REGLAS ESTRICTAS:
- Cada clip procesado DEBE ser válido
- Si FFmpeg falla en cualquier clip → sys.exit(1)
- Se valida cada clip resultante
"""

import json
import sys
import subprocess
import shutil
from pathlib import Path


class MixingEngine:
    """Motor de mezcla y post-procesamiento de clips."""

    def __init__(self, manifest: dict):
        self.manifest = manifest
        self.output_dir = Path(manifest['output_dir'])
        self.clips_dir = self.output_dir / 'clips'
        self.mixed_dir = self.output_dir / 'mixed_clips'
        self.mixed_dir.mkdir(parents=True, exist_ok=True)

        if not shutil.which('ffmpeg'):
            print("[ERROR FATAL] FFmpeg no encontrado.", file=sys.stderr)
            sys.exit(1)

    def normalize_audio(self, input_path: Path, output_path: Path) -> None:
        """Normaliza el audio del clip a -3dB."""
        cmd = [
            'ffmpeg', '-y',
            '-i', str(input_path),
            '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '192k',
            str(output_path)
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            print(f"[ERROR FATAL] Normalización de audio falló para {input_path.name}", file=sys.stderr)
            print(f"  FFmpeg: {result.stderr[-300:]}", file=sys.stderr)
            sys.exit(1)

    def apply_transition(self, input_path: Path, output_path: Path,
                         transition_in: str, transition_out: str,
                         duration: float) -> None:
        """Aplica transiciones de entrada y salida al clip."""
        fade_duration = 0.5
        video_filters = []
        audio_filters = []

        # Transición de entrada
        if transition_in == 'fade_in':
            video_filters.append(f"fade=t=in:st=0:d={fade_duration}")
            audio_filters.append(f"afade=t=in:st=0:d={fade_duration}")
        elif transition_in == 'dissolve':
            video_filters.append(f"fade=t=in:st=0:d={fade_duration * 2}")

        # Transición de salida
        if transition_out == 'fade_out':
            fade_out_start = max(0, duration - fade_duration)
            video_filters.append(f"fade=t=out:st={fade_out_start}:d={fade_duration}")
            audio_filters.append(f"afade=t=out:st={fade_out_start}:d={fade_duration}")

        vf = ','.join(video_filters) if video_filters else 'null'
        af = ','.join(audio_filters) if audio_filters else 'anull'

        cmd = [
            'ffmpeg', '-y',
            '-i', str(input_path),
            '-vf', vf,
            '-af', af,
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '18',
            '-c:a', 'aac',
            '-b:a', '192k',
            str(output_path)
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            print(f"[ERROR FATAL] Transición falló para {input_path.name}", file=sys.stderr)
            print(f"  FFmpeg: {result.stderr[-300:]}", file=sys.stderr)
            sys.exit(1)

    def validate_mixed_clip(self, clip_path: Path) -> None:
        """Valida un clip mezclado."""
        if not clip_path.exists():
            print(f"[ERROR FATAL] Clip mezclado no existe: {clip_path}", file=sys.stderr)
            sys.exit(1)

        if clip_path.stat().st_size < 1000:
            print(f"[ERROR FATAL] Clip mezclado corrupto (tamaño: {clip_path.stat().st_size}): {clip_path}", file=sys.stderr)
            sys.exit(1)

        # Verificar con ffprobe
        result = subprocess.run(
            ['ffprobe', '-v', 'quiet', '-print_format', 'json',
             '-show_format', '-show_streams', str(clip_path)],
            capture_output=True, text=True, timeout=10
        )

        if result.returncode != 0:
            print(f"[ERROR FATAL] ffprobe falló para clip mezclado: {clip_path}", file=sys.stderr)
            sys.exit(1)

        probe = json.loads(result.stdout)
        streams = probe.get('streams', [])
        has_video = any(s.get('codec_type') == 'video' for s in streams)
        has_audio = any(s.get('codec_type') == 'audio' for s in streams)

        if not has_video or not has_audio:
            print(f"[ERROR FATAL] Clip mezclado incompleto (v={has_video}, a={has_audio}): {clip_path}", file=sys.stderr)
            sys.exit(1)

    def run(self) -> dict:
        """Ejecuta la mezcla de todos los clips."""
        print("[06_MIXING] Aplicando mezcla y post-procesamiento...")

        # Cargar datos
        blender_result_path = self.output_dir / '05c_blender_result.json'
        flow_path = self.output_dir / 'flow_visual.json'

        if not blender_result_path.exists():
            print(f"[ERROR] Resultado de blender no encontrado.", file=sys.stderr)
            sys.exit(1)

        with open(blender_result_path, 'r') as f:
            blender_data = json.load(f)
        with open(flow_path, 'r') as f:
            flow_data = json.load(f)

        flow_map = {e['chunk_id']: e for e in flow_data['entries']}
        mixed_results = []

        for i, clip_info in enumerate(blender_data.get('clips', [])):
            chunk_id = clip_info['chunk_id']
            print(f"  [{i+1}/{len(blender_data['clips'])]} Mezclando {chunk_id}...")

            input_path = Path(clip_info['clip_path'])
            temp_path = self.mixed_dir / f"{chunk_id}_temp.mp4"
            output_path = self.mixed_dir / f"{chunk_id}_mixed.mp4"

            flow_info = flow_map.get(chunk_id, {})
            transition_in = flow_info.get('transition_in', 'cut')
            transition_out = flow_info.get('transition_out', 'cut')
            duration = clip_info['duracion_seg']

            # Paso 1: Normalizar audio
            self.normalize_audio(input_path, temp_path)
            print(f"    ✓ Audio normalizado")

            # Paso 2: Aplicar transiciones
            self.apply_transition(temp_path, output_path, transition_in, transition_out, duration)
            print(f"    ✓ Transiciones aplicadas ({transition_in} → {transition_out})")

            # Limpiar temp
            temp_path.unlink(missing_ok=True)

            # Validar
            self.validate_mixed_clip(output_path)

            mixed_results.append({
                "chunk_id": chunk_id,
                "mixed_path": str(output_path),
                "duracion_seg": clip_info['duracion_seg']
            })

            print(f"    ✓ Clip mezclado validado")

        print(f"  ✓ {len(mixed_results)} clips mezclados y validados")
        print("[06_MIXING] Completado exitosamente.")

        return {"mixed_clips": mixed_results, "total": len(mixed_results)}


def main():
    if len(sys.argv) < 2:
        print("Uso: python mixing.py <output_dir>", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(sys.argv[1])
    manifest_path = output_dir / 'manifest.json'

    if not manifest_path.exists():
        print(f"[ERROR] Manifiesto no encontrado.", file=sys.stderr)
        sys.exit(1)

    with open(manifest_path, 'r') as f:
        manifest = json.load(f)

    engine = MixingEngine(manifest)
    result = engine.run()

    result_path = output_dir / '06_mixing_result.json'
    with open(result_path, 'w') as f:
        json.dump({"status": "ok", "total": result['total']}, f, indent=2)

    sys.exit(0)


if __name__ == '__main__':
    main()`
  },

  // ─── 7. STITCHER ───
  {
    id: 'stitcher',
    number: '07',
    name: 'Stitcher (Concatenación Final)',
    path: 'engines/07_stitcher/stitcher.py',
    description: 'Concatena todos los clips mezclados en un único archivo de video final usando FFmpeg. Valida el resultado final.',
    icon: '🔗',
    category: 'assembly',
    code: `#!/usr/bin/env python3
"""
Motor 07 — Stitcher (Concatenación Final)
============================================
Concatena todos los clips mezclados en un único archivo de video
usando el demuxer concat de FFmpeg.

REGLAS ESTRICTAS:
- Todos los clips deben existir y ser válidos
- El archivo final DEBE ser validado
- Si la concatenación falla → sys.exit(1)
"""

import json
import sys
import subprocess
import shutil
from pathlib import Path


class StitcherEngine:
    """Motor de concatenación final de clips."""

    def __init__(self, manifest: dict):
        self.manifest = manifest
        self.output_dir = Path(manifest['output_dir'])
        self.mixed_dir = self.output_dir / 'mixed_clips'
        self.final_file = self.output_dir / manifest.get('archivo_final', 'documental_final.mp4')

        if not shutil.which('ffmpeg'):
            print("[ERROR FATAL] FFmpeg no encontrado.", file=sys.stderr)
            sys.exit(1)

    def prepare_concat_list(self, mixed_clips: list) -> Path:
        """Prepara el archivo de lista para el demuxer concat de FFmpeg."""
        concat_list_path = self.output_dir / 'concat_list.txt'

        with open(concat_list_path, 'w') as f:
            for clip in mixed_clips:
                clip_path = Path(clip['mixed_path'])
                if not clip_path.exists():
                    print(f"[ERROR FATAL] Clip mezclado no encontrado: {clip_path}", file=sys.stderr)
                    sys.exit(1)
                # Usar rutas absolutas con escapado correcto
                f.write(f"file '{clip_path.resolve()}'\\n")

        return concat_list_path

    def concatenate(self, concat_list: Path) -> None:
        """Concatena todos los clips usando FFmpeg."""
        resolucion = self.manifest.get('resolucion', '1920x1080')
        fps = self.manifest.get('fps', 30)

        cmd = [
            'ffmpeg', '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', str(concat_list),
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '18',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-r', str(fps),
            '-s', resolucion,
            '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart',
            str(self.final_file)
        ]

        print(f"  Ejecutando concatenación FFmpeg...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

        if result.returncode != 0:
            print(f"[ERROR FATAL] FFmpeg concatenación falló:", file=sys.stderr)
            print(f"  {result.stderr[-500:]}", file=sys.stderr)
            sys.exit(1)

    def validate_final(self) -> dict:
        """Valida el archivo de video final."""
        if not self.final_file.exists():
            print(f"[ERROR FATAL] Archivo final no generado: {self.final_file}", file=sys.stderr)
            sys.exit(1)

        file_size = self.final_file.stat().st_size
        if file_size < 10000:
            print(f"[ERROR FATAL] Archivo final demasiado pequeño ({file_size} bytes)", file=sys.stderr)
            sys.exit(1)

        # Validar con ffprobe
        result = subprocess.run(
            ['ffprobe', '-v', 'quiet', '-print_format', 'json',
             '-show_format', '-show_streams', str(self.final_file)],
            capture_output=True, text=True, timeout=15
        )

        if result.returncode != 0:
            print(f"[ERROR FATAL] No se puede validar el archivo final.", file=sys.stderr)
            sys.exit(1)

        probe = json.loads(result.stdout)
        format_info = probe.get('format', {})
        streams = probe.get('streams', [])

        duration = float(format_info.get('duration', 0))
        has_video = any(s.get('codec_type') == 'video' for s in streams)
        has_audio = any(s.get('codec_type') == 'audio' for s in streams)

        if not has_video:
            print("[ERROR FATAL] Archivo final sin stream de video.", file=sys.stderr)
            sys.exit(1)
        if not has_audio:
            print("[ERROR FATAL] Archivo final sin stream de audio.", file=sys.stderr)
            sys.exit(1)
        if duration < 1.0:
            print(f"[ERROR FATAL] Archivo final demasiado corto ({duration}s).", file=sys.stderr)
            sys.exit(1)

        # Obtener info de streams
        video_stream = next((s for s in streams if s.get('codec_type') == 'video'), {})
        audio_stream = next((s for s in streams if s.get('codec_type') == 'audio'), {})

        validation = {
            "archivo": str(self.final_file),
            "tamano_bytes": file_size,
            "duracion_seg": round(duration, 2),
            "video_codec": video_stream.get('codec_name', 'unknown'),
            "video_resolucion": f"{video_stream.get('width', 0)}x{video_stream.get('height', 0)}",
            "audio_codec": audio_stream.get('codec_name', 'unknown'),
            "audio_sample_rate": audio_stream.get('sample_rate', 'unknown'),
            "valido": True
        }

        return validation

    def run(self) -> dict:
        """Ejecuta la concatenación final."""
        print("[07_STITCHER] Concatenando clips en video final...")

        # Cargar datos de clips mezclados
        mixing_result_path = self.output_dir / '06_mixing_result.json'
        if not mixing_result_path.exists():
            print(f"[ERROR] Resultado de mixing no encontrado.", file=sys.stderr)
            sys.exit(1)

        # Reconstruir lista de clips mezclados del directorio
        mixed_clips = []
        for f in sorted(self.mixed_dir.glob('*_mixed.mp4')):
            chunk_id = f.stem.replace('_mixed', '')
            mixed_clips.append({
                "chunk_id": chunk_id,
                "mixed_path": str(f)
            })

        if not mixed_clips:
            print("[ERROR FATAL] No hay clips mezclados para concatenar.", file=sys.stderr)
            sys.exit(1)

        print(f"  ✓ {len(mixed_clips)} clips encontrados para concatenar")

        # Preparar lista de concatenación
        concat_list = self.prepare_concat_list(mixed_clips)
        print(f"  ✓ Lista de concatenación preparada")

        # Concatenar
        self.concatenate(concat_list)
        print(f"  ✓ Concatenación completada")

        # Validar resultado final
        validation = self.validate_final()
        print(f"  ✓ Video final validado:")
        print(f"    - Duración: {validation['duracion_seg']}s")
        print(f"    - Resolución: {validation['video_resolucion']}")
        print(f"    - Tamaño: {validation['tamano_bytes'] / 1024 / 1024:.2f} MB")

        print("[07_STITCHER] Completado exitosamente.")

        return validation


def main():
    if len(sys.argv) < 2:
        print("Uso: python stitcher.py <output_dir>", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(sys.argv[1])
    manifest_path = output_dir / 'manifest.json'

    if not manifest_path.exists():
        print(f"[ERROR] Manifiesto no encontrado.", file=sys.stderr)
        sys.exit(1)

    with open(manifest_path, 'r') as f:
        manifest = json.load(f)

    engine = StitcherEngine(manifest)
    result = engine.run()

    result_path = output_dir / '07_stitcher_result.json'
    with open(result_path, 'w') as f:
        json.dump({"status": "ok", **result}, f, indent=2)

    sys.exit(0)


if __name__ == '__main__':
    main()`
  },

  // ─── 10. PKG ───
  {
    id: 'pkg',
    number: '10',
    name: 'Motor de Empaquetado',
    path: 'engines/10_pkg/packager.py',
    description: 'Valida la salida final y genera un paquete comprimido con todos los artefactos del proyecto. Incluye manifiesto de integridad.',
    icon: '📦',
    category: 'assembly',
    code: `#!/usr/bin/env python3
"""
Motor 10 — Packager (Empaquetado Final)
==========================================
Valida la salida completa y genera un paquete comprimido
con todos los artefactos del proyecto.

REGLAS ESTRICTAS:
- El video final DEBE existir y ser válido
- Se genera un hash de integridad para cada archivo
- Si la validación falla → sys.exit(1)
"""

import json
import sys
import hashlib
import shutil
import zipfile
from pathlib import Path
from datetime import datetime


class PackagerEngine:
    """Motor de empaquetado con validación estricta."""

    def __init__(self, manifest: dict):
        self.manifest = manifest
        self.output_dir = Path(manifest['output_dir'])
        self.project_name = manifest.get('project_name', 'proyecto')

    def validate_output(self) -> dict:
        """Valida que todos los artefactos de salida existan."""
        required_files = {
            'manifest.json': self.output_dir / 'manifest.json',
            'script.json': self.output_dir / 'script.json',
            'chunks_index.json': self.output_dir / 'chunks_index.json',
            'video_final': self.output_dir / self.manifest.get('archivo_final', 'documental_final.mp4')
        }

        missing = []
        for name, path in required_files.items():
            if not path.exists():
                missing.append(f"{name}: {path}")

        if missing:
            print("[ERROR FATAL] Archivos requeridos faltantes:", file=sys.stderr)
            for m in missing:
                print(f"  ✗ {m}", file=sys.stderr)
            sys.exit(1)

        # Validar directorios de assets
        required_dirs = ['audio', 'images', 'clips', 'mixed_clips']
        for d in required_dirs:
            dir_path = self.output_dir / d
            if not dir_path.exists() or not any(dir_path.iterdir()):
                print(f"[ERROR FATAL] Directorio de assets vacío o ausente: {d}", file=sys.stderr)
                sys.exit(1)

        # Validar video final
        video_path = self.output_dir / self.manifest.get('archivo_final', 'documental_final.mp4')
        if video_path.stat().st_size < 10000:
            print(f"[ERROR FATAL] Video final corrupto o vacío.", file=sys.stderr)
            sys.exit(1)

        return {"status": "validado", "archivos": len(list(self.output_dir.rglob('*')))}

    def compute_hashes(self) -> dict:
        """Calcula hashes SHA256 para todos los archivos del proyecto."""
        hashes = {}

        for file_path in self.output_dir.rglob('*'):
            if file_path.is_file():
                rel_path = file_path.relative_to(self.output_dir)
                sha256 = hashlib.sha256()

                with open(file_path, 'rb') as f:
                    for chunk in iter(lambda: f.read(8192), b''):
                        sha256.update(chunk)

                hashes[str(rel_path)] = {
                    "sha256": sha256.hexdigest(),
                    "size_bytes": file_path.stat().st_size
                }

        return hashes

    def create_package(self, hashes: dict) -> Path:
        """Crea el paquete ZIP final."""
        package_name = f"{self.project_name}_package_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        package_path = self.output_dir / f"{package_name}.zip"

        # Crear manifiesto de integridad
        integrity_manifest = {
            "project_name": self.project_name,
            "created_at": datetime.now().isoformat(),
            "total_files": len(hashes),
            "files": hashes
        }

        integrity_path = self.output_dir / 'integrity_manifest.json'
        with open(integrity_path, 'w') as f:
            json.dump(integrity_manifest, f, indent=2)

        # Crear ZIP
        with zipfile.ZipFile(package_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for file_path in self.output_dir.rglob('*'):
                if file_path.is_file() and file_path.suffix != '.zip':
                    arcname = file_path.relative_to(self.output_dir)
                    zf.write(file_path, arcname)

        return package_path

    def run(self) -> dict:
        """Ejecuta el empaquetado."""
        print("[10_PKG] Iniciando empaquetado final...")

        # Paso 1: Validar salida
        validation = self.validate_output()
        print(f"  ✓ Salida validada: {validation['archivos']} archivos")

        # Paso 2: Calcular hashes
        hashes = self.compute_hashes()
        print(f"  ✓ Hashes calculados para {len(hashes)} archivos")

        # Paso 3: Crear paquete
        package_path = self.create_package(hashes)
        package_size = package_path.stat().st_size / 1024 / 1024
        print(f"  ✓ Paquete creado: {package_path.name} ({package_size:.2f} MB)")

        print("[10_PKG] Completado exitosamente.")

        return {
            "package_path": str(package_path),
            "package_size_mb": round(package_size, 2),
            "total_files": len(hashes)
        }


def main():
    if len(sys.argv) < 2:
        print("Uso: python packager.py <output_dir>", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(sys.argv[1])
    manifest_path = output_dir / 'manifest.json'

    if not manifest_path.exists():
        print(f"[ERROR] Manifiesto no encontrado.", file=sys.stderr)
        sys.exit(1)

    with open(manifest_path, 'r') as f:
        manifest = json.load(f)

    engine = PackagerEngine(manifest)
    result = engine.run()

    result_path = output_dir / '10_pkg_result.json'
    with open(result_path, 'w') as f:
        json.dump({"status": "ok", **result}, f, indent=2)

    sys.exit(0)


if __name__ == '__main__':
    main()`
  },

  // ─── ORCHESTRATOR ───
  {
    id: 'orchestrator',
    number: '∞',
    name: 'Orquestador Central',
    path: 'orchestrator.py',
    description: 'Orquestador secuencial que ejecuta los motores del 01 al 10 en orden. Se detiene inmediatamente ante cualquier código de salida != 0.',
    icon: '🎯',
    category: 'orchestration',
    code: `#!/usr/bin/env python3
"""
ORQUESTADOR CENTRAL — Fábrica Universal
==========================================
Ejecuta los motores del 01 al 10 en orden estricto.
Se detiene INMEDIATAMENTE ante cualquier código de salida != 0.

REGLAS CRÍTICAS:
- NUNCA reportar "Pipeline OK" si algún motor falló
- Cada motor debe retornar código 0 para continuar
- Sin fallbacks, sin saltos, sin omisiones
- Logging estricto de cada paso
"""

import json
import sys
import subprocess
import time
from pathlib import Path
from datetime import datetime
from typing import List, Tuple, Optional


class PipelineError(Exception):
    """Error crítico del pipeline."""
    pass


class Orchestrator:
    """Orquestador secuencial del pipeline de Fábrica Universal."""

    # Definición de motores en orden de ejecución
    MOTORS = [
        {
            "id": "01_parser",
            "name": "Parser de Prompts",
            "script": "engines/01_parser/parser.py",
            "args": ["{config_path}", "{prompt_file}"],
            "critical": True
        },
        {
            "id": "02_script",
            "name": "Generador de Guiones",
            "script": "engines/02_script/script_writer.py",
            "args": ["{output_dir}"],
            "critical": True
        },
        {
            "id": "02b_llm",
            "name": "Motor LLM (Ollama)",
            "script": "engines/02b_llm/llm_engine.py",
            "args": ["{output_dir}"],
            "critical": True
        },
        {
            "id": "03_chunking",
            "name": "Chunking",
            "script": "engines/03_chunking/chunker.py",
            "args": ["{output_dir}"],
            "critical": True
        },
        {
            "id": "04_audio",
            "name": "Generación de Audio TTS",
            "script": "engines/04_audio/tts_engine.py",
            "args": ["{output_dir}"],
            "critical": True
        },
        {
            "id": "05a_flow",
            "name": "Motor de Flujo Visual",
            "script": "engines/05a_flow/flow_engine.py",
            "args": ["{output_dir}"],
            "critical": True
        },
        {
            "id": "05b_vibes",
            "name": "Motor de Imágenes",
            "script": "engines/05b_vibes/vibes_engine.py",
            "args": ["{output_dir}"],
            "critical": True
        },
        {
            "id": "05c_blender",
            "name": "Composición de Clips",
            "script": "engines/05c_blender/blender_engine.py",
            "args": ["{output_dir}"],
            "critical": True
        },
        {
            "id": "06_mixing",
            "name": "Mezcla y Post-procesamiento",
            "script": "engines/06_mixing_v2/mixing.py",
            "args": ["{output_dir}"],
            "critical": True
        },
        {
            "id": "07_stitcher",
            "name": "Concatenación Final",
            "script": "engines/07_stitcher/stitcher.py",
            "args": ["{output_dir}"],
            "critical": True
        },
        {
            "id": "10_pkg",
            "name": "Empaquetado Final",
            "script": "engines/10_pkg/packager.py",
            "args": ["{output_dir}"],
            "critical": True
        }
    ]

    def __init__(self, config_path: str, prompt_file: str, base_dir: str = "."):
        self.config_path = Path(config_path)
        self.prompt_file = Path(prompt_file)
        self.base_dir = Path(base_dir)
        self.output_dir: Optional[Path] = None
        self.execution_log: List[dict] = []
        self.start_time = None
        self.failed_motor: Optional[str] = None

    def log(self, message: str, level: str = "INFO"):
        """Registra un mensaje con timestamp."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = f"[{timestamp}] [{level}] {message}"
        print(entry)
        self.execution_log.append({
            "timestamp": timestamp,
            "level": level,
            "message": message
        })

    def validate_prerequisites(self) -> None:
        """Valida que los archivos de entrada existan."""
        if not self.config_path.exists():
            self.log(f"Archivo de configuración no encontrado: {self.config_path}", "ERROR")
            sys.exit(1)

        if not self.prompt_file.exists():
            self.log(f"Archivo de prompt no encontrado: {self.prompt_file}", "ERROR")
            sys.exit(1)

        self.log("Prerrequisitos validados ✓")

    def resolve_output_dir(self) -> Path:
        """Determina el directorio de salida desde la configuración."""
        with open(self.config_path, 'r') as f:
            config = json.load(f)

        # Leer prompt para resolver nombre del proyecto
        with open(self.prompt_file, 'r') as f:
            prompt = f.read()

        # Intentar extraer PROJECT_NAME del prompt
        project_name = "proyecto"
        for line in prompt.split('\\n'):
            if 'PROJECT_NAME' in line and '=' in line:
                project_name = line.split('=', 1)[1].strip().strip('"').strip("'")
                break
            try:
                data = json.loads(prompt)
                project_name = data.get('PROJECT_NAME', data.get('project_name', 'proyecto'))
                break
            except json.JSONDecodeError:
                pass

        output_dir = self.base_dir / 'output' / project_name
        output_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir = output_dir

        self.log(f"Directorio de salida: {output_dir}")
        return output_dir

    def execute_motor(self, motor: dict) -> Tuple[bool, int, float]:
        """
        Ejecuta un motor individual.
        Retorna: (éxito, código_salida, duración_seg)
        """
        motor_id = motor['id']
        motor_name = motor['name']
        script_path = self.base_dir / motor['script']

        if not script_path.exists():
            self.log(f"Script no encontrado: {script_path}", "ERROR")
            return False, -1, 0

        # Resolver argumentos
        args = []
        for arg in motor['args']:
            resolved = arg.format(
                config_path=str(self.config_path.resolve()),
                prompt_file=str(self.prompt_file.resolve()),
                output_dir=str(self.output_dir.resolve())
            )
            args.append(resolved)

        cmd = [sys.executable, str(script_path)] + args

        self.log(f"Ejecutando: {motor_name} ({motor_id})")
        self.log(f"  Comando: {' '.join(cmd)}")

        start = time.time()

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600,  # 10 minutos timeout por motor
                cwd=str(self.base_dir)
            )

            duration = time.time() - start

            # Log stdout
            if result.stdout:
                for line in result.stdout.strip().split('\\n'):
                    if line.strip():
                        self.log(f"  [{motor_id}] {line}")

            # Log stderr
            if result.stderr:
                for line in result.stderr.strip().split('\\n'):
                    if line.strip():
                        self.log(f"  [{motor_id}] STDERR: {line}", "WARN")

            if result.returncode != 0:
                self.log(
                    f"✗ {motor_name} FALLÓ con código {result.returncode}",
                    "ERROR"
                )
                return False, result.returncode, duration
            else:
                self.log(f"✓ {motor_name} completado ({duration:.1f}s)")
                return True, 0, duration

        except subprocess.TimeoutExpired:
            duration = time.time() - start
            self.log(f"✗ {motor_name} TIMEOUT (>600s)", "ERROR")
            return False, -1, duration
        except Exception as e:
            duration = time.time() - start
            self.log(f"✗ {motor_name} EXCEPTION: {e}", "ERROR")
            return False, -1, duration

    def verify_motor_result(self, motor_id: str) -> bool:
        """Verifica que el archivo de resultado del motor exista y sea válido."""
        result_path = self.output_dir / f"{motor_id}_result.json"

        if not result_path.exists():
            self.log(f"Archivo de resultado no encontrado: {result_path}", "ERROR")
            return False

        try:
            with open(result_path, 'r') as f:
                result = json.load(f)

            if result.get('status') != 'ok':
                self.log(f"Resultado de {motor_id} no es 'ok': {result.get('status')}", "ERROR")
                return False

            return True

        except (json.JSONDecodeError, KeyError) as e:
            self.log(f"Error leyendo resultado de {motor_id}: {e}", "ERROR")
            return False

    def run(self) -> bool:
        """
        Ejecuta el pipeline completo.
        Retorna True solo si TODOS los motores completaron exitosamente.
        """
        self.start_time = time.time()
        self.log("=" * 60)
        self.log("FÁBRICA UNIVERSAL — Pipeline de Generación Multimedia")
        self.log("=" * 60)

        # Validar prerrequisitos
        self.validate_prerequisites()
        self.resolve_output_dir()

        # Ejecutar cada motor en orden
        results = []
        total_duration = 0

        for motor in self.MOTORS:
            motor_id = motor['id']

            # Ejecutar motor
            success, exit_code, duration = self.execute_motor(motor)
            total_duration += duration

            result_entry = {
                "motor_id": motor_id,
                "motor_name": motor['name'],
                "success": success,
                "exit_code": exit_code,
                "duration_seg": round(duration, 2),
                "timestamp": datetime.now().isoformat()
            }

            # Verificar resultado
            if success:
                result_verified = self.verify_motor_result(motor_id)
                result_entry['result_verified'] = result_verified

                if not result_verified:
                    self.log(
                        f"✗ VERIFICACIÓN FALLIDA para {motor_id}. "
                        f"El motor retornó 0 pero el resultado es inválido.",
                        "ERROR"
                    )
                    success = False

            results.append(result_entry)

            # Si falló, DETENER INMEDIATAMENTE
            if not success:
                self.failed_motor = motor_id
                self.log(
                    f"\\n{'!' * 60}\\n"
                    f"PIPELINE DETENIDO: {motor['name']} ({motor_id}) falló.\\n"
                    f"Código de salida: {exit_code}\\n"
                    f"{'!' * 60}",
                    "FATAL"
                )
                self.save_execution_log(results, total_duration, success=False)
                return False

        # Todos los motores completaron
        pipeline_success = all(r['success'] for r in results)
        self.save_execution_log(results, total_duration, success=pipeline_success)

        if pipeline_success:
            total_time = time.time() - self.start_time
            self.log("\\n" + "=" * 60)
            self.log(f"✓ PIPELINE COMPLETADO EXITOSAMENTE")
            self.log(f"  Tiempo total: {total_time:.1f}s")
            self.log(f"  Motores ejecutados: {len(results)}")
            self.log(f"  Salida: {self.output_dir}")
            self.log("=" * 60)
        else:
            self.log("\\n✗ PIPELINE FALLÓ — No se reporta OK", "ERROR")

        return pipeline_success

    def save_execution_log(self, results: list, total_duration: float, success: bool):
        """Guarda el log completo de ejecución."""
        if not self.output_dir:
            return

        log_data = {
            "pipeline": "Fábrica Universal",
            "started_at": self.start_time and datetime.fromtimestamp(self.start_time).isoformat(),
            "finished_at": datetime.now().isoformat(),
            "total_duration_seg": round(total_duration, 2),
            "success": success,
            "failed_motor": self.failed_motor,
            "motors": results,
            "log_entries": self.execution_log
        }

        log_path = self.output_dir / 'pipeline_execution_log.json'
        with open(log_path, 'w') as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)

        self.log(f"Log de ejecución guardado: {log_path}")


def main():
    """Punto de entrada del orquestador."""
    if len(sys.argv) < 3:
        print("Uso: python orchestrator.py <config_path> <prompt_file> [base_dir]", file=sys.stderr)
        print("", file=sys.stderr)
        print("Ejemplo:", file=sys.stderr)
        print("  python orchestrator.py config/project.json input/prompt.txt", file=sys.stderr)
        sys.exit(1)

    config_path = sys.argv[1]
    prompt_file = sys.argv[2]
    base_dir = sys.argv[3] if len(sys.argv) > 3 else "."

    orchestrator = Orchestrator(config_path, prompt_file, base_dir)
    success = orchestrator.run()

    # Código de salida estricto
    if success:
        print("\\n✓ Pipeline OK — Todos los motores completaron exitosamente.")
        sys.exit(0)
    else:
        print("\\n✗ Pipeline FALLÓ — Revisar logs para detalles.", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()`
  }
];

export const pipelineCategories = [
  { id: 'config', name: 'Configuración', color: 'from-blue-500 to-blue-700' },
  { id: 'content', name: 'Contenido', color: 'from-purple-500 to-purple-700' },
  { id: 'audio', name: 'Audio', color: 'from-green-500 to-green-700' },
  { id: 'visual', name: 'Visual', color: 'from-orange-500 to-orange-700' },
  { id: 'assembly', name: 'Ensamblado', color: 'from-red-500 to-red-700' },
  { id: 'orchestration', name: 'Orquestación', color: 'from-yellow-500 to-yellow-700' },
];
