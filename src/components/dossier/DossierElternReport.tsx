import React, { useMemo, useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { generateParentDiagnosticSummary } from '../../services/aiService';
import { Loader2, Sparkles } from 'lucide-react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { Download, Printer, Info, CheckCircle2, AlertCircle } from 'lucide-react';

interface DossierElternReportProps {
  student: Student;
  onStartPresentation?: () => void;
}

export default function DossierElternReport({ student, onStartPresentation }: DossierElternReportProps) {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportStyle, setReportStyle] = useState('Aufbauend & Motivierend');

  useEffect(() => {
    const cached = localStorage.getItem(`ai_parent_report_${student.id}`);
    if (cached) setAiSummary(cached);
  }, [student.id]);

  const handleGenerateAISummary = async () => {
    setIsGenerating(true);
    const dataStr = diagnosenErhebungen.map(e => {
      const test = app.diagnostikTests?.find(t => t.id === e.testId);
      let t = `- Test "${test?.name || 'Unbekannt'}" am ${e.datum}:
  Ergebnis: ${e.ergebniswert} (${e.foerderbedarfErkannt ? 'Fokusbedarf erkannt' : 'Gut gemeistert'})`;
      if (e.meta) {
        if (e.meta.type === 'lesen') t += `\n  Lese-Facts: ${e.meta.rgw} WPM, Genauigkeit: ${e.meta.accuracy}%`;
        if (e.meta.type === 'kopf') t += `\n  Rechen-Facts: Automatisiert: ${e.meta.automated}/10, Strategisch gerechnet: ${e.meta.calculated}/10, Zehnerübertrag-Fehler: ${e.meta.carryErrors || 0}, Richtigkeit: ${e.meta.correctPercent}%`;
        if (e.meta.type === 'sprache_grammatik') t += `\n  Sprach-Facts: Erfolgsquote: ${e.meta.percentage}%`;
      }
      if (e.kommentar) t += `\n  Kommentar der Lehrperson: ${e.kommentar}`;
      return t;
    }).join('\n\n');

    const res = await generateParentDiagnosticSummary(student.vorname, dataStr || 'Leider sind noch keine Tests im System.', reportStyle);
    if (res) {
      setAiSummary(res);
      localStorage.setItem(`ai_parent_report_${student.id}`, res);
    }
    setIsGenerating(false);
  };
  const { app } = useApp();

  const diagnosenErhebungen = useMemo(() => (app.diagnostikErhebungen || [])
    .filter(e => e.schuelerId === student.id)
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || '')), [app.diagnostikErhebungen, student.id]);

  const foerderbedarfe = diagnosenErhebungen.filter(e => e.foerderbedarfErkannt);
  const meisterungen = diagnosenErhebungen.filter(e => !e.foerderbedarfErkannt);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex justify-between items-start print:hidden">
        <div>
          <h2 className="text-[1.875rem] leading-tight font-black text-slate-900 tracking-tight">KEL-Präsentation & Druckbarer Eltern-Report</h2>
          <p className="text-[0.875rem] leading-snug font-bold text-slate-500 mt-2 uppercase tracking-widest pl-1">Gesprächsgrundlage & Feedback-Blatt zusammengefasst</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={reportStyle} 
            onChange={e => setReportStyle(e.target.value)}
            className="hidden sm:block border-slate-200 rounded-xl px-3 h-12 text-[0.875rem] leading-snug font-bold bg-white text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="Aufbauend & Motivierend">Aufbauend & Motivierend</option>
            <option value="Sachlich & Kurz">Sachlich & Kurz</option>
            <option value="Sehr formell">Sehr formell</option>
          </select>
          <button
            onClick={handleGenerateAISummary}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-2xl font-black transition-all active:scale-95 shadow-md disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            <span className="hidden sm:inline">KI-Bericht generieren</span>
          </button>
        </div>
      </div>

      {/* The Printable Page */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-10 sm:p-16 print:border-none print:shadow-none print:p-0">
        
        {/* Header */}
        <div className="border-b-4 border-slate-900 pb-8 mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-3">Lernstandsbericht</h1>
            <p className="text-[1.25rem] leading-normal font-bold text-slate-500">{student.vorname} {student.nachname}</p>
          </div>
          <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-slate-900 flex items-center justify-center text-4xl font-black text-slate-300">
            {student.foto ? (
               <img src={student.foto} alt="" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
               <>{student.vorname.charAt(0)}{student.nachname.charAt(0)}</>
            )}
          </div>
        </div>

        
        {/* Intro */}
        <p className="text-[1.125rem] leading-normal text-slate-700 leading-relaxed font-sans mb-10">
          Liebe Eltern von {student.vorname},<br/><br/>
          in den vergangenen Wochen haben wir im Unterricht verschiedene Beobachtungen und kurze Diagnostik-Checks durchgeführt. 
          Dieses Feedback-Blatt fasst die wichtigsten Erkenntnisse zusammen, um Ihnen einen transparenten Überblick über den aktuellen Lernstand zu geben.
        </p>

        {isGenerating && (
          <div className="mb-12 bg-purple-50/30 p-8 sm:p-10 rounded-[2.5rem] border border-purple-100/50 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
              <Loader2 size={40} className="text-purple-600 animate-spin relative z-10" />
            </div>
            <p className="text-[0.875rem] font-black uppercase tracking-widest text-purple-600 animate-pulse text-center">KI schreibt individuellen Elternbericht...</p>
            <p className="text-[0.75rem] text-purple-400 mt-2 text-center max-w-sm">Dafür werden alle Diagnostik-Einträge, Tests und Kompetenzbereiche analysiert.</p>
          </div>
        )}

        {aiSummary && !isGenerating && (
          <div className="mb-12 bg-purple-50/50 p-8 sm:p-10 rounded-[2.5rem] border border-purple-100 shadow-sm relative ">
            <div className="absolute top-0 right-0 p-6 text-6xl opacity-5 print:hidden">✨</div>
            <div className="markdown-body prose prose-slate prose-sm sm:prose-base max-w-none text-slate-800 font-sans leading-relaxed">
              <Markdown>{aiSummary}</Markdown>
            </div>
            <div className="mt-8 flex justify-end print:hidden">
              <button 
                onClick={() => {
                  setAiSummary(null);
                  localStorage.removeItem(`ai_parent_report_${student.id}`);
                }}
                className="text-[0.625rem] uppercase font-black tracking-widest text-slate-400 hover:text-rose-500 transition-colors"
               >
                Bericht verwerfen
              </button>
            </div>
          </div>
        )}

        {!aiSummary && !isGenerating && (
          <>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
          {/* Stärken */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-emerald-500 pb-2">
              <CheckCircle2 className="text-emerald-500" size={28} />
              <h3 className="text-[1.5rem] leading-normal font-black text-slate-900">Stärken & Kompetenzen</h3>
            </div>
            {meisterungen.length > 0 ? (
              <ul className="space-y-4">
                {meisterungen.map(m => {
                    const test = app.diagnostikTests?.find(t => t.id === m.testId);
                    return (
                      <li key={m.id} className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                        <strong className="block text-emerald-800 text-[1.125rem] leading-normal mb-1">{test?.name || 'Sicher gemeistert'}</strong>
                        <span className="text-[0.875rem] leading-snug text-slate-700 leading-snug block font-sans">{m.kommentar}</span>
                      </li>
                    );
                })}
              </ul>
            ) : (
              <p className="text-slate-500 italic pb-5">Derzeit keine sicheren Ergebnisse dokumentiert.</p>
            )}
          </div>

          {/* Fokusbereiche */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-amber-500 pb-2">
              <AlertCircle className="text-amber-500" size={28} />
              <h3 className="text-[1.5rem] leading-normal font-black text-slate-900">Aktuelle Fokusbereiche</h3>
            </div>
            {foerderbedarfe.length > 0 ? (
              <ul className="space-y-4">
                {foerderbedarfe.map(f => {
                    const test = app.diagnostikTests?.find(t => t.id === f.testId);
                    return (
                      <li key={f.id} className="bg-amber-50/30 p-4 rounded-2xl border border-amber-100">
                        <strong className="block text-amber-800 text-[1.125rem] leading-normal mb-1">{test?.name || 'Übungsbedarf festgestellt'}</strong>
                        <span className="text-[0.875rem] leading-snug text-slate-700 leading-snug block font-sans">{f.kommentar}</span>
                      </li>
                    );
                })}
              </ul>
            ) : (
              <div className="bg-emerald-50 p-6 rounded-2xl text-emerald-800 font-bold border border-emerald-200">
                🎉 Aktuell wurden in den Tests keine kritischen Lücken festgestellt! {student.vorname} ist im Stoff sehr gut dabei.
              </div>
            )}
          </div>

        </div>

        {/* Der Tipp für zu Hause */}
        <div className="mt-12 bg-indigo-50 border-2 border-indigo-100 rounded-[2rem] p-8 relative ">
          <div className="absolute top-0 right-0 p-6 text-6xl opacity-10">💡</div>
          <h3 className="text-[1.25rem] leading-normal font-black text-indigo-900 mb-4 tracking-tight uppercase">Ein konkreter Tipp für zu Hause</h3>
          <p className="text-slate-700 text-[1.125rem] leading-normal leading-relaxed font-sans z-10 relative">
            {foerderbedarfe.length > 0 
              ? `Da ${student.vorname} in den aktuellen Fokusbereichen intensiv lernt, hilft es besonders, wenn Sie kleine Lernerfolge im Alltag loben und z.B. bei der Hausübung den Fokus auf den erkannten Förderbedarf (${app.diagnostikTests?.find(t => t.id === foerderbedarfe[0].testId)?.name || 'Aktuelles Thema'}) legen. Kurze, regelmäßige Einheiten (5-10 Minuten) sind effektiver als langes Üben.`
              : `${student.vorname} arbeitet derzeit sehr solide. Fördern Sie weiterhin die Neugier, indem Sie gemeinsames Lesen in den Alltag einbauen oder spielerische Rätsel lösen lassen, um die Motivation hoch zu halten!`}
          </p>
        </div>

        
          </>
        )}
        {/* Footer Signatures */}

        <div className="mt-16 flex justify-between items-end border-t border-slate-200 pt-8 print:mt-12">
          <div className="text-center font-sans">
            <div className="w-48 border-b-2 border-slate-400 mb-2"></div>
            <span className="text-[0.75rem] leading-tight font-bold text-slate-500 uppercase tracking-widest">Ort, Datum</span>
          </div>
          <div className="text-center font-sans">
            <div className="w-48 border-b-2 border-slate-400 mb-2"></div>
            <span className="text-[0.75rem] leading-tight font-bold text-slate-500 uppercase tracking-widest">Unterschrift Lehrperson</span>
          </div>
        </div>

      </div>
    </div>
  );
}
