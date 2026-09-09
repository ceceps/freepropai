import { useState } from 'react';
import { Sparkles, Users, Target, Share2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { listingApi } from '../../services/api';
import type { ListingWithDetails, ListingAnalysis as ListingAnalysisType } from '../../types';

interface ListingAnalysisProps {
  listing: ListingWithDetails;
}

export default function ListingAnalysis({ listing }: ListingAnalysisProps) {
  const [analysis, setAnalysis] = useState<ListingAnalysisType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAnalysis = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      const response = await listingApi.generateAnalysis(listing.id);
      if (response.success && response.data) {
        setAnalysis(response.data);
      } else {
        setError(response.error || 'Gagal membuat analisa listing');
      }
    } catch (err: any) {
      console.error('Failed to generate listing analysis:', err);
      setError(err.response?.data?.error || 'Gagal membuat analisa listing');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-gradient-to-br from-primary-50 via-surface to-amber-50 dark:from-primary-950/20 dark:via-surface dark:to-amber-950/20 border border-primary-100 dark:border-primary-900/30 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary-600 dark:bg-primary-500 text-white shadow-md shadow-primary-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-text-primary">Analisa Properti AI</h3>
            <p className="text-sm text-text-secondary mt-1">
              Analisis cerdas berdasarkan deskripsi, harga (Rp {listing.price.toLocaleString('id-ID')}), dan selling point untuk menentukan Buyer Persona, Target Pasar, serta Saluran Pemasaran terbaik.
            </p>
          </div>
        </div>
        <button
          onClick={handleGenerateAnalysis}
          disabled={isGenerating}
          className="btn btn-primary flex items-center justify-center gap-2 flex-shrink-0 shadow-md"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Menganalisis...' : analysis ? 'Analisis Ulang' : 'Mulai Analisis AI'}</span>
        </button>
      </div>

      {error && (
        <div className="card p-4 border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!analysis && !isGenerating && !error && (
        <div className="card p-12 text-center border-dashed border-2">
          <Target className="w-16 h-16 text-primary-400 mx-auto mb-4 animate-bounce" />
          <h4 className="text-lg font-semibold text-text-primary mb-2">Belum Ada Analisis Properti</h4>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
            Klik tombol &quot;Mulai Analisis AI&quot; di atas untuk menguraikan Buyer Persona, Segmentasi Pasar, dan Strategi Channel Pemasaran yang paling efektif untuk properti ini.
          </p>
          <button
            onClick={handleGenerateAnalysis}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Mulai Analisis AI
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isGenerating && (
        <div className="space-y-6 animate-pulse">
          <div className="h-48 bg-grey-100 dark:bg-grey-800 rounded-2xl" />
          <div className="h-48 bg-grey-100 dark:bg-grey-800 rounded-2xl" />
          <div className="h-48 bg-grey-100 dark:bg-grey-800 rounded-2xl" />
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !isGenerating && (
        <div className="space-y-8 animate-fade-in">
          {/* Section 1: Buyer Persona */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
              <Users className="w-5 h-5" />
              <h4 className="text-lg font-bold text-text-primary">Buyer Persona (Profil Pembeli)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {analysis.buyerPersonas.map((persona, idx) => (
                <div key={idx} className="card p-6 border-border hover:border-primary-300 transition-colors space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 font-bold flex items-center justify-center text-sm">
                      {idx + 1}
                    </span>
                    <h5 className="font-bold text-text-primary text-base">{persona.name}</h5>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{persona.description}</p>
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Karakteristik Utama</p>
                    <div className="flex flex-wrap gap-1.5">
                      {persona.characteristics.map((char, cIdx) => (
                        <span key={cIdx} className="px-2.5 py-1 bg-surface border border-border text-text-secondary text-xs rounded-lg font-medium">
                          {char}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Target Market */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Target className="w-5 h-5" />
              <h4 className="text-lg font-bold text-text-primary">Target Market (Segmentasi Pasar)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {analysis.targetMarket.map((target, idx) => (
                <div key={idx} className="card p-6 bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30 space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    <span>{target.segment}</span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed pt-2 border-t border-amber-200/60 dark:border-amber-900/30">
                    {target.profile}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Marketing Channels */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Share2 className="w-5 h-5" />
              <h4 className="text-lg font-bold text-text-primary">Saluran Pemasaran (Marketing Channels & Taktik)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analysis.marketingChannels.map((channel, idx) => (
                <div key={idx} className="card p-6 border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-text-primary text-base flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      {channel.channel}
                    </h5>
                    <span className="badge badge-primary text-xs">Channel #{idx + 1}</span>
                  </div>
                  <p className="text-sm text-text-secondary italic bg-grey-50 dark:bg-grey-900/40 p-3 rounded-lg border border-border">
                    &quot;{channel.reasoning}&quot;
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Taktik Eksekusi</p>
                    <ul className="space-y-1.5">
                      {channel.tactics.map((tactic, tIdx) => (
                        <li key={tIdx} className="text-sm text-text-secondary flex items-start gap-2">
                          <span className="text-indigo-500 font-bold">•</span>
                          <span>{tactic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}