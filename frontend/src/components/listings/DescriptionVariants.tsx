import { useState } from 'react';
import { Copy, Check, Sparkles } from 'lucide-react';
import type { ListingDescription } from '../../types';

interface DescriptionVariantsProps {
  descriptions: ListingDescription[];
  onSelect: (descriptionId: string) => Promise<void>;
  isGenerating?: boolean;
}

export default function DescriptionVariants({
  descriptions,
  onSelect,
  isGenerating = false
}: DescriptionVariantsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleSelect = async (id: string) => {
    setSelectingId(id);
    try {
      await onSelect(id);
    } finally {
      setSelectingId(null);
    }
  };

  const getVariantLabel = (type: string) => {
    switch (type) {
      case 'formal':
        return { label: 'Formal', subtitle: 'For listing portals (OLX, Rumah123)' };
      case 'casual_1':
        return { label: 'Casual #1', subtitle: 'For Instagram feed post' };
      case 'casual_2':
        return { label: 'Casual #2', subtitle: 'For Instagram story / WhatsApp status' };
      default:
        return { label: type, subtitle: '' };
    }
  };

  if (isGenerating) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Sparkles className="w-12 h-12 text-primary-500 animate-pulse mx-auto mb-4" />
            <p className="text-lg font-medium text-text-primary dark:text-text-primary-dark">Generating descriptions...</p>
            <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-2">AI is creating 3 description variants for you</p>
          </div>
        </div>
      </div>
    );
  }

  if (descriptions.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 text-text-tertiary dark:text-text-tertiary-dark mx-auto mb-4" />
          <p className="text-text-secondary dark:text-text-secondary-dark">No descriptions generated yet</p>
          <p className="text-sm text-text-tertiary dark:text-text-tertiary-dark mt-2">Click "Generate Descriptions" to create AI-powered descriptions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {descriptions.map((desc) => {
        const { label, subtitle } = getVariantLabel(desc.variant_type);
        const isCopied = copiedId === desc.id;
        const isSelecting = selectingId === desc.id;

        return (
          <div
            key={desc.id}
            className={`card ${desc.is_selected ? 'ring-2 ring-primary-500 dark:ring-primary-400' : ''}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-text-primary dark:text-text-primary-dark">{label}</h4>
                  {desc.is_selected && (
                    <span className="badge badge-success text-xs">Selected</span>
                  )}
                </div>
                <p className="text-sm text-text-secondary dark:text-text-secondary-dark">{subtitle}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(desc.description_text, desc.id)}
                  className="p-2 text-text-tertiary dark:text-text-tertiary-dark hover:text-primary-600 dark:hover:text-primary-400 hover:bg-accent dark:hover:bg-accent-dark rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  {isCopied ? (
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-accent/50 dark:bg-accent-dark/50 rounded-lg p-4 mb-3">
              <p className="text-text-primary dark:text-text-primary-dark whitespace-pre-wrap">{desc.description_text}</p>
            </div>

            {!desc.is_selected && (
              <button
                onClick={() => handleSelect(desc.id)}
                disabled={isSelecting}
                className="btn btn-secondary w-full"
              >
                {isSelecting ? 'Selecting...' : 'Select This Variant'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}