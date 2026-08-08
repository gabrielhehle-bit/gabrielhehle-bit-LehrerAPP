import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { Sparkles, Loader2, FileText, Calendar, RefreshCcw } from 'lucide-react';
import Markdown from 'react-markdown';
import { generatePortfolioSummary } from '../../services/aiService';
import { berechne } from '../../lib/GradeUtils';
import { FAECHER_ALLE } from '../../constants';

interface DossierKIPortfolioProps {
  student: Student;
}

export default function DossierKIPortfolio({ student }: DossierKIPortfolioProps) {
  const { app } = useApp();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portfolioStyle, setPortfolioStyle] = useState('Ausgewogen & Professionell');

  const compilePerformanceData = (): string => {
    const activeFaecher = (app.faecher && app.faecher.length > 0) ? app.faecher : FAECHER_ALLE;
    const gradeSummary = activeFaecher.map(subject => {
      const avg = berechne(app, student.id, subject, '1');
      const rawEndnote = app.noten?.[student.id]?.[subject]?.[ '1' ]?.endnote || 
                         app.noten?.[student.id]?.[subject]?.[ '2' ]?.endnote;
      const endnote = rawEndnote || (avg !== null ? Math.round(avg).toString() : '—');
      return { subject, avg, endnote };
    }).filter(item => item.avg !== null || item.endnote !== '—');

    if (gradeSummary.length === 0) return 'Keine Leistungsdaten eingetragen.';
    
    return gradeSummary.map(g => 
      `- Fach: ${g.subject} | Schnitt: ${g.avg ? g.avg.toFixed(2) : 'kein Schnitt'} | Zeugnisnote / Endnote: ${g.endnote}`
    ).join('\n');
  };

  const compileAttendanceData = (): string => {
    const data = app.anwesenheit?.[student.id] || {};
    let excused = 0;
    let unexcused = 0;
    Object.values(data).forEach(dayData => {
      Object.values(dayData).forEach(status => {
        if (status === 'e') excused++;
        else if (status === 'u') unexcused++;
      });
    });
    return `Fehlzeiten / Anwesenheit des Schülers:
- Entschuldigte Fehlstunden: ${excused}
- Unentschuldigte Fehlstunden: ${unexcused}
- Gesamtfehlstunden: ${excused + unexcused}`;
  };

  const compileNotesData = (): string => {
    const fromNotes = (app.notes || [])
      .filter(n => n.schuelerId === student.id)
      .map(n => `Am ${n.datum || 'Unbekannt'}: [Kategorie: ${n.kategorie || 'Leistung/Verhalten'}]: ${n.inhalt}`);

    const fromNotizen = (app.notizen || [])
      .filter(n => n.schuelerId === student.id)
      .map(n => `Am ${n.timestamp ? new Date(n.timestamp).toLocaleDateString('de-DE') : 'Unbekannt'}: [Kategorie: ${n.kategorie || 'Journal'}]: ${n.inhalt}`);

    const allMyNotes = [...fromNotes, ...fromNotizen];
    if (allMyNotes.length === 0) return 'Keine Beobachtungs- oder Verhaltensnotizen erfasst.';
    return allMyNotes.join('\n');
  };

  const compileReflexionAndKelData = (): string => {
    const CRITERION_DICT: Record<string, string> = {
      'de_hoeren_gespraeche': 'Deutsch Hören/Sprechen: Gespräche führen/Beitrag im Unterricht',
      'de_hoeren_standardsprache': 'Deutsch Hören/Sprechen: Standardsprache/Aussprache/Vortrag',
      'de_hoeren_zuhoeren': 'Deutsch Hören/Sprechen: Zuhör-Kompetenz/Zuhören',
      'de_lesen_fliessend': 'Deutsch Lesen: Lautlesekompetenz/Flüssig lesen',
      'de_lesen_verstaendnis': 'Deutsch Lesen: Sinnoffenheit/Leseverständnis',
      'de_lesen_info_verarbeit': 'Deutsch Lesen: Strukturierte Textarbeit/Textverständnis',
      'de_rechtschreiben_richtig': 'Deutsch Rechtschreiben: Formale Richtigkeit/Texte abschreiben',
      'de_rechtschreiben_lernwoerter': 'Deutsch Rechtschreiben: Schreibwortschatz/Lernwörter',
      'de_rechtschreiben_wortfamilie': 'Deutsch Rechtschreiben: Grammatik/Wortstämme/Groß-Kleinschreibung',
      'de_rechtschreiben_wortarten': 'Deutsch Rechtschreiben: Bestimmen von Wortarten/Satzstrukturen',
      'de_rechtschreiben_zeitformen': 'Deutsch Rechtschreiben: Erkennen und Bilden von Zeitformen',
      'de_verfassen_planen': 'Deutsch Verfassen: Planvoller Textentwurf',
      'de_verfassen_ueberarbeiten': 'Deutsch Verfassen: Redigieren/Nachbereiten von Textentwürfen',
      'ma_zahlen_zahlenraum': 'Mathematik: Begriffliches Erfassen und Orientieren im Zahlenraum',
      'ma_zahlen_stellenwert': 'Mathematik: Stellenwertschreiben und -lesen',
      'ma_zahlen_daten': 'Mathematik: Tabellen und Daten erheben',
      'ma_rechnen_addition': 'Mathematik Rechnen: Schriftliches Additionsverfahren',
      'ma_rechnen_subtraktion': 'Mathematik Rechnen: Schriftliches Subtraktionsverfahren',
      'ma_rechnen_multiplikation': 'Mathematik Rechnen: Multiplizieren/Malreihen',
      'ma_rechnen_division': 'Mathematik Rechnen: Dividieren',
      'ma_rechnen_sachaufgaben': 'Mathematik Rechnen: Analysieren von Sachaufgaben/Sachrechnen',
      'ma_groessen_umwandeln': 'Mathematik Rechnen: Arbeiten mit Maßeinheiten/Größen',
      'ma_raum_figuren': 'Mathematik Geometrie: Erkennen von Figuren und Körpern',
      'ma_raum_umfang': 'Mathematik Geometrie: Umfangberechnungen',
      'su_interesse': 'Sachunterricht: Eigeninteresse und Wissbegierde an Themenfragen',
      'su_wiedergabe': 'Sachunterricht: Inhaltliche Wiedergabe und begriffliches Erklären von Inhalten',
      'me_interesse': 'Musikerziehung: Rhythmisches Gefühl/Interesse an Musik',
      'td_planung': 'Technik & Design: Kreativer planvoller Werkunterricht',
      'kg_gestaltung': 'Kunst & Gestaltung: Ästhetisches Gestalten und Feinmotorik',
      'bs_freude': 'Bewegung & Sport: Sportlicher Einsatz und faires Teamverhalten',
      're_interesse': 'Religion: Engagement und Mitgestaltung des Unterrichts',
      'al_mitarbeit': 'Allgemeines Verhalten: Unterrichtsbeteiligung/Mitarbeit',
      'al_konzentration': 'Allgemeines Verhalten: Fokus, Konzentration und Ausdauer',
      'al_arbeitstempo': 'Allgemeines Verhalten: Angemessenes Arbeitstempo',
      'al_ordnung': 'Allgemeines Verhalten: Struktur, Ordnung und Heftführung',
      'al_selbststaendigkeit': 'Allgemeines Verhalten: Eigenverantwortung/Selbstständigkeit',
      'al_hausuebungen': 'Allgemeines Verhalten: Verlässliches Erledigen der Hausaufgaben'
    };

    const latestKel = (app.kelGespraeche || [])
      .filter(k => k.schuelerId === student.id)
      .sort((a,b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())[0];

    const lines: string[] = [];
    if (latestKel) {
      lines.push(`Letztes KEL-Gespräch am ${latestKel.datum}:`);
      if (latestKel.vereinbarungen) lines.push(`- Vereinbarungen: ${latestKel.vereinbarungen}`);
      
      const selbsteinschätzung: string[] = [];
      const lehrereinschätzung: string[] = [];

      if (latestKel.selbsteinschaetzungKind) {
        Object.entries(latestKel.selbsteinschaetzungKind).forEach(([cId, valObj]) => {
          if (valObj && valObj.wert) {
            const label = CRITERION_DICT[cId] || cId;
            selbsteinschätzung.push(`  - ${label}: ${valObj.wert}/4 Sterne${valObj.kommentar ? ` (Kommentar: "${valObj.kommentar}")` : ''}`);
          }
        });
      }

      if (latestKel.einschaetzungLehrperson) {
        Object.entries(latestKel.einschaetzungLehrperson).forEach(([cId, valObj]) => {
          if (valObj && valObj.wert) {
            const label = CRITERION_DICT[cId] || cId;
            lehrereinschätzung.push(`  - ${label}: ${valObj.wert}/4 Sterne${valObj.kommentar ? ` (Kommentar: "${valObj.kommentar}")` : ''}`);
          }
        });
      }

      if (selbsteinschätzung.length > 0) {
        lines.push(`SELBSTEINSCHÄTZUNG DES KINDES (Reflexionskatalog):\n${selbsteinschätzung.join('\n')}`);
      }
      if (lehrereinschätzung.length > 0) {
        lines.push(`EINSCHÄTZUNG DER LEHRPERSON (Reflexionskatalog):\n${lehrereinschätzung.join('\n')}`);
      }
    }

    return lines.join('\n\n') || 'Keine KEL-Reflexionen / Einschätzungen gefunden.';
  };

  const compileIkmData = (): string => {
    const rec = (app.ikmRecords || []).find((r: any) => r.schuelerId === student.id);
    if (!rec) return 'Keine IKM Plus Ergebnisse vorhanden.';
    
    return `IKM Plus Ergebnisse (Schulstufe ${rec.schulstufe}, Schuljahr ${rec.schuljahr || 'aktuell'}):
- Deutsch Lesen (PR): ${rec.deutschLesenPR !== undefined ? rec.deutschLesenPR + '%' : 'nicht erfasst'}
- Deutsch Zuhören (PR): ${rec.deutschZuhoerenPR !== undefined ? rec.deutschZuhoerenPR + '%' : 'nicht erfasst'}
- Deutsch Sprachbewusstsein (PR): ${rec.deutschSprachbewusstseinPR !== undefined ? rec.deutschSprachbewusstseinPR + '%' : 'nicht erfasst'}
- Mathematik (PR): ${rec.mathematikPR !== undefined ? rec.mathematikPR + '%' : 'nicht erfasst'}
- Pädagogische Stärken (IKM): ${rec.diagnoseStaerken || 'keine'}
- Pädagogische Herausforderungen (IKM): ${rec.diagnoseHerausforderungen || 'keine'}
${rec.kommentar ? `- Pädagogischer Kommentar/Lernpfad-Tipps: ${rec.kommentar}` : ''}`;
  };

  const compileMeetingsData = (): string => {
    const meetingsList = (app.kelGespraeche || []).filter(k => k.schuelerId === student.id);
    const meetingsText = meetingsList.map(k => {
      const goals = (k.zieleKind || []).map(g => `   * Ziel des Kindes: ${g.ziel} (bis ${g.bisWann})`).join('\n');
      return `[KEL-Gespräch am ${k.datum}]:
 - Teilnehmer: ${k.teilnehmer?.join(', ') || '—'}
 - Elterneindruck: ${k.elternEindruck || '—'}
 - Vereinbarungen: ${k.vereinbarungen || '—'}
 - Zielsetzungen:
${goals || '   * Keine KEL-Ziele eingetragen.'}
 - Interne Notiz: ${k.notiz || '—'}`;
    }).join('\n\n');

    return meetingsText || 'Keine Elterngespräche vorhanden.';
  };

  const compileBehaviorData = (): string => {
    const stages = app.behavior_stages || [
      { id: '1', label: 'Super', color: '#10b981', icon: '🌟' },
      { id: '2', label: 'Gut', color: '#3b82f6', icon: '😊' },
      { id: '3', label: 'OK', color: '#94a3b8', icon: '😐' },
      { id: '4', label: 'Ermahnung', color: '#f59e0b', icon: '⚠️' },
      { id: '5', label: 'Inakzeptabel', color: '#ef4444', icon: '🚫' }
    ];

    const studentLogs = (app.statusLog || [])
      .filter(l => l.schuelerId === student.id)
      .sort((a,b) => b.timestamp - a.timestamp);
    
    const behaviorText = studentLogs.map(l => {
      const dateStr = new Date(l.timestamp).toLocaleDateString('de-DE');
      const stage = stages.find(s => s.id === l.iconId) || { label: 'Unbekannt', icon: '❓' };
      return `[${dateStr}] Einstufung: ${stage.icon} ${stage.label} | Kommentar: ${l.comment || 'kein Kommentar'}`;
    }).join('\n');

    const behaviorNote = app.behavior_notes?.[student.id];
    const badgesList = (student.badges || [])
      .map(b => `- ${b.icon} ${b.name} (${new Date(b.date).toLocaleDateString('de-DE')})`)
      .join('\n');

    const sections = [];
    if (behaviorNote) sections.push(`Pädagogische Verhaltensnote:\n${behaviorNote}`);
    if (badgesList) sections.push(`Vergebene Abzeichen (Badges):\n${badgesList}`);
    if (behaviorText) sections.push(`Verhaltensverlauf:\n${behaviorText}`);

    return sections.join('\n\n') || 'Keine spezifischen Verhaltensberichte vorhanden.';
  };

  const compileFoerderAndErlauterungData = (): string => {
    const fp = student.foerderprofil || {};
    const remarks = localStorage.getItem(`oberau_remarks_${student.id}`) || fp.zusatzinfo || '';
    
    const sections = [];
    if (remarks) sections.push(`OBERAU MATRIX ERLÄUTERUNGEN & BEMERKUNGEN:\n"${remarks}"`);
    if (fp.diagnosen) sections.push(`Medizinische / Pädagogische Diagnostik: ${fp.diagnosen}`);
    if (fp.staerken && fp.staerken.length > 0) sections.push(`Stärken im Förderprofil:\n- ${fp.staerken.join('\n- ')}`);
    if (fp.foerderbedarfBereiche && fp.foerderbedarfBereiche.length > 0) sections.push(`Förderbedarf-Bereiche:\n- ${fp.foerderbedarfBereiche.join('\n- ')}`);
    if (fp.foerderziele && fp.foerderziele.length > 0) {
      const goalsText = fp.foerderziele
        .map(g => `- Bereich: ${g.bereich} | Ziel: ${g.ziel} | Status: ${g.status}${g.notiz ? ` | Notiz: ${g.notiz}` : ''}`)
        .join('\n');
      sections.push(`Förderplan-Ziele:\n${goalsText}`);
    }

    return sections.join('\n\n') || 'Kein Förderprofil / keine Matrixbemerkungen eingetragen.';
  };

  const compilePortfolioItemsData = (): string => {
    const portfolioText = (student.portfolio || [])
      .map(e => `[${e.datum}] Titel: ${e.titel}${e.beschreibung ? ` | Beschreibung: ${e.beschreibung}` : ''}${e.isInKEL ? ' (Im KEL-Fokus)' : ''}`)
      .join('\n');
    return portfolioText || 'Keine Portfolio-Stücke hochgeladen.';
  };

  const compileDiagnosticsData = (): string => {
    const erhebungen = (app.diagnostikErhebungen || [])
      .filter((e: any) => e.schuelerId === student.id)
      .sort((a: any, b: any) => (b.datum || '').localeCompare(a.datum || ''));
    
    if (erhebungen.length === 0) return 'Keine diagnostischen Tests oder 1:1 Live-Protokolle erfasst.';
    
    const testLines = erhebungen.map((e: any) => {
      const test = (app.diagnostikTests || []).find((t: any) => t.id === e.testId);
      const testName = test ? test.name : (e.testId || 'Unbekannter Test');
      const criticalLabel = e.foerderbedarfErkannt ? ' (⚠️ FÖRDERBEDARF ERKANNT)' : '';
      let desc = `Am ${e.datum || 'Unbekannt'}: Test "${testName}" | Ergebniswert: ${e.ergebniswert} | Durchführung: ${e.durchgefuehrtVon}${criticalLabel}`;
      if (e.kommentar) {
        desc += `\n  - Lehrer-Notiz: ${e.kommentar}`;
      }
      if (e.meta) {
        if (e.meta.type === 'lesen') {
          desc += `\n  - Lesediagnose-Werte: Wortgenauigkeit ${e.meta.accuracy}%, Lesetempo ${e.meta.rgw} RGW/min, Selbstkorrekturen ${e.meta.selfCorrections || 0}`;
        } else if (e.meta.type === 'kopf') {
          desc += `\n  - Kopfrechendiagnose-Werte: Automatisiert ${e.meta.automated}/10, Strategisch gerechnet ${e.meta.calculated}/10, Zehnerübergangsfehler ${e.meta.carryErrors || 0}, Richtigkeitsquote ${e.meta.correctPercent}%`;
        } else if (e.meta.type === 'sprache_grammatik') {
          desc += `\n  - Sprachdiagnose-Werte: Niveau ${e.meta.levelTitle}, Erfolgsquote ${e.meta.percentage}%`;
        } else if (e.type === 'exekutiv') {
          desc += `\n  - Exekutive Funktionen: Arbeitsgedächtnis ${e.meta.arbeitsgedaechtnis}, Inhibition ${e.meta.inhibition}, Flexibilität ${e.meta.flexibilitaet}, Aktivierung ${e.meta.aktivierung}, Emotionen ${e.meta.emotionen} (Kontext: ${e.meta.kontext})`;
        }
      }
      return desc;
    });
    
    return `STANDARDISIERTE DIAGNOSEN & 1:1 LIVE-TESTS:\n${testLines.join('\n\n')}`;
  };

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const perf = compilePerformanceData();
      const meet = compileMeetingsData();
      const behav = compileBehaviorData();
      const foerd = compileFoerderAndErlauterungData();
      const portf = compilePortfolioItemsData();
      const attendance = compileAttendanceData();
      const notes = compileNotesData();
      const reflexion = compileReflexionAndKelData();
      const ikm = compileIkmData();
      const diagnostics = compileDiagnosticsData();
      
      const combinedNotes = [notes, student.portfolio && student.portfolio.length > 0 ? `Portfolio-Stücke:\n${portf}` : ''].filter(Boolean).join('\n\n');
      const combinedMeetings = [meet, reflexion !== 'Keine KEL-Reflexionen / Einschätzungen gefunden.' ? `Reflexionskatalog & Einschätzung:\n${reflexion}` : ''].filter(Boolean).join('\n\n');
      const combinedSupport = [foerd, ikm !== 'Keine IKM Plus Ergebnisse vorhanden.' ? `IKM-Informationen:\n${ikm}` : '', diagnostics].filter(Boolean).join('\n\n');

      const res = await generatePortfolioSummary(
        `${student.vorname} ${student.nachname}`,
        perf,
        combinedMeetings,
        combinedNotes,
        attendance,
        combinedSupport,
        portfolioStyle
      );
      if (res) {
        setSummary(res);
        localStorage.setItem(`ki_portfolio_summary_${student.id}`, res);
      } else {
        throw new Error("Fehler beim Generieren");
      }
    } catch (e: any) {
      setError(e.message || "Fehler beim Generieren der Zusammenfassung.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = localStorage.getItem(`ki_portfolio_summary_${student.id}`);
    if (cached) {
      setSummary(cached);
    } else {
      setSummary(null);
    }
  }, [student.id]);

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-purple-500 rounded-full" />
          <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight">Portfolio & Entwicklungs-Zusammenfassung</h3>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={portfolioStyle} 
            onChange={e => setPortfolioStyle(e.target.value)}
            className="hidden sm:block border-slate-200 rounded-2xl px-3 h-10 text-[0.75rem] leading-tight font-bold bg-white text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="Ausgewogen & Professionell">Ausgewogen & Professionell</option>
            <option value="Aufbauend & Motivierend">Aufbauend & Motivierend</option>
            <option value="Sachlich & Kurz">Sachlich & Kurz</option>
            <option value="Sehr formell">Sehr formell</option>
          </select>
          <button 
            onClick={fetchSummary}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-2xl text-[0.6875rem] font-black uppercase tracking-widest transition-all hover:bg-slate-800 disabled:opacity-50 active:scale-95 shadow-lg shadow-slate-200 cursor-pointer"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
            {summary ? 'Aktualisieren' : 'Generieren'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6 py-12">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500 blur-xl opacity-30 rounded-full animate-pulse"></div>
              <Loader2 size={48} className="text-purple-600 animate-spin relative z-10" />
            </div>
            <div className="text-center">
              <p className="text-[0.75rem] font-black uppercase tracking-widest text-purple-600 animate-pulse">KI analysiert Schülerdaten...</p>
              <p className="text-[0.625rem] font-medium text-slate-400 mt-2 max-w-sm mx-auto">Wir bündeln Leistungen, Verhalten, KEL-Vereinbarungen und Portfolio-Entwicklungen.</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-10 bg-rose-50 border border-rose-100 rounded-3xl text-center space-y-4 my-6">
             <p className="text-[0.6875rem] font-black uppercase tracking-widest text-rose-500">{error}</p>
             <button onClick={fetchSummary} className="px-6 py-2 bg-rose-500 text-white rounded-xl text-[0.625rem] font-black uppercase tracking-widest cursor-pointer">Nochmal versuchen</button>
          </div>
        ) : summary ? (
          <div className="bg-slate-50 p-8 lg:p-12 rounded-[2.5rem] border border-slate-200 shadow-inner prose prose-slate prose-sm max-w-none">
            <div className="markdown-body">
               <Markdown>{summary}</Markdown>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6 py-12">
            <div className="w-20 h-20 rounded-[2.5rem] bg-purple-50 flex items-center justify-center text-purple-300">
               <Sparkles size={40} />
            </div>
            <div className="text-center max-w-md">
              <p className="text-[0.75rem] font-black uppercase tracking-widest text-slate-500">KI-Portfolio- & Entwicklungsbericht</p>
              <p className="text-[0.625rem] font-medium text-slate-400 mt-1">
                Generieren Sie eine ganzheitliche pädagogische Zusammenfassung aus allen Leistungen (Notenspiegel, Zeugnisnoten), Verhalten (Einträgen, Abzeichen), Gesprächen (KEL-Protokolle, Ziele) und dem Förderprofil.
              </p>
            </div>
            <button 
              onClick={fetchSummary}
              className="px-8 py-4 bg-purple-500 hover:bg-purple-600 text-white rounded-[2rem] font-black text-[0.875rem] leading-snug uppercase tracking-widest shadow-xl shadow-purple-250 hover:scale-[1.02] transition-all cursor-pointer"
            >
              Bericht generieren
            </button>
          </div>
        )}
      </div>

      {student.portfolio && student.portfolio.length > 0 && (
         <div className="pt-8 border-t border-slate-100 flex items-center gap-6">
            <div className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Basis: {student.portfolio.length} Portfolio-Einträge</div>
            <div className="flex -space-x-4">
              {student.portfolio.slice(0, 5).map((e, idx) => (
                <div key={e.id} className="w-8 h-8 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center shadow-sm " style={{ zIndex: 5 - idx }}>
                   <div className="text-[0.625rem]">📄</div>
                </div>
              ))}
              {student.portfolio.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-[0.625rem] font-bold text-white z-0">
                  +{student.portfolio.length - 5}
                </div>
              )}
            </div>
         </div>
      )}
    </div>
  );
}
