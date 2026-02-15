import { useRef, useState, useEffect, useId } from 'react';
import SignatureCanvas from 'react-signature-canvas';

export interface SignatureMetadata {
  timestamp: string;
  signerRole: string;
  method: 'draw' | 'type';
}

interface SignaturePadProps {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
  signerRole?: string;
  onMetadataChange?: (meta: SignatureMetadata) => void;
  metadata?: SignatureMetadata | null;
  error?: string;
  disabled?: boolean;
}

export function SignaturePad({ label, value, onChange, signerRole = '', onMetadataChange, metadata, error, disabled }: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(!value);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<'draw' | 'type'>(metadata?.method || 'draw');
  const [typedName, setTypedName] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [strokeHistory, setStrokeHistory] = useState<any[][]>([]);
  const id = useId();
  const errorId = `${id}-error`;

  // Restore typed name from value if it was a typed signature
  useEffect(() => {
    if (metadata?.method === 'type' && value) {
      setMode('type');
    }
  }, []);

  const emitMetadata = (method: 'draw' | 'type') => {
    if (onMetadataChange) {
      onMetadataChange({
        timestamp: new Date().toISOString(),
        signerRole,
        method,
      });
    }
  };

  const handleEnd = () => {
    if (sigRef.current) {
      const dataUrl = sigRef.current.toDataURL('image/png');
      onChange(dataUrl);
      setIsEmpty(false);
      setIsDrawing(true);
      // Capture stroke data for undo
      const strokes = sigRef.current.toData();
      setStrokeHistory([...strokes]);
      emitMetadata('draw');
    }
  };

  const handleClear = () => {
    if (mode === 'draw' && sigRef.current) {
      sigRef.current.clear();
    }
    setTypedName('');
    setStrokeHistory([]);
    onChange('');
    setIsEmpty(true);
    setIsDrawing(false);
    if (onMetadataChange) {
      onMetadataChange({ timestamp: '', signerRole: '', method: mode });
    }
  };

  const handleUndo = () => {
    if (!sigRef.current || strokeHistory.length === 0) return;
    const newStrokes = strokeHistory.slice(0, -1);
    sigRef.current.clear();
    if (newStrokes.length > 0) {
      sigRef.current.fromData(newStrokes);
      const dataUrl = sigRef.current.toDataURL('image/png');
      onChange(dataUrl);
      setStrokeHistory(newStrokes);
    } else {
      onChange('');
      setIsEmpty(true);
      setStrokeHistory([]);
    }
  };

  const handleTypedSign = (name: string) => {
    setTypedName(name);
    if (name.trim()) {
      // Generate a data URL from the typed name using canvas
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'italic 36px "Georgia", "Times New Roman", serif';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, canvas.width / 2, canvas.height / 2);
        const dataUrl = canvas.toDataURL('image/png');
        onChange(dataUrl);
        setIsEmpty(false);
        emitMetadata('type');
      }
    } else {
      onChange('');
      setIsEmpty(true);
    }
  };

  const switchMode = (newMode: 'draw' | 'type') => {
    handleClear();
    setStrokeHistory([]);
    setMode(newMode);
  };

  if (disabled) {
    return (
      <div className="space-y-2 opacity-50" role="group" aria-labelledby={id}>
        <label id={id} className="block text-sm font-medium text-gray-700 dark:text-slate-300">{label}</label>
        <div
          className="border-2 border-gray-200 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700 h-[160px] sm:h-[200px] flex items-center justify-center"
          aria-disabled="true"
        >
          <span className="text-gray-500 dark:text-slate-400 text-sm">Complete acknowledgments above to sign</span>
        </div>
        {error && <p id={errorId} role="alert" className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2" role="group" aria-labelledby={id}>
      <div className="flex items-center justify-between">
        <label id={id} className="block text-sm font-medium text-gray-700 dark:text-slate-300">{label}</label>
        <div className="flex gap-1" role="group" aria-label="Signature input method">
          <button
            type="button"
            onClick={() => switchMode('draw')}
            aria-pressed={mode === 'draw'}
            className={`px-3 py-1 text-xs font-medium rounded-l-lg border transition-colors min-h-[36px] cursor-pointer ${
              mode === 'draw'
                ? 'bg-amber-100 text-amber-700 border-amber-400'
                : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            Draw
          </button>
          <button
            type="button"
            onClick={() => switchMode('type')}
            aria-pressed={mode === 'type'}
            className={`px-3 py-1 text-xs font-medium rounded-r-lg border transition-colors min-h-[36px] cursor-pointer ${
              mode === 'type'
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-400 dark:border-amber-600'
                : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            Type
          </button>
        </div>
      </div>

      {mode === 'draw' ? (
        <div
          className={`border-2 rounded-lg overflow-hidden bg-white relative ${error ? 'border-red-400' : 'border-gray-300 dark:border-slate-600'}`}
          aria-label={`Draw signature area for ${label}. Use the Type tab for keyboard-accessible signing.`}
          role="img"
        >
          {!value && !isDrawing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" aria-hidden="true">
              <span className="text-gray-500 dark:text-slate-400 text-sm">Sign here</span>
              <span className="text-gray-400 dark:text-slate-500 text-xs mt-1">Keyboard users: use Type tab above</span>
            </div>
          )}
          {/* Show saved signature image when loaded from storage (canvas doesn't restore data URLs) */}
          {value && !isDrawing ? (
            <div className="relative cursor-crosshair" onClick={() => setIsDrawing(true)}>
              <img src={value} alt={`Signature for ${label}`} className="w-full h-[160px] sm:h-[200px] object-contain" />
              <div className="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none">
                <span className="text-xs text-gray-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 rounded">Tap to re-sign</span>
              </div>
            </div>
          ) : (
            <SignatureCanvas
              ref={sigRef}
              penColor="black"
              canvasProps={{
                className: 'w-full h-[160px] sm:h-[200px] touch-none',
                'aria-label': `Draw your signature for ${label}`,
              }}
              onEnd={handleEnd}
            />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Show saved typed signature from storage */}
          {value && !typedName ? (
            <div className={`border-2 rounded-lg overflow-hidden bg-white relative ${error ? 'border-red-400' : 'border-gray-300 dark:border-slate-600'}`}>
              <img src={value} alt={`Typed signature for ${label}`} className="w-full h-[160px] sm:h-[200px] object-contain" />
              <div className="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none">
                <span className="text-xs text-gray-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 rounded">Type below to re-sign</span>
              </div>
            </div>
          ) : null}
          <input
            type="text"
            value={typedName}
            onChange={e => handleTypedSign(e.target.value)}
            placeholder={value && !typedName ? 'Type to replace current signature' : 'Type your full name'}
            aria-label={`Type your signature for ${label}`}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? errorId : undefined}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm min-h-[44px]
              focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-slate-800 dark:text-slate-100"
          />
          {typedName && (
            <div className="border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white h-[160px] sm:h-[200px] flex items-center justify-center" role="img" aria-label={`Signature preview: ${typedName}`}>
              <span className="text-3xl italic text-gray-800 dark:text-slate-200" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                {typedName}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {mode === 'draw' && strokeHistory.length > 0 && (
            <button
              type="button"
              onClick={handleUndo}
              aria-label={`Undo last stroke for ${label}`}
              className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors min-h-[44px]"
            >
              Undo stroke
            </button>
          )}
          <button
            type="button"
            onClick={handleClear}
            aria-label={`Clear signature for ${label}`}
            className="text-sm text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors min-h-[44px]"
          >
            Clear signature
          </button>
        </div>
        {metadata?.timestamp && (
          <span className="text-xs text-gray-500 dark:text-slate-400">
            Signed {new Date(metadata.timestamp).toLocaleString()}
            {metadata.signerRole && ` as ${metadata.signerRole}`}
          </span>
        )}
      </div>
      {error && <p id={errorId} role="alert" className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
