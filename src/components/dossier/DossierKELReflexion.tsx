import React, { useState, useMemo } from 'react';
import { Student, STANDARD_KEL_BEREICHE } from '../../types';
import { useApp } from '../../context/AppContext';
import { FlowerChart, KEL_GRADES_INFO, DEVELOPMENT_DIAGRAM_FIELDS } from '../FlowerChart';
import { generateKELAssessment } from '../../services/aiService';
import { 
  Sparkles, Compass, Plus, Trash2, Calendar, 
  ChevronDown, ChevronUp, AlertTriangle, MessageSquare, 
  User, Award, ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DossierKELReflexionProps {
  student: Student;
  onStartPresentation?: () => void;
}

export default function DossierKELReflexion({ student, onStartPresentation }: DossierKELReflexionProps) {
  const { app, setApp } = useApp();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    'kel_diagramm': true,
    'kel_reflexionskatalog': true,
    'kel_meetings_history': true
  });
  const [aiLoadingState, setAiLoadingState] = useState<string | null>(null);
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [newMeetingThema, setNewMeetingThema] = useState('');
  const [newMeetingDatum, setNewMeetingDatum] = useState(new Date().toISOString().split('T')[0]);
  const [newMeetingVereinbarung, setNewMeetingVereinbarung] = useState('');

  const kelCategoriesToShow = ['lernen', 'arbeitsverhalten', 'sozialverhalten', 'interessen'];

  const allCriteria = useMemo(() => {
    const base = [...STANDARD_KEL_BEREICHE];
    // Add DEVELOPMENT_DIAGRAM_FIELDS if they are not already in base (by ID)
    if (DEVELOPMENT_DIAGRAM_FIELDS) {
      DEVELOPMENT_DIAGRAM_FIELDS.forEach((f: any) => {
        if (!base.find(b => b.id === f.id)) {
          base.push({
            id: f.id,
            label: f.label,
            kategorie: f.kategorie as any,
            kindgerecht: f.kindgerecht
          });
        }
      });
    }
    return base;
  }, []);

  const meetings = (app.elterngespraeche || []).filter(m => m.schuelerId === student.id);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // State handles for criteria
  const handleUpdateKelRating = (bereichId: string, type: 'kind' | 'lehrer', value: number) => {
    setApp((prev: any) => {
      const currentMeetings = prev.kelGespraeche || [];
      const index = currentMeetings.findIndex((k: any) => k.schuelerId === student.id);
      
      let updatedMeeting: any;
      if (index >= 0) {
        const existing = currentMeetings[index];
        updatedMeeting = {
          ...existing,
          selbsteinschaetzungKind: {
            ...(existing.selbsteinschaetzungKind || {}),
            ...(type === 'kind' 
              ? { [bereichId]: { wert: value, kommentar: existing.selbsteinschaetzungKind?.[bereichId]?.kommentar || '' } } 
              : {})
          },
          einschaetzungLehrperson: {
            ...(existing.einschaetzungLehrperson || {}),
            ...(type === 'lehrer' 
              ? { [bereichId]: { wert: value, kommentar: existing.einschaetzungLehrperson?.[bereichId]?.kommentar || '' } } 
              : {})
          }
        };
      } else {
        updatedMeeting = {
          id: `kel-${Date.now()}`,
          schuelerId: student.id,
          datum: new Date().toISOString().split('T')[0],
          schuljahr: prev.schuljahr || '2023/24',
          selbsteinschaetzungKind: {
            [bereichId]: { wert: type === 'kind' ? value : 2, kommentar: '' }
          },
          einschaetzungLehrperson: {
            [bereichId]: { wert: type === 'lehrer' ? value : 2, kommentar: '' }
          },
          zieleKind: [],
          vereinbarungen: '',
          naechsterTermin: '',
          unterschriftKind: false,
          unterschriftEltern: false,
          unterschriftLehrperson: false
        };
      }
      
      const newMeetings = index >= 0 
        ? currentMeetings.map((k: any, idx: number) => idx === index ? updatedMeeting : k)
        : [...currentMeetings, updatedMeeting];
        
      return {
        ...prev,
        kelGespraeche: newMeetings
      };
    });
  };

  const handleUpdateKelComment = (bereichId: string, type: 'kind' | 'lehrer', comment: string) => {
    setApp((prev: any) => {
      const currentMeetings = prev.kelGespraeche || [];
      const index = currentMeetings.findIndex((k: any) => k.schuelerId === student.id);
      
      let updatedMeeting: any;
      if (index >= 0) {
        const existing = currentMeetings[index];
        updatedMeeting = {
          ...existing,
          selbsteinschaetzungKind: {
            ...(existing.selbsteinschaetzungKind || {}),
            ...(type === 'kind' 
              ? { [bereichId]: { wert: existing.selbsteinschaetzungKind?.[bereichId]?.wert ?? 2, kommentar: comment } } 
              : {})
          },
          einschaetzungLehrperson: {
            ...(existing.einschaetzungLehrperson || {}),
            ...(type === 'lehrer' 
              ? { [bereichId]: { wert: existing.einschaetzungLehrperson?.[bereichId]?.wert ?? 2, kommentar: comment } } 
              : {})
          }
        };
      } else {
        updatedMeeting = {
          id: `kel-${Date.now()}`,
          schuelerId: student.id,
          datum: new Date().toISOString().split('T')[0],
          schuljahr: prev.schuljahr || '2023/24',
          selbsteinschaetzungKind: {
            [bereichId]: { wert: 2, kommentar: type === 'kind' ? comment : '' }
          },
          einschaetzungLehrperson: {
            [bereichId]: { wert: 2, kommentar: type === 'lehrer' ? comment : '' }
          },
          zieleKind: [],
          vereinbarungen: '',
          naechsterTermin: '',
          unterschriftKind: false,
          unterschriftEltern: false,
          unterschriftLehrperson: false
        };
      }
      
      const newMeetings = index >= 0 
        ? currentMeetings.map((k: any, idx: number) => idx === index ? updatedMeeting : k)
        : [...currentMeetings, updatedMeeting];
        
      return {
        ...prev,
        kelGespraeche: newMeetings
      };
    });
  };

  // Protocols logic
  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingThema.trim()) return;

    const newMeeting = {
      id: `meet-${Date.now()}`,
      schuelerId: student.id,
      thema: newMeetingThema.trim(),
      datum: newMeetingDatum,
      notizen: '',
      vereinbarungen: newMeetingVereinbarung.trim()
    };

    setApp((prev: any) => ({
      ...prev,
      elterngespraeche: [newMeeting, ...(prev.elterngespraeche || [])]
    }));

    setNewMeetingThema('');
    setNewMeetingVereinbarung('');
    setShowAddMeeting(false);
  };

  const handleDeleteMeeting = (id: string) => {
    if (confirm('Protokoll wirklich löschen?')) {
      setApp((prev: any) => ({
        ...prev,
        elterngespraeche: (prev.elterngespraeche || []).filter((m: any) => m.id !== id)
      }));
    }
  };
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <span className="text-[0.625rem] font-black uppercase text-indigo-500 tracking-[0.2em] mb-1 block">Kollaborative Reflexion</span>
          <h2 className="text-[1.5rem] font-black text-slate-900 tracking-tight leading-tight">KEL-Cockpit & Entwicklung</h2>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onStartPresentation}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[0.625rem] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
          >
            <Compass size={16} /> Präsentation starten
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left: Diagram - Full width */}
        <div className="xl:col-span-12 2xl:col-span-12 space-y-6">
          <div className="bg-white p-2 rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <FlowerChart 
              studentId={student.id} 
              app={app} 
              selectedKats={kelCategoriesToShow} 
              isCollaborative={true}
              editable={true}
            />
          </div>

          {/* Combined Quick Statistics / Insights maybe? */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-[2rem] flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[1.5rem] shadow-sm">🌸</div>
              <div>
                <span className="text-[0.5625rem] font-black uppercase text-amber-600 tracking-wider">Selbstbild</span>
                <p className="text-[0.75rem] text-amber-900 font-bold leading-tight">Basierend auf der Reflexion des Kindes.</p>
              </div>
            </div>
            <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-[2rem] flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[1.5rem] shadow-sm">💎</div>
              <div>
                <span className="text-[0.5625rem] font-black uppercase text-indigo-600 tracking-wider">Feedback</span>
                <p className="text-[0.75rem] text-indigo-900 font-bold leading-tight">Ihre pädagogische Einschätzung.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Detailed Criteria Catalogue */}
        <div className="xl:col-span-12 2xl:col-span-12 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-[3rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
                <ClipboardList size={24} />
              </div>
              <div>
                <h4 className="text-[1.25rem] font-black text-slate-900 tracking-tight leading-tight">Reflexions-Katalog</h4>
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-[0.15em] mt-0.5">Detaillierte Merkmale & Kommentare</p>
              </div>
            </div>

            <div className="space-y-6 max-h-[1200px] 2xl:max-h-[900px] overflow-y-auto pr-2 custom-scrollbar">
              {allCriteria.map((bereich) => {
                const latestKel = (app.kelGespraeche || []).find(k => k.schuelerId === student.id);
                const kidSmiley = latestKel?.selbsteinschaetzungKind?.[bereich.id]?.wert !== undefined
                  ? latestKel.selbsteinschaetzungKind[bereich.id].wert
                  : 2;
                const teacherSmiley = latestKel?.einschaetzungLehrperson?.[bereich.id]?.wert !== undefined
                  ? latestKel.einschaetzungLehrperson[bereich.id].wert
                  : 2;
                const kidComment = latestKel?.selbsteinschaetzungKind?.[bereich.id]?.kommentar || '';
                const teacherComment = latestKel?.einschaetzungLehrperson?.[bereich.id]?.kommentar || '';

                const categorySymbol = 
                  bereich.kategorie === 'lernen' ? '📚' :
                  bereich.kategorie === 'arbeitsverhalten' ? '⚙️' :
                  bereich.kategorie === 'sozialverhalten' ? '🤝' : '💡';

                const kidInfo = KEL_GRADES_INFO.find(g => g.item === kidSmiley) || KEL_GRADES_INFO[2];
                const teacherInfo = KEL_GRADES_INFO.find(g => g.item === teacherSmiley) || KEL_GRADES_INFO[2];

                return (
                  <div key={bereich.id} className="border border-slate-150 rounded-[1.5rem] bg-slate-50/50  shadow-2xs p-5 space-y-4 font-bold text-slate-700">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                      <div>
                        <span className="text-[0.625rem] font-black uppercase text-indigo-600 tracking-wider">Kollaborative Reflexion</span>
                        <h5 className="text-[1rem] leading-normal font-black text-slate-900 tracking-tight flex items-center gap-1.5 mt-0.5">
                          {categorySymbol} {bereich.label}
                        </h5>
                      </div>
                      <div className="flex gap-4 items-center self-start sm:self-auto">
                        <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-150 shadow-3xs">
                          <div className="flex flex-col items-center">
                            <span className="text-[0.5rem] font-black uppercase text-slate-400">Kind</span>
                            <span className="text-[0.875rem] leading-snug font-black text-slate-800">{kidSmiley} {kidInfo.icon}</span>
                          </div>
                          <div className="w-px h-6 bg-slate-200" />
                          <div className="flex flex-col items-center">
                            <span className="text-[0.5rem] font-black uppercase text-slate-400">Lehrer</span>
                            <span className="text-[0.875rem] leading-snug font-black text-slate-800">{teacherSmiley} {teacherInfo.icon}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-150 text-[0.75rem] leading-tight text-slate-705 leading-relaxed font-semibold">
                      <span className="text-[0.5rem] font-black uppercase text-slate-400 block pb-0.5">Pädagogischer Schwerpunkt:</span>
                      {bereich.kindgerecht}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Kind Selbsteinschätzung */}
                      <div className="bg-white border border-slate-150 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[0.5625rem] font-black uppercase text-amber-600">1. Kind-Perspektive</span>
                          <span className="text-[0.5625rem] font-bold text-slate-405">Stufe: {kidSmiley} / 5</span>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {[0, 1, 2, 3, 4, 5].map((val) => {
                            const isSelected = kidSmiley === val;
                            const itemInfo = KEL_GRADES_INFO.find(g => g.item === val);
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleUpdateKelRating(bereich.id, 'kind', val)}
                                className={`w-8.5 h-8.5 rounded-lg text-[0.75rem] leading-tight font-black flex flex-col items-center justify-center transition-all cursor-pointer border ${
                                  isSelected 
                                    ? 'bg-amber-500 border-transparent text-white shadow-sm scale-105' 
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                                title={itemInfo?.text}
                              >
                                {val} <span className="text-[0.5625rem] -mt-1">{itemInfo?.icon}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[0.5rem] font-black uppercase text-slate-400 block">Gemeinsamer Kommentar des Kindes</label>
                          <textarea
                            value={kidComment}
                            onChange={(e) => handleUpdateKelComment(bereich.id, 'kind', e.target.value)}
                            placeholder="Meinung oder Notiz des Kindes..."
                            className="w-full text-[0.75rem] leading-tight font-medium p-2 border border-slate-205 rounded-lg focus:outline-none focus:border-amber-400 bg-slate-50/50 min-h-[50px] leading-relaxed"
                          />
                        </div>
                      </div>

                      {/* Lehrer Einschätzung */}
                      <div className="bg-white border border-slate-150 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[0.5625rem] font-black uppercase text-indigo-600">2. Lehrperson-Perspektive</span>
                          <span className="text-[0.5625rem] font-bold text-slate-405">Stufe: {teacherSmiley} / 5</span>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {[0, 1, 2, 3, 4, 5].map((val) => {
                            const isSelected = teacherSmiley === val;
                            const itemInfo = KEL_GRADES_INFO.find(g => g.item === val);
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleUpdateKelRating(bereich.id, 'lehrer', val)}
                                className={`w-8.5 h-8.5 rounded-lg text-[0.75rem] leading-tight font-black flex flex-col items-center justify-center transition-all cursor-pointer border ${
                                  isSelected 
                                    ? 'bg-indigo-600 border-transparent text-white shadow-sm scale-105' 
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                                title={itemInfo?.text}
                              >
                                {val} <span className="text-[0.5625rem] -mt-1">{itemInfo?.icon}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="space-y-1 relative">
                          <label className="text-[0.5rem] font-black uppercase text-slate-400 block">Pädagogischer Befund / KI Helper</label>
                          <textarea
                            value={teacherComment}
                            onChange={(e) => handleUpdateKelComment(bereich.id, 'lehrer', e.target.value)}
                            placeholder="Notiz der Klassenlehrperson..."
                            className="w-full text-[0.75rem] leading-tight font-medium p-2 pr-10 border border-slate-205 rounded-lg focus:outline-none focus:border-indigo-400 bg-slate-50/50 min-h-[50px] leading-relaxed"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                setAiLoadingState(bereich.id);
                                const res = await generateKELAssessment(bereich.label, teacherComment);
                                if (res) {
                                  handleUpdateKelComment(bereich.id, 'lehrer', res);
                                }
                              } catch (e) {
                                console.error(e);
                              } finally {
                                setAiLoadingState(null);
                              }
                            }}
                            disabled={aiLoadingState === bereich.id}
                            className="absolute right-2.5 bottom-2.5 p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all cursor-pointer shadow-3xs disabled:opacity-50 flex items-center justify-center border-none"
                            title="KI Formulierungshilfe generieren"
                          >
                            <Sparkles size={11} className={aiLoadingState === bereich.id ? "animate-spin" : ""} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Elterngespräche Historie */}
      <div className="bg-white p-6 sm:p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button 
            onClick={() => toggleExpand('kel_meetings_history')}
            className="flex items-center gap-3 text-left flex-1 cursor-pointer outline-none select-none"
          >
            <div className="w-10 h-10 bg-indigo-50 text-indigo-655 rounded-2xl flex items-center justify-center border border-indigo-100 shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <h4 className="text-[1.125rem] leading-normal font-black text-slate-900 tracking-tight">Historie Elterngespräche</h4>
              <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">{meetings.length} Protokollierte Kontakte</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddMeeting(!showAddMeeting)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 border border-slate-200"
            >
              {showAddMeeting ? 'Schließen' : (
                <>
                  <Plus size={12} /> Protokollieren
                </>
              )}
            </button>
            <button 
              onClick={() => toggleExpand('kel_meetings_history')}
              className="p-2 rounded-full border border-slate-100 text-slate-400 hover:bg-slate-50 transition-colors"
            >
              {expandedItems['kel_meetings_history'] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {expandedItems['kel_meetings_history'] && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-4 border-t border-slate-100 "
            >
              {showAddMeeting && (
                <form
                  onSubmit={handleAddMeeting}
                  className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 "
                >
                  <h5 className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-500">Kontakt protokollieren</h5>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[0.5625rem] font-black uppercase text-slate-500 block pb-1">Anlass / Thema</label>
                      <input
                        type="text"
                        value={newMeetingThema}
                        onChange={e => setNewMeetingThema(e.target.value)}
                        placeholder="z.B. KEL-Gespräch, Beratung..."
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-[0.75rem] leading-tight font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-900 placeholder-slate-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[0.5625rem] font-black uppercase text-slate-500 block pb-1 font-bold">Datum</label>
                      <input
                        type="date"
                        value={newMeetingDatum}
                        onChange={e => setNewMeetingDatum(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-[0.75rem] leading-tight font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[0.5625rem] font-black uppercase text-slate-500 block pb-1 font-bold">Vereinbarungen / Notizen</label>
                    <textarea
                      value={newMeetingVereinbarung}
                      onChange={e => setNewMeetingVereinbarung(e.target.value)}
                      placeholder="Welche konkreten pädagogischen Ziele oder Vereinbarungen wurden mit den Eltern getroffen?"
                      className="w-full bg-white border border-slate-200 p-3 rounded-xl text-[0.75rem] leading-tight font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-700 min-h-[85px] leading-relaxed"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddMeeting(false)}
                      className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[0.625rem] font-bold uppercase transition-all cursor-pointer"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      Speichern
                    </button>
                  </div>
                </form>
              )}

              {meetings.length === 0 ? (
                <div className="py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/60 text-center text-slate-400 text-[0.75rem] leading-tight font-bold">
                  Noch keine Elterngespräche protokolliert.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {meetings.map((m) => (
                    <div key={m.id} className="p-5 border border-slate-150 rounded-2xl bg-white shadow-3xs flex justify-between items-start gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[0.75rem] leading-tight font-black text-slate-900">{m.thema}</span>
                          <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-350">•</span>
                          <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                            {new Date(m.datum).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                        <p className="text-[0.75rem] leading-tight font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">{m.vereinbarungen}</p>
                        <div className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-widest leading-none pt-1">
                          Erstellt von: {app.lehrerName || app.lehrerProfil?.name || 'Klassenlehrkraft'}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteMeeting(m.id)}
                        className="p-2 border border-slate-150 text-slate-300 hover:text-rose-550 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Protokoll löschen"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
