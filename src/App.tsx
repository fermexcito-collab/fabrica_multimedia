import { useState } from 'react';
import { pipelineModules, pipelineCategories, PipelineModule } from './data/pipelineCode';

function App() {
  const [selectedModule, setSelectedModule] = useState<PipelineModule | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const filteredModules = activeCategory
    ? pipelineModules.filter(m => m.category === activeCategory)
    : pipelineModules;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xl">
              🏭
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Fábrica Universal
              </h1>
              <p className="text-xs text-gray-500">Pipeline de Generación Multimedia v1.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-xs rounded-full bg-red-900/50 text-red-300 border border-red-800">
              CERO Fallbacks
            </span>
            <span className="px-2 py-1 text-xs rounded-full bg-emerald-900/50 text-emerald-300 border border-emerald-800">
              Python 3.10+
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="mb-12">
          <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 p-8 mb-8">
            <h2 className="text-3xl font-bold mb-4 text-white">
              Arquitectura del Pipeline
            </h2>
            <p className="text-gray-400 max-w-3xl mb-6">
              Sistema modular de 10 motores + orquestador para generación automatizada de video documental.
              Cada motor es independiente, ejecutable por separado, y se comunica mediante archivos JSON.
              <strong className="text-red-400"> Sin fallbacks silenciosos</strong> — cualquier fallo dispara <code className="px-1 py-0.5 bg-red-900/50 rounded text-red-300 text-sm">sys.exit(1)</code>.
            </p>

            {/* Pipeline Flow */}
            <div className="flex flex-wrap gap-2 items-center">
              {pipelineModules.map((module, idx) => (
                <div key={module.id} className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedModule(module)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 ${
                      selectedModule?.id === module.id
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span className="mr-1">{module.icon}</span>
                    {module.number}
                  </button>
                  {idx < pipelineModules.length - 1 && (
                    <span className="text-gray-600">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
              <div className="text-2xl mb-2">🚫</div>
              <h3 className="font-semibold text-white mb-1">Cero Fallbacks</h3>
              <p className="text-sm text-gray-400">
                Prohibido usar imágenes, audios o textos placeholder. Si una API falla, el pipeline se detiene.
              </p>
            </div>
            <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
              <div className="text-2xl mb-2">🔒</div>
              <h3 className="font-semibold text-white mb-1">Validación Estricta</h3>
              <p className="text-sm text-gray-400">
                Cada salida se valida antes de pasar al siguiente motor. Placeholders sin resolver = error fatal.
              </p>
            </div>
            <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
              <div className="text-2xl mb-2">📋</div>
              <h3 className="font-semibold text-white mb-1">Placeholders Dinámicos</h3>
              <p className="text-sm text-gray-400">
                Sin datos hardcodeados. Todo se define en el prompt de entrada y se resuelve en tiempo de ejecución.
              </p>
            </div>
          </div>
        </section>

        {/* Category Filter */}
        <section className="mb-8">
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                !activeCategory
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Todos ({pipelineModules.length})
            </button>
            {pipelineCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Module Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModules.map(module => (
              <button
                key={module.id}
                onClick={() => setSelectedModule(module)}
                className={`text-left rounded-xl border p-5 transition-all hover:scale-[1.02] hover:shadow-xl ${
                  selectedModule?.id === module.id
                    ? 'bg-violet-900/30 border-violet-500 shadow-lg shadow-violet-500/10'
                    : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{module.icon}</span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-400">
                    {module.number}
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-1">{module.name}</h3>
                <p className="text-xs text-gray-500 font-mono mb-2">{module.path}</p>
                <p className="text-sm text-gray-400 line-clamp-2">{module.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Code Viewer */}
        {selectedModule && (
          <section className="mb-12">
            <div className="rounded-2xl bg-gray-900 border border-gray-700 overflow-hidden">
              {/* Code Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{selectedModule.icon}</span>
                  <div>
                    <h3 className="font-semibold text-white">{selectedModule.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">{selectedModule.path}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    getCategoryBadgeClass(selectedModule.category)
                  }`}>
                    {selectedModule.category}
                  </span>
                  <button
                    onClick={() => handleCopyCode(selectedModule.code)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {copied ? '✓ Copiado' : '📋 Copiar'}
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="px-6 py-3 border-b border-gray-800 bg-gray-900/50">
                <p className="text-sm text-gray-400">{selectedModule.description}</p>
              </div>

              {/* Code Block */}
              <div className="relative">
                <pre className="p-6 overflow-x-auto text-sm leading-relaxed max-h-[600px] overflow-y-auto">
                  <code className="text-gray-300 font-mono whitespace-pre">
                    {selectedModule.code}
                  </code>
                </pre>
              </div>
            </div>
          </section>
        )}

        {/* Architecture Diagram */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Diagrama de Flujo del Pipeline</h2>
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-8 overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Flow Diagram */}
              <div className="flex items-start gap-1">
                {/* Config */}
                <FlowBlock
                  icon="⚙️"
                  label="Config"
                  sublabel="project.json"
                  color="blue"
                />
                <FlowArrow />
                <FlowBlock icon="📝" label="Parser" sublabel="01" color="purple" />
                <FlowArrow />
                <FlowBlock icon="📜" label="Script" sublabel="02" color="purple" />
                <FlowArrow />
                <FlowBlock icon="🧠" label="LLM" sublabel="02b" color="purple" />
                <FlowArrow />
                <FlowBlock icon="✂️" label="Chunks" sublabel="03" color="purple" />
              </div>
              <div className="flex items-start gap-1 mt-4">
                <div className="w-24" />
                <FlowArrow />
                <FlowBlock icon="🔊" label="Audio" sublabel="04" color="green" />
                <FlowArrow />
                <div className="flex flex-col gap-2">
                  <div className="flex gap-1">
                    <FlowBlock icon="🎬" label="Flow" sublabel="05a" color="orange" />
                    <FlowArrow />
                    <FlowBlock icon="🖼️" label="Vibes" sublabel="05b" color="orange" />
                    <FlowArrow />
                    <FlowBlock icon="🎥" label="Blender" sublabel="05c" color="orange" />
                  </div>
                </div>
                <FlowArrow />
                <FlowBlock icon="🎛️" label="Mixing" sublabel="06" color="red" />
                <FlowArrow />
                <FlowBlock icon="🔗" label="Stitch" sublabel="07" color="red" />
                <FlowArrow />
                <FlowBlock icon="📦" label="PKG" sublabel="10" color="red" />
              </div>
            </div>

            {/* Legend */}
            <div className="mt-8 flex flex-wrap gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-blue-500"></span> Configuración
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-purple-500"></span> Contenido
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-500"></span> Audio
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-orange-500"></span> Visual
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-500"></span> Ensamblado
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-yellow-500"></span> Orquestador
              </span>
            </div>
          </div>
        </section>

        {/* File Structure */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Estructura del Proyecto</h2>
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
            <pre className="text-sm text-gray-400 font-mono leading-relaxed">
{`fábrica_universal/
├── config/
│   └── project.json              ← Configuración con placeholders
├── engines/
│   ├── 01_parser/
│   │   └── parser.py             ← Parser de prompts canónicos
│   ├── 02_script/
│   │   └── script_writer.py      ← Generador de guiones
│   ├── 02b_llm/
│   │   └── llm_engine.py         ← Motor LLM (Ollama)
│   ├── 03_chunking/
│   │   └── chunker.py            ← Fragmentación del guion
│   ├── 04_audio/
│   │   └── tts_engine.py         ← Generación de audio TTS
│   ├── 05a_flow/
│   │   └── flow_engine.py        ← Motor de flujo visual
│   ├── 05b_vibes/
│   │   └── vibes_engine.py       ← Generación de imágenes
│   ├── 05c_blender/
│   │   └── blender_engine.py     ← Composición de clips (FFmpeg)
│   ├── 06_mixing_v2/
│   │   └── mixing.py             ← Mezcla y post-procesamiento
│   ├── 07_stitcher/
│   │   └── stitcher.py           ← Concatenación final
│   └── 10_pkg/
│       └── packager.py           ← Empaquetado final
├── orchestrator.py               ← Orquestador central
├── input/
│   └── prompt.txt                ← Prompt canónico de entrada
└── output/
    └── {project_name}/
        ├── manifest.json
        ├── script.json
        ├── chunks_index.json
        ├── chunks/
        ├── audio/
        ├── images/
        ├── flow/
        ├── clips/
        ├── mixed_clips/
        ├── documental_final.mp4
        └── *_package_*.zip`}
            </pre>
          </div>
        </section>

        {/* Usage */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Uso</h2>
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">1. Preparar el prompt de entrada:</h4>
                <pre className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto">
{`# input/prompt.txt
PROJECT_NAME=mi_documental
TEMA=La historia del universo
IDIOMA=es
DURACION_TOTAL=120
LLM_MODEL=llama3
TTS_PROVIDER=edge-tts
VOICE_ID=es-MX-DaliaNeural
VISUAL_ENGINE=stable-diffusion
ESTILO_VISUAL=cinematic
SEED=42`}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">2. Ejecutar el orquestador:</h4>
                <pre className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto">
{`python orchestrator.py config/project.json input/prompt.txt`}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">3. O ejecutar motores individuales:</h4>
                <pre className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto">
{`python engines/01_parser/parser.py config/project.json input/prompt.txt
python engines/02_script/script_writer.py output/mi_documental
python engines/02b_llm/llm_engine.py output/mi_documental
# ... etc`}
                </pre>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>Fábrica Universal — Pipeline Modular de Generación Multimedia</p>
          <p className="mt-1">Diseñado con principio de <strong className="text-red-400">cero fallbacks silenciosos</strong></p>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ───

function FlowBlock({ icon, label, sublabel, color }: { icon: string; label: string; sublabel: string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'border-blue-500/50 bg-blue-900/20',
    purple: 'border-purple-500/50 bg-purple-900/20',
    green: 'border-green-500/50 bg-green-900/20',
    orange: 'border-orange-500/50 bg-orange-900/20',
    red: 'border-red-500/50 bg-red-900/20',
    yellow: 'border-yellow-500/50 bg-yellow-900/20',
  };

  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-lg border ${colorClasses[color] || colorClasses.purple}`}>
      <span className="text-lg">{icon}</span>
      <span className="text-xs font-medium text-white mt-1">{label}</span>
      <span className="text-[10px] text-gray-500">{sublabel}</span>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center text-gray-600 px-1">
      <span>→</span>
    </div>
  );
}

function getCategoryBadgeClass(category: string): string {
  const classes: Record<string, string> = {
    config: 'bg-blue-900/50 text-blue-300',
    content: 'bg-purple-900/50 text-purple-300',
    audio: 'bg-green-900/50 text-green-300',
    visual: 'bg-orange-900/50 text-orange-300',
    assembly: 'bg-red-900/50 text-red-300',
    orchestration: 'bg-yellow-900/50 text-yellow-300',
  };
  return classes[category] || 'bg-gray-700 text-gray-300';
}

export default App;
