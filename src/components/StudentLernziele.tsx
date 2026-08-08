import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Target, Printer, Save, CheckCircle2, CheckSquare } from 'lucide-react';
import { LERNZIELE_BY_STUFE } from './LernzielTracker';

interface StudentLernzieleProps {
  schuelerId: string;
}

export default function StudentLernziele({ schuelerId }: StudentLernzieleProps) {
  const { app, setApp } = useApp();
  const student = app.schueler.find(s => s.id === schuelerId);

  // Try to determine initial class level from app.klassenbezeichnung (e.g. "4b" -> 4)
  const initialClassMatch = app.klassenbezeichnung?.match(/(\d)/);
  const initialClassLevel = initialClassMatch ? parseInt(initialClassMatch[1]) : 1;
  
  const [selectedStufe, setSelectedStufe] = useState<number>(Math.max(1, Math.min(4, initialClassLevel)));
  
  const [evaluationData, setEvaluationData] = useState<Record<string, number | null>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const currentLernziele = LERNZIELE_BY_STUFE[selectedStufe] || LERNZIELE_BY_STUFE[1];
  const FAECHER = Object.keys(currentLernziele);

  useEffect(() => {
    if (schuelerId) {
      try {
        const savedEval = localStorage.getItem(`student_lernziele_${schuelerId}`);
        if (savedEval) {
          setEvaluationData(JSON.parse(savedEval));
        } else {
          setEvaluationData({});
        }
      } catch (e) {
        console.error("Error loading lernziele details", e);
      }
    }
  }, [schuelerId]);

  if (!student) {
    return (
      <div className="p-8 text-center text-slate-400">
        Kein Student ausgewählt.
      </div>
    );
  }

  const handleSave = () => {
    setSaveStatus('saving');
    try {
      localStorage.setItem(`student_lernziele_${schuelerId}`, JSON.stringify(evaluationData));
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 500);
    } catch (e) {
      console.error(e);
      setSaveStatus('idle');
    }
  };

  const handleRatingChange = (zielId: string, rating: number | null) => {
    setEvaluationData(prev => ({
      ...prev,
      [zielId]: prev[zielId] === rating ? null : rating
    }));
  };

  const handlePrint = () => {
    localStorage.setItem(`student_lernziele_${schuelerId}`, JSON.stringify(evaluationData));
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Helper to get color styles based on rating
  const getRatingStyles = (ratingValue: number, currentLevel: number) => {
    if (ratingValue !== currentLevel) {
        if (currentLevel === 3) return 'border-slate-300 text-transparent hover:border-amber-400 hover:bg-amber-50 hover:shadow-[0_0_12px_rgba(251,191,36,0.2)] transition-all duration-300';
        if (currentLevel === 2) return 'border-slate-300 text-transparent hover:border-lime-500 hover:bg-lime-50 hover:shadow-[0_0_12px_rgba(132,204,22,0.2)] transition-all duration-300';
        if (currentLevel === 1) return 'border-slate-300 text-transparent hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all duration-300';
        return 'border-slate-300 text-transparent hover:border-slate-400 hover:bg-slate-50 transition-all duration-300';
    }
    if (currentLevel === 3) return 'border-amber-400 bg-amber-400 text-white shadow-[0_0_12px_rgba(251,191,36,0.3)] hover:bg-amber-300 hover:border-amber-300 hover:scale-110 transition-all duration-300'; // Minimal
    if (currentLevel === 2) return 'border-lime-500 bg-lime-500 text-white shadow-[0_0_12px_rgba(132,204,22,0.3)] hover:bg-lime-400 hover:border-lime-400 hover:scale-110 transition-all duration-300'; // Im Wesentlichen
    if (currentLevel === 1) return 'border-emerald-500 bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:bg-emerald-400 hover:border-emerald-400 hover:scale-110 transition-all duration-300'; // Erreicht
    return '';
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* HEADER AREA */}
      <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl space-y-6 text-slate-800 relative print:hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-2xl flex items-center justify-center shadow-sm">
              <Target size={26} />
            </div>
            <div>
              <h3 className="text-[1.875rem] leading-tight md:text-4xl font-black text-slate-900 tracking-tight">
                Lernziele
              </h3>
              <p className="text-[0.875rem] leading-snug font-black text-slate-500 uppercase tracking-widest mt-0.5">
                Lehrplanrelevante Ziele für {student.vorname}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex bg-slate-100 rounded-xl p-1 mr-2">
                {[1, 2, 3, 4].map(stufe => (
                    <button
                        key={stufe}
                        onClick={() => setSelectedStufe(stufe)}
                        className={`px-3 py-1.5 rounded-lg text-[0.75rem] font-black uppercase tracking-wider transition-all ${
                            selectedStufe === stufe 
                                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60' 
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {stufe}. Klasse
                    </button>
                ))}
            </div>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white border border-slate-900 shadow-md rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
            >
              <Printer size={15} /> Drucken
            </button>
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-900/10"
            >
              {saveStatus === 'saving' ? (
                <span>Sichern...</span>
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle2 size={15} /> Gesichert!
                </>
              ) : (
                <>
                  <Save size={15} /> Speichern
                </>
              )}
            </button>
          </div>
        </div>

        {/* MATRIX SECTION */}
        <div className="space-y-6 pt-4">
            {FAECHER.map(fach => {
                const ziele = currentLernziele[fach];
                if (!ziele || ziele.length === 0) return null;

                // Color themes based on Fach
                let themeBg = 'bg-slate-50 border-slate-200';
                let themeBadge = 'bg-slate-700 text-white border-slate-800';
                let headerText = 'text-slate-400';
                
                if (fach === 'Deutsch') { themeBg = 'bg-blue-50/50 border-blue-100/50'; themeBadge = 'bg-blue-600 border-blue-700'; headerText = 'text-blue-400/80'; }
                if (fach === 'Mathematik') { themeBg = 'bg-rose-50/50 border-rose-100/50'; themeBadge = 'bg-rose-600 border-rose-700'; headerText = 'text-rose-400/80'; }
                if (fach === 'Sachunterricht') { themeBg = 'bg-emerald-50/50 border-emerald-100/50'; themeBadge = 'bg-emerald-600 border-emerald-700'; headerText = 'text-emerald-400/80'; }
                if (fach === 'Englisch') { themeBg = 'bg-amber-50/50 border-amber-100/50'; themeBadge = 'bg-amber-500 border-amber-600'; headerText = 'text-amber-500/80'; }
                if (fach === 'Musik') { themeBg = 'bg-violet-50/50 border-violet-100/50'; themeBadge = 'bg-violet-500 border-violet-600'; headerText = 'text-violet-400/80'; }
                
                return (
                    <div key={fach} className={`p-6 rounded-3xl border shadow-sm transition duration-300 ${themeBg}`}>
                        <div className="flex items-center justify-between mb-4">
                            <span className={`text-[0.75rem] leading-tight font-black uppercase px-3 py-1 border rounded-lg tracking-widest shadow-sm ${themeBadge}`}>
                                {fach}
                            </span>
                            <div className="hidden sm:flex shrink-0">
                                <div className={`w-20 md:w-28 text-center font-black text-[0.625rem] uppercase tracking-wider leading-tight px-1 ${headerText}`}>Lernziel minimal<br/>erreicht</div>
                                <div className={`w-20 md:w-28 text-center font-black text-[0.625rem] uppercase tracking-wider leading-tight px-1 ${headerText}`}>Lernziel im Wesentl.<br/>erreicht</div>
                                <div className={`w-20 md:w-28 text-center font-black text-[0.625rem] uppercase tracking-wider leading-tight px-1 ${headerText}`}>Lernziel<br/>erreicht</div>
                            </div>
                        </div>

                        <ul className="space-y-1 divide-y divide-black/5">
                            {ziele.map(ziel => (
                                <li key={ziel.id} className="flex flex-col sm:flex-row justify-between sm:items-center py-3 -mx-3 px-3 hover:bg-black/5 rounded-xl transition group">
                                    <span className="text-[0.875rem] leading-snug text-slate-700 group-hover:text-slate-900 transition mr-4 font-medium mb-3 sm:mb-0">
                                        {ziel.text}
                                    </span>
                                    <div className="flex items-center justify-between sm:justify-end shrink-0 w-full sm:w-auto bg-white sm:bg-transparent p-2 sm:p-0 rounded-xl border border-slate-200 sm:border-transparent">
                                        <div className="sm:hidden text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Bewertung:</div>
                                        <div className="flex">
                                            {[3, 2, 1].map((level) => {
                                                const currentRating = evaluationData[ziel.id];
                                                return (
                                                    <div key={level} className="w-12 sm:w-20 md:w-28 flex justify-center">
                                                        <button
                                                            onClick={() => handleRatingChange(ziel.id, level)}
                                                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl border-2 transition-all flex items-center justify-center cursor-pointer ${getRatingStyles(currentRating || 0, level)}`}
                                                            title={level === 3 ? "Lernziel minimal erreicht" : level === 2 ? "Lernziel im Wesentlichen erreicht" : "Lernziel erreicht"}
                                                        >
                                                            {currentRating === level && <CheckCircle2 size={16} strokeWidth={3} />}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </div>
      </div>

      {/* PRINT VIEW (Hidden on screen) */}
      <div className="hidden print:block space-y-6 text-black bg-white p-8 max-w-[210mm] mx-auto min-h-[297mm]">
        <div className="text-center mb-8 border-b-2 border-black pb-4">
            <h1 className="text-2xl font-black uppercase tracking-widest">Lernziele</h1>
            <p className="text-lg mt-2">{student.vorname} {student.nachname} • {selectedStufe}. Klasse</p>
        </div>

        {FAECHER.map(fach => {
            const ziele = currentLernziele[fach];
            if (!ziele || ziele.length === 0) return null;
            return (
                <div key={fach} className="mb-8 avoid-break">
                    <h2 className="text-lg font-bold border-b border-gray-300 mb-4 pb-1">{fach}</h2>
                    <table className="w-full text-sm">
                        <thead>
                            <tr>
                                <th className="text-left pb-2 w-[55%]"></th>
                                <th className="text-center pb-2 w-[15%] text-xs font-normal text-gray-500 leading-tight">Minimal<br/>erreicht</th>
                                <th className="text-center pb-2 w-[15%] text-xs font-normal text-gray-500 leading-tight">Im Wesentlichen<br/>erreicht</th>
                                <th className="text-center pb-2 w-[15%] text-xs font-normal text-gray-500 leading-tight">Erreicht</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ziele.map((ziel, idx) => {
                                const rating = evaluationData[ziel.id];
                                return (
                                    <tr key={ziel.id} className={idx % 2 === 0 ? 'bg-gray-50/80' : ''}>
                                        <td className="py-2 pr-4">{ziel.text}</td>
                                        <td className="text-center py-2 border-l border-gray-200">
                                            {rating === 3 ? '☒' : '☐'}
                                        </td>
                                        <td className="text-center py-2 border-l border-gray-200">
                                            {rating === 2 ? '☒' : '☐'}
                                        </td>
                                        <td className="text-center py-2 border-l border-gray-200">
                                            {rating === 1 ? '☒' : '☐'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            );
        })}
      </div>

    </div>
  );
}
