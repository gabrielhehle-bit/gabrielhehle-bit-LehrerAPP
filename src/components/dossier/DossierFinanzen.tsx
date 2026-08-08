import React from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { Banknote, CheckCircle2, AlertCircle, Clock, TrendingUp } from 'lucide-react';

interface DossierFinanzenProps {
  student: Student;
}

export default function DossierFinanzen({ student }: DossierFinanzenProps) {
  const { app, setApp } = useApp();
  
  const sammlungen = app.klassenkasse?.sammlungen || [];
  
  const toggleStatus = (sammlungId: string, currentStatus: string) => {
    if (!setApp) return;
    setApp((prev: any) => {
      const updatedSammlungen = (prev.klassenkasse?.sammlungen || []).map((s: any) => {
        if (s.id === sammlungId) {
          const newStatus = { ...(s.status || {}) };
          newStatus[student.id] = currentStatus === 'bezahlt' ? 'offen' : 'bezahlt';
          return { ...s, status: newStatus };
        }
        return s;
      });
      return {
        ...prev,
        klassenkasse: {
          kontostand: prev.klassenkasse?.kontostand || 0,
          transaktionen: prev.klassenkasse?.transaktionen || [],
          ...(prev.klassenkasse || {}),
          sammlungen: updatedSammlungen
        }
      };
    });
  };

  const studentPayments = sammlungen.map(s => {
    const status = s.status?.[student.id] || 'offen';
    const amount = s.betraege?.[student.id] || s.betrag || 0;
    return {
      id: s.id,
      titel: s.titel,
      datum: s.erstelltAm,
      status,
      amount
    };
  }).filter(p => p.amount > 0);

  const totalPaid = studentPayments.filter(p => p.status === 'bezahlt').reduce((a, b) => a + b.amount, 0);
  const totalOpen = studentPayments.filter(p => p.status !== 'bezahlt').reduce((a, b) => a + b.amount, 0);
  const totalAmount = totalPaid + totalOpen;
  const progressPercent = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

  return (
    <div className="space-y-10 h-full flex flex-col">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-cyan-500 rounded-full" />
          <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight">Finanzen & Beiträge</h3>
        </div>
      </div>
      
      {totalAmount > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
           <div className="flex justify-between items-end mb-2">
              <div className="space-y-1">
                 <div className="text-[0.625rem] font-black tracking-widest text-slate-400 uppercase">Kontostand</div>
                 <div className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">
                    {totalPaid.toFixed(2)} € <span className="text-[0.875rem] leading-snug text-slate-400 font-bold ml-1">von {totalAmount.toFixed(2)} € bezahlt</span>
                 </div>
              </div>
              <div className="text-[0.875rem] leading-snug font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100/50">
                 {progressPercent.toFixed(0)}%
              </div>
           </div>
           <div className="h-4 bg-slate-100 rounded-full  flex shadow-inner overflow-hidden">
              <div 
                 className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                 style={{ width: `${progressPercent}%` }}
              />
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="p-8 bg-emerald-50 rounded-[2rem] border border-emerald-100 flex items-center justify-between shadow-3xs">
            <div>
               <div className="text-[0.625rem] font-black uppercase tracking-widest text-emerald-600 mb-1">Bereits bezahlt</div>
               <div className="text-[1.875rem] leading-tight font-black text-slate-900 tabular-nums">{totalPaid.toFixed(2)} €</div>
            </div>
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100">
               <CheckCircle2 size={28} />
            </div>
         </div>
         <div className="p-8 bg-rose-50 rounded-[2rem] border border-rose-100 flex items-center justify-between shadow-3xs">
            <div>
               <div className="text-[0.625rem] font-black uppercase tracking-widest text-rose-600 mb-1">Noch offen</div>
               <div className="text-[1.875rem] leading-tight font-black text-slate-900 tabular-nums">{totalOpen.toFixed(2)} €</div>
            </div>
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm border border-rose-100 animate-pulse">
               <AlertCircle size={28} />
            </div>
         </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
         <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-2">
            <Clock size={14} className="text-cyan-500" />
            Zahlungshistorie (Klicken zum Umschalten)
         </h4>

         {studentPayments.length > 0 ? (
           <div className="space-y-3">
             {studentPayments.map(p => (
               <button
                 key={p.id}
                 onClick={() => toggleStatus(p.id, p.status)}
                 className="w-full text-left p-5 bg-white border border-slate-100 rounded-2xl shadow-3xs flex items-center justify-between hover:border-cyan-300 hover:bg-cyan-50/20 transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400"
                 title="Status umschalten (Bezahlt / Offen)"
               >
                  <div className="flex items-center gap-4">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                       p.status === 'bezahlt' ? 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100' : 'bg-rose-50 text-rose-500 group-hover:bg-rose-100'
                     }`}>
                        <Banknote size={20} />
                     </div>
                     <div>
                        <div className="text-[0.875rem] leading-snug font-black text-slate-900 group-hover:text-cyan-950 transition-colors">{p.titel}</div>
                        <div className="text-[0.625rem] font-bold text-slate-400 uppercase tabular-nums tracking-widest">{p.datum}</div>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="text-right">
                        <div className="text-[0.875rem] leading-snug font-black text-slate-900 tabular-nums">{p.amount.toFixed(2)} €</div>
                        <div className={`text-[0.5625rem] font-black uppercase tracking-tighter ${
                          p.status === 'bezahlt' ? 'text-emerald-500' : 'text-rose-500'
                        }`}>{p.status === 'bezahlt' ? 'Bezahlt' : 'Offen'}</div>
                     </div>
                     <div className="text-slate-300 group-hover:text-cyan-500 transition-colors">
                       <CheckCircle2 size={16} className={`transition-transform duration-300 ${p.status === 'bezahlt' ? 'scale-100 text-emerald-500' : 'scale-75 opacity-20'}`} />
                     </div>
                  </div>
               </button>
             ))}
           </div>
         ) : (
           <div className="p-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 italic text-[0.75rem] leading-tight">
             Keine aktiven Geldsammlungen für diesen Schüler.
           </div>
         )}
      </div>

      <div className="p-6 bg-cyan-50/30 rounded-2xl border border-cyan-100/50 flex items-center gap-4">
         <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0"><TrendingUp size={16} /></div>
         <p className="text-[0.6875rem] font-medium text-cyan-800 leading-relaxed">
            Über die Klassenkasse können Sammlungen für Ausflüge, Material oder Kopierkosten verwaltet werden. Klicken Sie auf eine Zahlung, um den Status direkt zu aktualisieren.
         </p>
      </div>
    </div>
  );
}
