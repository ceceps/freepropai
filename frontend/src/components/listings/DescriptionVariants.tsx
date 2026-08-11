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
  isGenerating = false,
}: DescriptionVariantsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('formal');

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
        return { label: 'Formal', subtitle: 'Hook → Problem → Solution → CTA · Listing portals (OLX, Rumah123)', icon: '🏢' };
      case 'casual_1':
        return { label: 'PAS', subtitle: 'Problem → Agitate → Solution → CTA · Instagram feed post', icon: '📱' };
      case 'casual_2':
        return { label: 'Short', subtitle: 'Hook → Problem → Solution → CTA · Instagram story / WhatsApp', icon: '💬' };
      default:
        return { label: type, subtitle: '', icon: '📝' };
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

  const tabs = descriptions.map(d => d.variant_type);
  const activeDesc = descriptions.find(d => d.variant_type === activeTab) || descriptions[0];
  const activeInfo = getVariantLabel(activeDesc.variant_type);
  const isCopied = copiedId === activeDesc.id;
  const isSelecting = selectingId === activeDesc.id;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-secondary-100 dark:bg-secondary-800 rounded-xl">
        {tabs.map((type) => {
          const info = getVariantLabel(type);
          const isActive = type === activeTab;
          const desc = descriptions.find(d => d.variant_type === type);
          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-start gap-2 ${isActive
                  ? 'bg-white dark:bg-secondary-700 shadow-sm text-primary-600 dark:text-primary-400'
                  : 'text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary'
                }`}
            >
              <span>{info.icon}</span>
              <span className="text-xs font-semibold">{info.label}</span>
              {desc?.is_selected && (
                <span className="badge badge-success text-xs">Selected</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      <div className="card p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold text-text-primary dark:text-text-primary-dark flex items-center gap-2">
              <span>{activeInfo.icon}</span>
              {activeInfo.label}
            </h4>
            <p className="text-sm text-text-tertiary dark:text-text-tertiary-dark mt-0.5">{activeInfo.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleCopy(activeDesc.description_text, activeDesc.id)}
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
        <div className="bg-secondary-50 dark:bg-secondary-800 rounded-lg p-4 mb-3">
          <p className="text-text-primary dark:text-text-primary-dark whitespace-pre-wrap leading-relaxed">
            {activeDesc.description_text}
          </p>
        </div>
        {!activeDesc.is_selected && (
          <button
            onClick={() => handleSelect(activeDesc.id)}
            disabled={isSelecting}
            className="btn btn-primary w-full"
          >
            {isSelecting ? 'Selecting...' : 'Select This Variant'}
          </button>
        )}
        {activeDesc.is_selected && (
          <div className="badge badge-success text-sm py-2">✓ This description is currently selected</div>
        )}
      </div>
    </div>
  );
}
