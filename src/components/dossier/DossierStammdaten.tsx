
import React, { useState } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { Save, User, MapPin, Phone, Mail, Calendar, Hash, ShieldCheck, Heart, Clock, Copy, Check, PhoneCall, CheckCircle2 } from 'lucide-react';

interface DossierStammdatenProps {
  student: Student;
}

export default function DossierStammdaten({ student }: DossierStammdatenProps) {
  const { setApp } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editedStudent, setEditedStudent] = useState(student);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showLogSuccess, setShowLogSuccess] = useState(false);

  const handleSave = () => {
    setApp(prev => ({
      ...prev,
      schueler: prev.schueler.map(s => s.id === student.id ? editedStudent : s)
    }));
    setIsEditing(false);
  };

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleLogPhoneCall = (parentType: 'Mutter' | 'Vater' | 'Eltern') => {
    const parentName = parentType === 'Mutter' ? 'Mutter' : parentType === 'Vater' ? 'Vater' : 'Eltern';
    const number = parentType === 'Mutter' ? student.telefon_mutter : parentType === 'Vater' ? student.telefon_vater : '';
    
    const newMeeting = {
      id: `meet-${Date.now()}`,
      schuelerId: student.id,
      thema: `📞 Telefonat mit ${parentName}`,
      datum: new Date().toISOString().split('T')[0],
      notizen: `Erfolgreiches Telefonat mit ${parentName}.`,
      vereinbarungen: `Kurzes Telefonat bezüglich aktueller Schulleistungen/Verhalten geführt. ${number ? `Gewählte Nummer: ${number}` : ''}`
    };

    // Add status timeline event as well
    const statusLogItem = {
      id: `call-log-${Date.now()}`,
      schuelerId: student.id,
      timestamp: Date.now(),
      iconId: '2', // friendly check smiley
      comment: `Telefonischer Kontakt mit ${parentName} protokolliert.`
    };

    setApp((prev: any) => ({
      ...prev,
      elterngespraeche: [newMeeting, ...(prev.elterngespraeche || [])],
      statusLog: [statusLogItem, ...(prev.statusLog || [])]
    }));

    setShowLogSuccess(true);
    setTimeout(() => setShowLogSuccess(false), 4000);
  };

  const Field = ({ label, value, icon: Icon, field, isContactLink }: { label: string, value: string | number | undefined, icon: any, field?: keyof Student, isContactLink?: 'tel' | 'mail' }) => {
    const isCopied = copiedField === label;
    return (
      <div className="flex items-center justify-between p-4.5 bg-slate-50/50 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:bg-white transition-all shadow-3xs group flex-wrap sm:flex-nowrap gap-4.5 relative overflow-hidden">
        <div className="flex items-center gap-4.5 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/40 shadow-3xs flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0">
            <Icon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[0.625rem] font-extrabold uppercase tracking-widest text-slate-400 leading-none mb-2 flex items-center gap-2">
              <span>{label}</span>
              {!isEditing && value && (
                <button 
                  onClick={() => handleCopy(String(value), label)}
                  className="text-slate-350 hover:text-slate-600 transition-colors p-0.5 rounded focus:outline-none"
                  title="In Zwischenablage kopieren"
                >
                  {isCopied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                </button>
              )}
            </div>
            {isEditing && field ? (
              <input 
                className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-[0.75rem] leading-tight font-bold text-slate-900 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
                value={(editedStudent[field] as any) || ''}
                onChange={e => setEditedStudent({...editedStudent, [field]: e.target.value})}
              />
            ) : (
              <div className="text-[0.875rem] leading-snug lg:text-[0.90625rem] font-extrabold text-slate-800 text-wrap leading-tight break-words flex items-center gap-2">
                <span>{value || '—'}</span>
              </div>
            )}
          </div>
        </div>
        
        {!isEditing && value && isContactLink && (
          <div className="flex items-center gap-2 shrink-0">
            <a 
              href={isContactLink === 'tel' ? `tel:${value}` : `mailto:${value}`}
              className="w-10 h-10 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
              title={isContactLink === 'tel' ? "Direkt anrufen (Wählen)" : "E-Mail senden"}
            >
              {isContactLink === 'tel' ? <Phone size={14} /> : <Mail size={14} />}
            </a>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-2 h-7 bg-blue-500 rounded-full" />
          <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight">Stammdaten</h3>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[0.625rem] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer ${
              isEditing ? 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600' : 'bg-slate-950 text-white hover:bg-slate-800'
            }`}
          >
            {isEditing ? <Save size={14} /> : <User size={14} />}
            {isEditing ? 'Speichern' : 'Bearbeiten'}
          </button>
        </div>
      </div>

      {showLogSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-[0.8125rem] font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
          <div>
            Telefonkontakt wurde erfolgreich protokolliert! Der Anruf ist nun in der KEL-Historie und im Verhaltensjournal eingetragen.
          </div>
        </div>
      )}

      {/* QUICK CONTACT LOGGER BOARD */}
      {!isEditing && (student.telefon_mutter || student.telefon_vater) && (
        <div className="bg-indigo-50/45 border border-indigo-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-[0.875rem] font-black text-indigo-950 flex items-center gap-2">
              <PhoneCall size={16} className="text-indigo-600 animate-bounce" /> Elternkontakt Schnellprotokoll
            </h4>
            <p className="text-[0.75rem] text-indigo-700 font-bold leading-normal">
              Haben Sie soeben mit den Eltern telefoniert? Halten Sie das Gespräch mit einem Klick sofort in der Historie fest.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {student.telefon_mutter && (
              <button 
                onClick={() => handleLogPhoneCall('Mutter')}
                className="px-4 py-2.5 bg-white border border-indigo-200/50 hover:bg-indigo-50 text-indigo-800 text-[0.6875rem] font-black uppercase tracking-wider rounded-xl transition-all shadow-3xs flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <span>📞 Mutter anrufen & loggen</span>
              </button>
            )}
            {student.telefon_vater && (
              <button 
                onClick={() => handleLogPhoneCall('Vater')}
                className="px-4 py-2.5 bg-white border border-indigo-200/50 hover:bg-indigo-50 text-indigo-800 text-[0.6875rem] font-black uppercase tracking-wider rounded-xl transition-all shadow-3xs flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <span>📞 Vater anrufen & loggen</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
        <Field label="Vorname" value={student.vorname} icon={User} field="vorname" />
        <Field label="Nachname" value={student.nachname} icon={User} field="nachname" />
        <Field label="Geburtstag" value={student.geburtstag ? new Date(student.geburtstag).toLocaleDateString('de-DE') : '—'} icon={Calendar} field="geburtstag" />
        <Field label="SV-Nummer" value={student.sv_nummer} icon={Hash} field="sv_nummer" />
        <Field label="Religion" value={student.religion} icon={Heart} field="religion" />
        <Field label="Staatsbuergerschaft" value={student.staatsbuergerschaft} icon={ShieldCheck} field="staatsbuergerschaft" />
        <Field label="Besuchsjahr" value={student.besuchsjahr ? `${student.besuchsjahr}. Jahr` : 'Neu'} icon={Clock} field="besuchsjahr" />
        <Field label="Anschrift" value={student.anschrift} icon={MapPin} field="anschrift" />
        <Field label="PLZ / Ort" value={student.plz ? `${student.plz} ${student.ort || ''}` : '—'} icon={MapPin} field="plz" />
        <Field label="Telefon Mutter" value={student.telefon_mutter} icon={Phone} field="telefon_mutter" isContactLink="tel" />
        <Field label="Telefon Vater" value={student.telefon_vater} icon={Phone} field="telefon_vater" isContactLink="tel" />
        <Field label="E-Mail Eltern" value={student.email_eltern} icon={Mail} field="email_eltern" isContactLink="mail" />
      </div>

      <div className="mt-auto pt-8 border-t border-slate-100 flex items-center justify-between text-[0.625rem] font-black text-slate-404 uppercase tracking-widest">
         <span>Zuletzt bearbeitet: {new Date().toLocaleDateString('de-DE')}</span>
         <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-emerald-500" /> DSGVO Konform</span>
      </div>
    </div>
  );
}
