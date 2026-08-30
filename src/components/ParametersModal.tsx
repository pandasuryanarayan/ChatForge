import React, { useState } from 'react';
import { Sliders, Sparkles, BookOpen, RotateCcw, X, Check } from 'lucide-react';
import { DEFAULT_SYSTEM_PROMPTS } from '../constants/providers';

interface ParametersModalProps {
  isOpen: boolean;
  onClose: () => void;
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompt: string;
  onSaveParameters: (params: {
    temperature: number;
    maxTokens: number;
    topP: number;
    systemPrompt: string;
  }) => void;
}

export const ParametersModal: React.FC<ParametersModalProps> = ({
  isOpen,
  onClose,
  temperature,
  maxTokens,
  topP,
  systemPrompt,
  onSaveParameters,
}) => {
  const [temp, setTemp] = useState(temperature);
  const [maxT, setMaxT] = useState(maxTokens);
  const [tp, setTp] = useState(topP);
  const [prompt, setPrompt] = useState(systemPrompt);

  if (!isOpen) return null;

  const handleApply = () => {
    onSaveParameters({
      temperature: temp,
      maxTokens: maxT,
      topP: tp,
      systemPrompt: prompt,
    });
    onClose();
  };

  const handleReset = () => {
    setTemp(0.7);
    setMaxT(4096);
    setTp(1.0);
    setPrompt(DEFAULT_SYSTEM_PROMPTS[0].prompt);
  };

  const handleSelectPreset = (pText: string) => {
    setPrompt(pText);
  };

  return (
    <div
      id="parameters-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn selection:bg-blue-500/30"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="parameters-modal-container"
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Inference Parameters</h2>
              <p className="text-xs text-zinc-400">Configure generation behavior & system directives</p>
            </div>
          </div>
          <button
            id="close-parameters-modal-btn"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* System Prompt Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>System Instructions</span>
              </label>
            </div>

            {/* Quick Preset Pills */}
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_SYSTEM_PROMPTS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  id={`preset-${preset.id}`}
                  onClick={() => handleSelectPreset(preset.prompt)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                    prompt === preset.prompt
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-medium'
                      : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  {preset.title}
                </button>
              ))}
            </div>

            <textarea
              id="system-prompt-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="Provide role and instructions for the AI..."
              className="w-full p-3.5 bg-zinc-950 border border-zinc-750 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition resize-y font-mono leading-relaxed"
            />
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2 p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-zinc-200">Temperature</span>
                <p className="text-xs text-zinc-400">Controls randomness (0.0 = deterministic, 1.0 = creative)</p>
              </div>
              <span className="text-sm font-mono text-blue-400 font-bold px-2 py-0.5 rounded bg-blue-500/10">
                {temp.toFixed(2)}
              </span>
            </div>
            <input
              id="temperature-slider"
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={temp}
              onChange={(e) => setTemp(parseFloat(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>0.0 (Precise / Code)</span>
              <span>0.7 (Balanced)</span>
              <span>1.5 (Creative)</span>
            </div>
          </div>

          {/* Max Tokens Slider */}
          <div className="space-y-2 p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-zinc-200">Max Tokens</span>
                <p className="text-xs text-zinc-400">Maximum length of the generated response</p>
              </div>
              <span className="text-sm font-mono text-blue-400 font-bold px-2 py-0.5 rounded bg-blue-500/10">
                {maxT.toLocaleString()}
              </span>
            </div>
            <input
              id="max-tokens-slider"
              type="range"
              min="256"
              max="16384"
              step="256"
              value={maxT}
              onChange={(e) => setMaxT(parseInt(e.target.value, 10))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>256</span>
              <span>4,096</span>
              <span>16,384</span>
            </div>
          </div>

          {/* Top-P Slider */}
          <div className="space-y-2 p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-zinc-200">Top-P (Nucleus Sampling)</span>
                <p className="text-xs text-zinc-400">Alternative to temperature for controlling diversity</p>
              </div>
              <span className="text-sm font-mono text-blue-400 font-bold px-2 py-0.5 rounded bg-blue-500/10">
                {tp.toFixed(2)}
              </span>
            </div>
            <input
              id="top-p-slider"
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={tp}
              onChange={(e) => setTp(parseFloat(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-950/60">
          <button
            id="reset-parameters-btn"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              id="save-parameters-btn"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-600/20 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply Parameters</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
