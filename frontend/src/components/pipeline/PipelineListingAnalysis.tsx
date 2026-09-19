import { Sparkles, Users, Target, Share2, CheckCircle2, Database } from 'lucide-react';
import { parsePipelineAnalysis } from '../../utils/pipelineAnalysis';
import { formatCompactIDR } from '../../utils/format';
import type { PipelineAnalysis } from '../../types';

interface PipelineListingAnalysisProps {
  analysis: Pick<
    PipelineAnalysis,
    'buyerPersona' | 'sellingPoints' | 'fullAnalysisMarkdown' | 'listingTitle' | 'listingPrice'
  >;
  showHeader?: boolean;
}

export default function PipelineListingAnalysis({ analysis, showHeader = true }: PipelineListingAnalysisProps) {
  const parsed = parsePipelineAnalysis(analysis);
  const hasContent = parsed.buyerPersonas.length || parsed.sellingPoints.length || parsed.insights.length;

  if (!hasContent) return null;

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-gradient-to-br from-primary-50 via-surface to-amber-50 dark:from-primary-950/20 dark:via-surface dark:to-amber-950/20 border border-primary-100 dark:border-primary-900/30 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary-600 dark:bg-primary-500 text-white shadow-md shadow-primary-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-text-primary">Analisa Properti AI</h3>
              <p className="text-sm text-text-secondary mt-1">
                Analisis cerdas berdasarkan deskripsi, harga
                {analysis.listingPrice != null ? ` (${formatCompactIDR(analysis.listingPrice)})` : ''}, dan selling
                point untuk menentukan Buyer Persona, Target Pasar, serta strategi pemasaran terbaik.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30 px-4 py-2 rounded-lg border border-primary-100 dark:border-primary-900/30">
        <Database className="w-4 h-4" />
        <span>Analisis tersimpan di database</span>
      </div>

      {parsed.disclaimer && (
        <p className="text-xs text-text-tertiary leading-relaxed px-1">{parsed.disclaimer}</p>
      )}

      <div className="space-y-8 animate-fade-in">
        {parsed.buyerPersonas.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
              <Users className="w-5 h-5" />
              <h4 className="text-lg font-bold text-text-primary">Buyer Persona (Profil Pembeli)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {parsed.buyerPersonas.map((persona, idx) => (
                <div key={`${persona.name}-${idx}`} className="card p-6 border-border hover:border-primary-300 transition-colors space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 font-bold flex items-center justify-center text-sm">
                      {idx + 1}
                    </span>
                    <h5 className="font-bold text-text-primary text-base">{persona.name}</h5>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{persona.description}</p>
                  {persona.characteristics.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Karakteristik Utama</p>
                      <div className="flex flex-wrap gap-1.5">
                        {persona.characteristics.map((char) => (
                          <span
                            key={char}
                            className="px-2.5 py-1 bg-surface border border-border text-text-secondary text-xs rounded-lg font-medium"
                          >
                            {char}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {parsed.sellingPoints.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Target className="w-5 h-5" />
              <h4 className="text-lg font-bold text-text-primary">Selling Points (Poin Penjualan)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {parsed.sellingPoints.map((point, idx) => (
                <div
                  key={`${point.segment}-${idx}`}
                  className="card p-6 bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30 space-y-2"
                >
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>{point.segment}</span>
                  </div>
                  {point.profile && point.profile !== point.segment && (
                    <p className="text-sm text-text-secondary leading-relaxed pt-2 border-t border-amber-200/60 dark:border-amber-900/30">
                      {point.profile}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {parsed.insights.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Share2 className="w-5 h-5" />
              <h4 className="text-lg font-bold text-text-primary">Ringkasan & Strategi</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {parsed.insights.map((insight, idx) => (
                <div key={`${insight.channel}-${idx}`} className="card p-6 border-border space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h5 className="font-bold text-text-primary text-base flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 flex-shrink-0" />
                      {insight.channel}
                    </h5>
                    <span className="badge badge-primary text-xs">Insight #{idx + 1}</span>
                  </div>
                  {insight.reasoning && (
                    <p className="text-sm text-text-secondary italic bg-grey-50 dark:bg-grey-900/40 p-3 rounded-lg border border-border">
                      &quot;{insight.reasoning}&quot;
                    </p>
                  )}
                  {insight.tactics.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Poin Eksekusi</p>
                      <ul className="space-y-1.5">
                        {insight.tactics.map((tactic) => (
                          <li key={tactic} className="text-sm text-text-secondary flex items-start gap-2">
                            <span className="text-indigo-500 font-bold">•</span>
                            <span>{tactic}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
