import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignaturePadProps {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
}

export function SignaturePad({ label, value, onChange }: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(!value);

  const handleEnd = () => {
    if (sigRef.current) {
      const dataUrl = sigRef.current.toDataURL('image/png');
      onChange(dataUrl);
      setIsEmpty(false);
    }
  };

  const handleClear = () => {
    if (sigRef.current) {
      sigRef.current.clear();
      onChange('');
      setIsEmpty(true);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white relative">
        {isEmpty && !value && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-300 text-sm">Sign here</span>
          </div>
        )}
        {value && !sigRef.current?.isEmpty() === false ? (
          <img src={value} alt="Signature" className="w-full h-[150px] object-contain" />
        ) : null}
        <SignatureCanvas
          ref={sigRef}
          penColor="black"
          canvasProps={{
            className: 'w-full h-[150px] touch-none',
          }}
          onEnd={handleEnd}
        />
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="text-sm text-gray-500 hover:text-red-600 transition-colors"
      >
        Clear signature
      </button>
    </div>
  );
}
