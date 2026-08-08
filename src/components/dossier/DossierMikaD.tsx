
import React from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { GraduationCap, Calendar, Info, CheckCircle2, AlertCircle } from 'lucide-react';

interface DossierMikaDProps {
  student: Student;
}

export default function DossierMikaD({ student }: DossierMikaDProps) {
  const { setApp } = useApp();
  const profil = student.foerderprofil || {};
  
  const updateMikaD = (status: any) => {
    setApp(prev => ({
      ...prev,
      schueler: prev.schueler.map(s => s.id === student.id ? {
        ...s,
        foerderprofil: { ...s.foerderprofil, mikaDStatus: status, mikaDDatum: status === 'nicht erhoben' ? '' : new Date().toISOString().split('T')[0] }
      } : s)
    }));
  };

  const STAGES = [
    { id: '3', label: 'AO - Stufe 3', desc: 'Außerordentlich (geringe Kenntnisse)', color: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700' },
    { id: '2', label: 'AO - Stufe 2', desc: 'Außerordentlich (mäßige Kenntnisse)', color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
    { id: '1', label: 'AO - Stufe 1', desc: 'Außerordentlich (fortgeschritten)', color: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700' },
    { id: 'ordentlich', label: 'Ordentlich', desc: 'Ausreichende Deutschkenntnisse', color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    { id: 'nicht erhoben', label: 'Nicht erhoben', desc: 'Derzeit keine MIKA-D Daten', color: 'bg-slate-300', bg: 'bg-slate-100', text: 'text-slate-500' },
  ];

  const current = STAGES.find(s => s.id === profil.mikaDStatus) || STAGES[4];

  return (
    <div className="space-y-10 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-orange-500 rounded-full" />
          <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight">MIKA-D Status</h3>
        </div>
      </div>

      <div className="flex-1 space-y-8">
        <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center space-y-4">
           <div className={`w-24 h-24 rounded-3xl ${current.bg} flex items-center justify-center shadow-lg transform rotate-3`}>
              <GraduationCap size={48} className={current.text} />
           </div>
           <div>
              <div className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 mb-1">Aktueller Status</div>
              <h4 className={`text-[1.5rem] leading-normal font-black tracking-tight ${current.text}`}>{current.label}</h4>
              <p className="text-[0.875rem] leading-snug font-medium text-slate-500 mt-2">{current.desc}</p>
           </div>
           {profil.mikaDDatum && (
             <div className="flex items-center gap-2 px-4 py-1 bg-white rounded-full border border-slate-100 text-[0.625rem] font-black text-slate-400 uppercase tabular-nums tracking-widest leading-none">
                <Calendar size={12} /> Letzte Erhebung: {new Date(profil.mikaDDatum).toLocaleDateString('de-DE')}
             </div>
           )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
           {STAGES.filter(s => s.id !== 'nicht erhoben').map(s => (
             <button
               key={s.id}
               onClick={() => updateMikaD(s.id)}
               className={`flex items-center gap-4 p-5 rounded-3xl border transition-all text-left group ${
                 profil.mikaDStatus === s.id 
                   ? `${s.bg} border-${s.text.split('-')[1]}-200` 
                   : 'bg-white border-slate-100 hover:border-slate-300'
               }`}
             >
                <div className={`w-3 h-3 rounded-full shrink-0 ${s.color}`} />
                <div className="flex-1 min-w-0">
                   <div className="text-[0.75rem] leading-tight font-black text-slate-900 leading-none">{s.label}</div>
                   <div className="text-[0.625rem] font-bold text-slate-400 mt-1 text-wrap leading-tight break-words">{s.desc}</div>
                </div>
                {profil.mikaDStatus === s.id && <CheckCircle2 size={16} className={s.text} />}
             </button>
           ))}
        </div>

        <div className="p-8 bg-orange-50 border border-orange-100 rounded-[2rem] flex gap-5">
           <Info size={24} className="text-orange-500 shrink-0" />
           <div className="space-y-2">
              <h5 className="text-[0.6875rem] font-black uppercase tracking-widest text-orange-900">Über MIKA-D</h5>
              <p className="text-[0.8125rem] text-orange-800 leading-relaxed font-medium">
                MIKA-D (Messinstrument zur Kompetenzanalyse – Deutsch) ist ein standardisiertes Testverfahren, um den Bedarf an Sprachförderung bei Schülern mit nichtdeutscher Alltagssprache festzustellen.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
