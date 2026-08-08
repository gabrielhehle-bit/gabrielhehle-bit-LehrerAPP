import React, { useState } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  User, Mail, Phone, MapPin, Calendar, Award, 
  BarChart3, Heart, ShieldAlert, ChevronRight, Activity, Notebook, Target,
  X, Loader2, Sparkles, BookOpen, Copy, Save, RefreshCw, MessageSquare, Check,
  TrendingUp, TrendingDown
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import Markdown from 'react-markdown';
import { berechne } from '../../lib/GradeUtils';
import { FAECHER_ALLE } from '../../constants';
import { askAI } from '../../services/aiService';

import StudentTimeline from '../StudentTimeline';
import { FlowerChart } from '../FlowerChart';

interface DossierUebersichtProps {
  student: Student;
  onTabChange: (tab: any) => void;
}

export default function DossierUebersicht({ student, onTabChange }: DossierUebersichtProps) {
  const { app, setApp } = useApp();
  
  // Helper to extract calendar week (standard ISO-8601 week number calculation)
  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const getStudentTrendData = () => {
    const stages = app.behavior_stages || [
      { id: '1', label: 'Super', color: '#10b981', icon: '🌟' },
      { id: '2', label: 'Gut', color: '#3b82f6', icon: '😊' },
      { id: '3', label: 'OK', color: '#94a3b8', icon: '😐' },
      { id: '4', label: 'Ermahnung', color: '#f59e0b', icon: '⚠️' },
      { id: '5', label: 'Inakzeptabel', color: '#ef4444', icon: '🚫' }
    ];

    const studentLogs = (app.statusLog || []).filter((l: any) => l.schuelerId === student.id);
    const hasLogs = studentLogs.length >= 3;
    let finalLogs = [...studentLogs];
    let isSimulated = false;

    if (!hasLogs) {
      isSimulated = true;
      const today = new Date();
      const currentStatusId = app.behavior_status?.[student.id] || app.behavior_default_stage_id || '3';
      const activeIndex = stages.findIndex(st => st.id === currentStatusId);
      let baseIndex = activeIndex !== -1 ? activeIndex : 2;

      const isGoodStudent = (student.badges?.length || 0) > 1 || (student.charakter || []).some(t => ['konzentriert', 'hilfsbereit', 'aufmerksam'].includes(t));
      const isChallenged = (student.charakter || []).some(t => ['impulsstark', 'braucht_fokus'].includes(t));
      if (isGoodStudent && baseIndex > 1) baseIndex = 1;
      if (isChallenged && baseIndex < 2) baseIndex = 2;

      const simulatedEntries = [];
      const comments = {
        0: ["Zeigte vorbildliche Mitarbeit", "Half Mitschülern geduldig", "Sehr hohe Konzentration heute", "Hervorragende Lesestunde"],
        1: ["Hat aktiv mitgearbeitet", "Sehr freundliches Verhalten", "Gute Konzentration bei den Aufgaben", "Aufmerksam im Sitzkreis"],
        2: ["Unauffälliger, stabiler Tag", "Hat Arbeitsaufträge erledigt", "Verhalten im normalen Rahmen", "Ruhig gearbeitet"],
        3: ["Brauchte kleine Ermahnung zur Ruhe", "Etwas unkonzentriert in Partnerarbeit", "Verteilte Stifte statt zu rechnen", "Leise Ermahnung"],
        4: ["Mehrfach gestört, Auszeit genommen", "Lautstarker Konflikt in der Pause", "Aufgabe verweigert", "Regelmissachtung"]
      };

      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - (i * 7 + Math.floor(Math.random() * 3)));
        
        let stepIndex = baseIndex;
        if (Math.random() > 0.5) {
          stepIndex = Math.max(0, Math.min(stages.length - 1, baseIndex + (Math.random() > 0.5 ? 1 : -1)));
        }
        
        const stage = stages[stepIndex] || stages[2];
        const commentPool = comments[stepIndex as keyof typeof comments] || comments[2];
        const comment = commentPool[Math.floor(Math.random() * commentPool.length)];

        simulatedEntries.push({
          id: `sim-${student.id}-${i}`,
          schuelerId: student.id,
          iconId: stage.id,
          datum: date.toISOString().split('T')[0],
          timestamp: date.getTime(),
          comment: comment
        });
      }
      finalLogs = simulatedEntries;
    }

    const today = new Date();
    const weekBins: Record<string, { label: string, scores: number[], comments: string[], dates: string[] }> = {};
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - (i * 7));
      const weekNum = getWeekNumber(d);
      const key = `${d.getFullYear()}-W${weekNum}`;
      
      const mon = new Date(d);
      const dayNum = mon.getDay();
      const diff = mon.getDate() - dayNum + (dayNum === 0 ? -6 : 1);
      const monday = new Date(mon.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const rangeStr = `${monday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - ${sunday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`;
      
      weekBins[key] = {
        label: `KW ${weekNum}`,
        scores: [],
        comments: [],
        dates: [rangeStr]
      };
    }

    finalLogs.forEach(l => {
      const logDate = l.timestamp ? new Date(l.timestamp) : new Date(l.datum);
      const weekNum = getWeekNumber(logDate);
      const key = `${logDate.getFullYear()}-W${weekNum}`;
      
      const stageIdx = stages.findIndex(st => st.id === l.iconId);
      if (stageIdx !== -1) {
        const score = 5 - stageIdx;
        if (weekBins[key]) {
          weekBins[key].scores.push(score);
          if (l.comment) weekBins[key].comments.push(l.comment);
        }
      }
    });

    const trendPoints = Object.entries(weekBins).map(([key, data]) => {
      let avg = 3.0;
      if (data.scores.length > 0) {
        avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      } else {
        avg = 3.0;
      }
      return {
        key,
        label: data.label,
        range: data.dates[0] || '',
        score: Number(avg.toFixed(2)),
        count: data.scores.length,
        comments: data.comments
      };
    }).sort((a, b) => a.key.localeCompare(b.key));

    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    let diff = 0.0;
    if (trendPoints.length >= 2) {
      const last = trendPoints[trendPoints.length - 1].score;
      const prev = trendPoints[trendPoints.length - 2].score;
      diff = last - prev;
      if (diff > 0.15) trendDirection = 'up';
      else if (diff < -0.15) trendDirection = 'down';
      else trendDirection = 'stable';
    }

    return {
      isSimulated,
      trendPoints,
      trendDirection,
      trendDiff: Number(diff.toFixed(2))
    };
  };

  const trendData = getStudentTrendData();

  const handleQuickLog = (stageId: string, label: string) => {
    if (!setApp) return;
    const newLogItem = {
      id: `call-log-${Date.now()}`,
      schuelerId: student.id,
      timestamp: Date.now(),
      iconId: stageId,
      comment: `Verhalten als "${label}" eingestuft.`
    };

    setApp((prev: any) => ({
      ...prev,
      statusLog: [newLogItem, ...(prev.statusLog || [])],
      behavior_status: {
        ...(prev.behavior_status || {}),
        [student.id]: stageId
      }
    }));
  };

  // Custom smart AI dashboard panel state
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedAnalysisTab, setSelectedAnalysisTab] = useState<'entwicklung' | 'elternsprechtag' | 'zeugnis' | 'custom'>('entwicklung');
  const [customQuestion, setCustomQuestion] = useState('');
  
  // Storage for generated results to prevent re-fetching on toggle which would waste tokens/time
  const [aiAnalysisResults, setAiAnalysisResults] = useState<Record<string, string | null>>({
    entwicklung: null,
    elternsprechtag: null,
    zeugnis: null,
    custom: null
  });
  
  const [aiLoadingStates, setAiLoadingStates] = useState<Record<string, boolean>>({
    entwicklung: false,
    elternsprechtag: false,
    zeugnis: false,
    custom: false
  });

  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [savedStates, setSavedStates] = useState<Record<string, boolean>>({});

  const compilePupilContext = (): string => {
    // 1. Stammblatt & General Info
    const general = `Name des Schülers: ${student.vorname} ${student.nachname}
Geburtstag: ${student.geburtstag || 'Unbekannt'}
Klasse: ${app.stufe}. Klasse ${app.klassenbezeichnung}
SPF (Sonderpädagogischer Förderbedarf): ${student.spf ? 'Ja' : 'Nein'}
Außerordentlich (ESPF): ${student.espf ? 'Ja' : 'Nein'}
Deutsch als Zweitsprache (DAZ): ${student.daz ? 'Ja' : 'Nein'}`;

    // 2. Performance / Noten
    const subjects = app.faecher && app.faecher.length > 0 ? app.faecher : FAECHER_ALLE;
    const gradeSummary = subjects.map(subject => {
      const avg = berechne(app, student.id, subject, '1');
      const rawEndnote = app.noten?.[student.id]?.[subject]?.[ '1' ]?.endnote || 
                         app.noten?.[student.id]?.[subject]?.[ '2' ]?.endnote;
      const endnote = rawEndnote || (avg !== null ? Math.round(avg).toString() : '—');
      return { subject, avg, endnote };
    }).filter(item => item.avg !== null || item.endnote !== '—');

    const performance = gradeSummary.length > 0 
      ? gradeSummary.map(g => `- ${g.subject}: Notenschnitt ${g.avg ? g.avg.toFixed(2) : '—'} (Aktuelle Note: ${g.endnote})`).join('\n')
      : 'Keine Notendaten vorhanden.';

    // 3. Behavior / Verhalten
    const behaviorLogs = (app.statusLog || [])
      .filter(l => l.schuelerId === student.id)
      .sort((a,b) => b.timestamp - a.timestamp)
      .slice(0, 8);
    const behaviorText = behaviorLogs.map(l => {
      const dateStr = new Date(l.timestamp).toLocaleDateString('de-DE');
      return `- [${dateStr}] Einstufung: ${l.comment || 'Kein Kommentar'}`;
    }).join('\n') || 'Keine Verhaltenseinträge.';

    const currentStatusId = app.behavior_status?.[student.id] || '3';
    const behaviorStages = app.behavior_stages || [
      { id: '1', label: 'Herausragend', icon: '🌟' },
      { id: '2', label: 'Sehr positiv', icon: '😊' },
      { id: '3', label: 'Normal / Neutral', icon: '😐' },
      { id: '4', label: 'Ermahnung', icon: '⚠️' },
      { id: '5', label: 'Kritisch', icon: '❌' }
    ];
    const currentStage = behaviorStages.find(st => st.id === currentStatusId) || behaviorStages[2];
    const behaviorNotes = app.behavior_notes?.[student.id] || '';
    const studentBadges = (student.badges || []).map(b => `${b.icon} ${b.name}`).join(', ') || 'Keine Abzeichen';

    const behaviorSection = `Aktueller Verhaltensstatus: ${currentStage.icon} ${currentStage.label}
Pädagogische Verhaltensnote/Kommentar: ${behaviorNotes || '—'}
Erhaltene Badges: ${studentBadges}
Verhaltenschronik (Auszug):
${behaviorText}`;

    // 4. KEL & Reflexion
    const latestKel = (app.kelGespraeche || [])
      .filter(k => k.schuelerId === student.id)
      .sort((a,b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())[0];
    const kelText = latestKel 
      ? `Letzte Vereinbarungen (am ${latestKel.datum}): ${latestKel.vereinbarungen || '—'}
Ziele: ${(latestKel.zieleKind || []).map(g => g.ziel).join(' | ') || '—'}`
      : 'Keine KEL-Gespräche oder Zielvereinbarungen eingetragen.';

    // 5. Diagnostik & Live-Tests
    const erhebungen = (app.diagnostikErhebungen || [])
      .filter((e: any) => e.schuelerId === student.id)
      .sort((a: any, b: any) => (b.datum || '').localeCompare(a.datum || ''))
      .slice(0, 5);
    const testText = erhebungen.map((e: any) => {
      const test = (app.diagnostikTests || []).find((t: any) => t.id === e.testId);
      const criticalLabel = e.foerderbedarfErkannt ? ' (⚠️ FÖRDERBEDARF ERKANNT)' : '';
      let desc = `- ${e.datum || 'Unbekannt'}: Test "${test ? test.name : e.testId}" | Ergebnis: ${e.ergebniswert}${criticalLabel}`;
      if (e.kommentar) desc += `\n  * Lehrer-Notiz: ${e.kommentar}`;
      if (e.meta) {
        if (e.meta.type === 'lesen') desc += `\n  * Werte: Wortgenauigkeit ${e.meta.accuracy}%, Lesetempo ${e.meta.rgw} RGW/min, Selbstkorrekturen ${e.meta.selfCorrections || 0}`;
        else if (e.meta.type === 'kopf') desc += `\n  * Werte: Automatisiert ${e.meta.automated}/10, Strategisch ${e.meta.calculated}/10, Zehnerübergangsfehler ${e.meta.carryErrors || 0}, Richtigkeitsquote ${e.meta.correctPercent}%`;
        else if (e.meta.type === 'sprache_grammatik') desc += `\n  * Werte: Niveau ${e.meta.levelTitle}, Erfolgsquote ${e.meta.percentage}%`;
        else if (e.type === 'exekutiv') desc += `\n  * Exekutive Funktionen: Arbeitsgedächtnis ${e.meta.arbeitsgedaechtnis}, Inhibition ${e.meta.inhibition}, Flexibilität ${e.meta.flexibilitaet}, Aktivierung ${e.meta.aktivierung}, Emotionen ${e.meta.emotionen} (Kontext: ${e.meta.kontext})`;
      }
      return desc;
    }).join('\n') || 'Keine diagnostischen Erhebungen vorhanden.';

    // 6. IKM Plus
    const ikmRec = (app.ikmRecords || []).find((r: any) => r.schuelerId === student.id);
    const ikmText = ikmRec 
      ? `Deutsch Lesen (PR): ${ikmRec.deutschLesenPR !== undefined ? ikmRec.deutschLesenPR + '%' : '—'}
Deutsch Zuhören (PR): ${ikmRec.deutschZuhoerenPR !== undefined ? ikmRec.deutschZuhoerenPR + '%' : '—'}
Mathematik (PR): ${ikmRec.mathematikPR !== undefined ? ikmRec.mathematikPR + '%' : '—'}
Pädagogische Stärken (IKM): ${ikmRec.diagnoseStaerken || '—'}
Pädagogische Herausforderungen (IKM): ${ikmRec.diagnoseHerausforderungen || '—'}`
      : 'Keine IKM Plus Daten vorliegend.';

    // 7. Antolin
    const antolinRecords = (app.antolinRecords || []).filter(r => r.schuelerId === student.id);
    const antolinText = antolinRecords.length > 0 
      ? `Gelesene Bücher: ${antolinRecords[0].anzahlBuecher}, Gesamtpunkte: ${antolinRecords[0].punkte}, Erfolgsquote: ${antolinRecords[0].leistung}%`
      : 'Keine Antolin-Historie.';

    // 8. Lehrernotizen & Journal & Interaktionen
    const studentNotes = [
      ...(app.notizen || []).filter(n => n.schuelerId === student.id).map(n => `[${new Date(n.timestamp).toLocaleDateString('de-DE')}] ${n.titel ? n.titel + ': ' : ''}${n.inhalt}`),
      ...(app.notes || []).filter(n => n.schuelerId === student.id).map(n => `[${n.datum}] ${n.kategorie}: ${n.inhalt}`),
      ...(app.journal || []).filter(n => n.schuelerId === student.id).map(n => `[${n.datum}] ${n.kategorie}: ${n.inhalt}`),
      ...(app.interaktionsLog?.eintraege || []).filter(n => n.schuelerId === student.id).map(n => `[${n.datum}] Interaktion (${n.typ}): ${n.kontext} ${n.notiz ? '- ' + n.notiz : ''}`)
    ];
    const notesText = studentNotes.length > 0 
      ? studentNotes.join('\n')
      : 'Keine spezifischen Notizen zum Schüler.';

    // 9. Förderprofil (Skill Radar & Notizen)
    const foerderText = student.foerderprofil 
      ? `Stärken: ${(student.foerderprofil.staerken || []).join(', ') || '—'}
Förderbedarf: ${(student.foerderprofil.foerderbedarfBereiche || []).join(', ') || '—'}
Diagnosen: ${student.foerderprofil.diagnosen || '—'}
Zusatzinfos: ${student.foerderprofil.zusatzinfo || '—'}
Skill-Radar: ${student.foerderprofil.skillRadar ? Object.entries(student.foerderprofil.skillRadar).map(([k,v]) => `${k}:${v}`).join(', ') : '—'}
Ziele: ${(student.foerderprofil.foerderziele || []).map(z => z.ziel).join(' | ') || '—'}`
      : 'Kein Förderprofil hinterlegt.';

    return `--- SCHÜLER-PROFIL: ${student.vorname} ${student.nachname} ---
${general}

1. AKADEMISCHE LEISTUNGEN (Notenschnitt):
${performance}

2. LERN- & SOZIALVERHALTEN:
${behaviorSection}

3. KEL-VEREINBARUNGEN & ZIELE:
${kelText}

4. DIAGNOSTISCHE TESTERGEBNISSE (1:1):
${testText}

5. IKM PLUS ERGEBNISSE:
${ikmText}

6. ANTOLIN LESEEIFER:
${antolinText}

7. PÄDAGOGISCHE NOTIZEN & JOURNAL:
${notesText}

8. FÖRDERPROFIL & EIGNUNGEN:
${foerderText}`;
  };

  const generateAnalysisForTab = async (tab: 'entwicklung' | 'elternsprechtag' | 'zeugnis' | 'custom', promptOverride?: string) => {
    setAiLoadingStates(prev => ({ ...prev, [tab]: true }));
    try {
      const context = compilePupilContext();
      let prompt = '';
      let modusId = 'ki-beurteilung';

      if (tab === 'entwicklung') {
        prompt = `Hier sind alle Daten für den Schüler ${student.vorname} ${student.nachname}:\n\n${context}\n\nErstelle ein umfassendes und tiefgehendes pädagogisches Schülerprofil für ${student.vorname} ${student.nachname} basierend auf allen vorliegenden Daten.\nBaue deine Antwort streng strukturiert mit folgenden Abschnitten auf (schön formatiertes Markdown mit Überschriften, Aufzählungen oder Tabellen):\n\n1. 🌟 **Ganzheitliche Potenziale & Persönlichkeit**: Ein zusammenfassender Absatz über das Wesen des Kindes, seine Rolle in der Klasse und sein generelles Lernverhalten.\n2. 🧠 **Kognitive & Akademische Stärken**: Wo glänzt das Kind besonders (z.B. nach Noten, Antolin-Leseeifer, IKM Plus)? Nenne konkrete quantitative Belege aus den Daten.\n3. ⚠️ **Didaktische Entwicklungsbereiche / Baustellen**: Konkrete fachliche oder überfachliche Bereiche, die erhöhte Aufmerksamkeit bedürfen.\n4. 🎯 **Konkrete Zielvereinbarungen & Maßnahmen**: Nenne 2-3 konkrete, direkt im Unterricht umsetzbare Hilfestellungen (Binnendifferenzierung) zur Unterstützung.`;
      } else if (tab === 'elternsprechtag') {
        modusId = 'ki-reflexion';
        prompt = `Hier sind alle Daten für den Schüler ${student.vorname} ${student.nachname}:\n\n${context}\n\nErstelle eine hochprofessionelle, strukturierte Vorbereitungshilfe (Gesprächsleitfaden) für ein KEL-Gespräch oder einen Elternsprechtag mit den Eltern von ${student.vorname} ${student.nachname}.\nBaue deine Antwort mit folgenden Abschnitten auf:\n\n1. 🌸 **Der positive Einstieg (Wertschätzende Brücke)**: Wie beginne ich das Gespräch mit einer Stärke oder einem positiven Aspekt (z.B. basierend auf Badges, KMP oder KEL)?\n2. 📊 **Fakten-Check für Eltern**: Übersichtliche Darstellung der wichtigsten akademischen Leistungen und Verhaltenspulse (Noten, Fehlzeiten, etc.) in leicht verständlichen Worten, ohne Fachchinesisch.\n3. ⚖️ **Gemeinsame Reflexion & Kindperspektive**: Anknüpfungspunkte an die Selbsteinschätzung des Kindes (falls KEL vorhanden) oder das Lerntempo.\n4. 🤝 **Konkretes Partnerschaftliches Ziel**: Ein konkreter Vorschlag für eine Abmachung, die Schule und Elternhaus gemeinsam tragen können (z.B. tägliches Lesen, Hausaufgabenkontrolle, etc.).`;
      } else if (tab === 'zeugnis') {
        prompt = `Hier sind alle Daten für den Schüler ${student.vorname} ${student.nachname}:\n\n${context}\n\nErstelle einen ausformulierten, professionellen Entwurf für die verbale Beurteilung (Zeugnisbeurteilung) für ${student.vorname} ${student.nachname} am Ende der ${app.stufe}. Schulstufe (Volksschule Österreich).\nAchte streng auf wertschätzendes, aber ehrliches und rechtlich sicheres Formulieren nach den Richtlinien des österreichischen Volksschullehrplans.\nBiete zwei Varianten an:\n\n- **Variante A: Sehr ausführlich & entwicklungsorientiert** (Bezieht Leistungen in Deutsch, Mathe, Sachunterricht sowie das Sozialverhalten mit ein)\n- **Variante B: Kompakt & direkt** (Fokussiert auf die Kernbereiche und ist direkt für Zeugnisvorlagen nutzbar)`;
      } else if (tab === 'custom') {
        modusId = 'ki-helfer';
        const finalQuestion = promptOverride || customQuestion;
        prompt = `Hier sind alle Daten für den Schüler ${student.vorname} ${student.nachname}:\n\n${context}\n\nDer Lehrer fragt Folgendes bezüglich des Schülers:\n"${finalQuestion}"\n\nBeantworte diese Frage präzise, direkt und praxisnah auf Basis des vorliegenden Schülerprofils und pädagogischen Kontextes des Kindes. Vermeide leere Floskeln, liefere echten didaktischen Mehrwert.`;
      }

      const result = await askAI(modusId as any, prompt);
      setAiAnalysisResults(prev => ({ ...prev, [tab]: result }));
      
      // Reset action states after re-generation
      setSavedStates(prev => ({ ...prev, [tab]: false }));
      setCopiedStates(prev => ({ ...prev, [tab]: false }));
    } catch (e: any) {
      setAiAnalysisResults(prev => ({ ...prev, [tab]: `Fehler bei der Generierung: ${e?.message || 'Keine Antwort von der KI'}` }));
    } finally {
      setAiLoadingStates(prev => ({ ...prev, [tab]: false }));
    }
  };

  const handleAIAnalysis = () => {
    setShowAIModal(true);
    // Auto-trigger holistic profile on opening if empty
    if (!aiAnalysisResults.entwicklung && !aiLoadingStates.entwicklung) {
      generateAnalysisForTab('entwicklung');
    }
  };

  const handleSelectTab = (tab: 'entwicklung' | 'elternsprechtag' | 'zeugnis' | 'custom') => {
    setSelectedAnalysisTab(tab);
    if (!aiAnalysisResults[tab] && !aiLoadingStates[tab] && tab !== 'custom') {
      generateAnalysisForTab(tab);
    }
  };

  const handleSaveAsNote = (tab: string, content: string | null) => {
    if (!content) return;
    const tabTitles: Record<string, string> = {
      entwicklung: 'Pädagogische Entwicklungsbeurteilung (KI)',
      elternsprechtag: 'Vorbereitungsleitfaden Elternsprechtag (KI)',
      zeugnis: 'Verbale Zeugnisentwurf (KI)',
      custom: 'Spezifische KI-Analyse / Anfrage'
    };
    
    const newNote = {
      id: Date.now().toString(),
      titel: tabTitles[tab] || 'KI-Analyse',
      inhalt: content,
      icon: '🤖',
      timestamp: Date.now(),
      schuelerId: student.id,
      kategorie: 'Journal'
    };
    
    setApp(prev => ({
      ...prev,
      notizen: [newNote, ...(prev.notizen || [])]
    }));
    
    setSavedStates(prev => ({ ...prev, [tab]: true }));
  };

  const handleCopyToClipboard = (tab: string, content: string | null) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedStates(prev => ({ ...prev, [tab]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [tab]: false }));
    }, 2000);
  };


  // Character trait label map
  const characterLabels: Record<string, { label: string, color: string, emoji: string }> = {
    lebhaft: { label: 'Lebhaft', color: 'bg-orange-50/80 text-orange-700 border-orange-200/50', emoji: '🏃‍♂️' },
    interessiert: { label: 'Interessiert', color: 'bg-amber-50/80 text-amber-700 border-amber-200/50', emoji: '💡' },
    ruhig: { label: 'Ruhig', color: 'bg-indigo-50/80 text-indigo-700 border-indigo-150', emoji: '🤫' },
    konzentriert: { label: 'Konzentriert', color: 'bg-purple-50/80 text-purple-700 border-purple-200/50', emoji: '🎯' },
    aufmerksam: { label: 'Aufmerksam', color: 'bg-teal-50/80 text-teal-700 border-teal-200/50', emoji: '👁️' },
    hilfsbereit: { label: 'Hilfsbereit', color: 'bg-emerald-50/80 text-emerald-700 border-emerald-200/50', emoji: '🤝' },
    kreativ: { label: 'Kreativ', color: 'bg-pink-50/80 text-pink-700 border-pink-200/50', emoji: '🎨' },
    braucht_ruhepol: { label: 'Ruhepol-Bedarf', color: 'bg-sky-50/80 text-sky-700 border-sky-200/50', emoji: '🕊️' },
    braucht_fokus: { label: 'Fokus-Bedarf', color: 'bg-indigo-50/80 text-indigo-700 border-indigo-200/50', emoji: '🎯' },
    impulsstark: { label: 'Impulsstark', color: 'bg-rose-50/80 text-rose-700 border-rose-200/50', emoji: '⚡' },
    braucht_naehe: { label: 'Lehrkraft-Nähe', color: 'bg-violet-50/80 text-violet-700 border-violet-200/50', emoji: '🧑‍🏫' }
  };

  // Grade Calculations (similar to DossierLeistungen-Logic)
  const currentClass = app.classes?.find(c => c.id === app.activeClassId);
  const activeFaecher = app.faecher && app.faecher.length > 0 ? app.faecher : FAECHER_ALLE;
  
  // Calculate trends for subjects
  const getSubjectTrend = (sub: string) => {
     const data = app.noten?.[student.id]?.[sub]?.['1'];
     if (!data) return null;
     
     // Gather all numerical grades from sa, lzk, wp, aufgaben chronologically
     // Assuming arrays are chronological, we just concat them or take the most recent
     // A simple heuristic: combine sa and lzk, filter numbers
     const allGrades: number[] = [];
     if (data.sa) allGrades.push(...data.sa.filter((v): v is number => typeof v === 'number'));
     if (data.lzk) allGrades.push(...data.lzk.filter((v): v is number => typeof v === 'number'));
     
     if (allGrades.length < 2) return null; // Need at least two grades to show a trend
     const lastItem = allGrades[allGrades.length - 1];
     const prevItem = allGrades[allGrades.length - 2];
     
     // lower is better (1 is best, 5 is worst)
     if (lastItem < prevItem) return 'up'; // Improved (e.g. 3 -> 2)
     if (lastItem > prevItem) return 'down'; // Declined
     return 'neutral';
  };

  const studentGradesWithTrends = activeFaecher.map(sub => {
    const avg = berechne(app, student.id, sub, '1');
    const trend = getSubjectTrend(sub);
    return { sub, avg, trend };
  }).filter(item => item.avg !== null && item.avg !== undefined && !isNaN(item.avg));

  const studentGrades = studentGradesWithTrends.map(g => g.avg as number);

  const averageGrade = studentGrades.length > 0
    ? studentGrades.reduce((a, b) => a + b, 0) / studentGrades.length
    : null;

  // Class Average Calculations
  let classAverage: number | null = null;
  if (currentClass) {
    const classGrades = currentClass.schueler.map(s => {
      const sGrades = activeFaecher.map(sub => berechne(app, s.id, sub, '1'))
        .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
      return sGrades.length > 0 ? sGrades.reduce((a, b) => a + b, 0) / sGrades.length : null;
    }).filter((v): v is number => v !== null && !isNaN(v));

    if (classGrades.length > 0) {
      classAverage = classGrades.reduce((a, b) => a + b, 0) / classGrades.length;
    }
  }

  // Comparison status calculation
  const getComparison = () => {
    if (!averageGrade || !classAverage) return { text: 'Keine Noten', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    const diff = averageGrade - classAverage;
    if (diff < -0.2) return { text: 'Über Klassendurchschnitt', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (diff > 0.2) return { text: 'Förderbedarf vorhanden', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    return { text: 'Im Klassendurchschnitt', color: 'bg-blue-50 text-blue-700 border-blue-200' };
  };

  const statusInfo = getComparison();

  // Antolin calculations for dashboard quick summary card
  const antolinLatestAndAverages = React.useMemo(() => {
    const classStudentIds = new Set((currentClass?.schueler || app.schueler || []).map(s => s.id));
    const allRecords = (app.antolinRecords || []).filter(r => classStudentIds.has(r.schuelerId));
    
    const latestRecordsByStudent = allRecords.reduce((acc: any[], rec) => {
      const existing = acc.find(r => r.schuelerId === rec.schuelerId);
      if (!existing || rec.datum > existing.datum) {
        if (existing) {
          acc = acc.filter(r => r.schuelerId !== rec.schuelerId);
        }
        acc.push(rec);
      }
      return acc;
    }, []);

    const totalBooks = latestRecordsByStudent.reduce((sum, r) => sum + r.anzahlBuecher, 0);
    const totalPoints = latestRecordsByStudent.reduce((sum, r) => sum + r.punkte, 0);
    const avgLeistung = latestRecordsByStudent.length ? (latestRecordsByStudent.reduce((sum, r) => sum + r.leistung, 0) / latestRecordsByStudent.length) : 0;
    const avgSchwierigkeit = latestRecordsByStudent.length ? (latestRecordsByStudent.reduce((sum, r) => sum + r.schwierigkeit, 0) / latestRecordsByStudent.length) : 0;

    const avgBooksValue = latestRecordsByStudent.length ? (totalBooks / latestRecordsByStudent.length) : 0;
    const avgPointsValue = latestRecordsByStudent.length ? (totalPoints / latestRecordsByStudent.length) : 0;

    const studentRecords = (app.antolinRecords || [])
      .filter(r => r.schuelerId === student.id)
      .sort((a, b) => b.datum.localeCompare(a.datum));
    
    const latestStudentRec = studentRecords.length > 0 ? studentRecords[0] : null;

    return {
      studentRecords,
      latestStudentRec,
      avgBooksValue,
      avgPointsValue,
      avgLeistungValue: avgLeistung,
      avgSchwierigkeitValue: avgSchwierigkeit
    };
  }, [app.antolinRecords, student.id, currentClass, app.schueler]);

  // Pulse & Interactions (Unified Lern- & Verhaltens-Pulse)
  const getRecentPulses = () => {
    const pulses: Array<{
      id: string;
      datum: Date;
      typ: 'interaktion' | 'verhalten' | 'diagnostik';
      badge: string;
      colorClass: string;
      title: string;
      description?: string;
    }> = [];

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Interaktionen
    if (app.interaktionsLog?.eintraege) {
      app.interaktionsLog.eintraege
        .filter(e => e.schuelerId === student.id)
        .forEach(e => {
          const d = new Date(e.datum);
          pulses.push({
            id: `int-${e.id}`,
            datum: d,
            typ: 'interaktion',
            badge: e.typ ? e.typ.toUpperCase() : 'INTERAKTION',
            colorClass: e.typ === 'lob' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' :
                        e.typ === 'konflikt' ? 'text-rose-700 bg-rose-50 border-rose-100' :
                        e.typ === 'foerderung' ? 'text-amber-700 bg-amber-50 border-amber-100' :
                        'text-blue-700 bg-blue-50 border-blue-100',
            title: e.kontext || 'Interaktion erfasst',
            description: e.notiz || undefined
          });
        });
    }

    // 2. Verhaltens-Logs (statusLog)
    const stages = app.behavior_stages || [
      { id: '1', label: 'Super', color: '#10b981', icon: '🌟' },
      { id: '2', label: 'Gut', color: '#3b82f6', icon: '😊' },
      { id: '3', label: 'OK', color: '#94a3b8', icon: '😐' },
      { id: '4', label: 'Ermahnung', color: '#f59e0b', icon: '⚠️' },
      { id: '5', label: 'Inakzeptabel', color: '#ef4444', icon: '🚫' }
    ];
    if (app.statusLog) {
      app.statusLog
        .filter((l: any) => l.schuelerId === student.id)
        .forEach((l: any) => {
          const d = l.timestamp ? new Date(l.timestamp) : new Date(l.datum);
          const stage = stages.find(s => s.id === l.iconId);
          pulses.push({
            id: `status-${l.id}`,
            datum: d,
            typ: 'verhalten',
            badge: 'STATUS',
            colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-100',
            title: stage ? `${stage.icon} Verhalten: ${stage.label}` : 'Verhalten eingestuft',
            description: l.comment || undefined
          });
        });
    }

    // 3. Diagnostik-Erhebungen (Lern-Pulse)
    if (app.diagnostikErhebungen) {
      app.diagnostikErhebungen
        .filter((e: any) => e.schuelerId === student.id)
        .forEach((e: any) => {
          const d = e.datum ? new Date(e.datum) : new Date();
          const test = app.diagnostikTests?.find((t: any) => t.id === e.testId);
          const ergebnis = e.ergebniswert !== undefined ? `Ergebnis: ${e.ergebniswert}` : '';
          const critical = e.foerderbedarfErkannt ? ' ⚠️ Förderbedarf' : '';
          pulses.push({
            id: `diag-${e.id}`,
            datum: d,
            typ: 'diagnostik',
            badge: 'DIAGNOSTIK',
            colorClass: e.foerderbedarfErkannt ? 'text-rose-700 bg-rose-50 border-rose-150' : 'text-purple-700 bg-purple-50 border-purple-100',
            title: `Lern-Test: ${test?.name || 'Erhebung'}`,
            description: `${ergebnis}${critical}${e.kommentar ? ` - ${e.kommentar}` : ''}`
          });
        });
    }

    // Sort by Date descending
    pulses.sort((a, b) => b.datum.getTime() - a.datum.getTime());

    // Filter to last 7 days
    const last7DaysPulses = pulses.filter(p => p.datum >= sevenDaysAgo);

    return {
      last7DaysPulses: last7DaysPulses.slice(0, 5),
      allPulses: pulses.slice(0, 5)
    };
  };

  const { last7DaysPulses, allPulses } = getRecentPulses();

  // Parse Notiz for Goals (bullet points starting with - or •)
  const agreements = (student.notiz || '').split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'));
  const otherNotes = (student.notiz || '').split('\n').filter(line => !line.trim().startsWith('-') && !line.trim().startsWith('•')).join('\n').trim();

  return (
    <div className="space-y-8 pb-4">
      {/* Welcome & Dashboard Intro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-8 bg-indigo-600 rounded-full" />
          <div>
            <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight">Kompakt-Übersicht</h3>
            <p className="text-[0.75rem] leading-tight font-bold text-slate-400 uppercase tracking-widest mt-0.5">Alle zentralen Entwicklungsbereiche auf einen Blick</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleAIAnalysis}
            className="flex items-center gap-2 text-[0.6875rem] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-full transition-colors"
          >
            <span className="text-indigo-400">✨</span> Profil analysieren (KI)
          </button>
          <span className="text-[0.625rem] font-black uppercase text-indigo-500 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full">
            Dossier-Zusammenfassung
          </span>
        </div>
      </div>

      {/* AI Analysis Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[85vh] border border-slate-100">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-indigo-50 bg-indigo-50/50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shadow-inner">
                  <Sparkles size={18} className="text-indigo-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-semibold text-indigo-900 leading-tight flex items-center gap-2 text-base md:text-lg">
                    KI-Pädagogischer Analyse-Assistent
                  </h3>
                  <p className="text-[0.7rem] font-bold text-indigo-500 uppercase tracking-widest leading-none mt-1">
                    Fokus auf {student.vorname} {student.nachname}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setShowAIModal(false); }}
                className="p-2 hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-600 transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body Container with Dual-Column (Left: Vertical Tabs, Right: Content) */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              
              {/* Left Column: Vertical Control Hub */}
              <div className="w-full md:w-64 bg-slate-50 border-r border-slate-150 p-4 shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible md:overflow-y-auto custom-scrollbar">
                
                <button
                  onClick={() => handleSelectTab('entwicklung')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[0.75rem] font-black uppercase tracking-wider transition-all shrink-0 w-auto md:w-full text-left border ${
                    selectedAnalysisTab === 'entwicklung'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10 border-indigo-600'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <BarChart3 size={15} />
                  <span>Entwicklungsanalyse</span>
                </button>

                <button
                  onClick={() => handleSelectTab('elternsprechtag')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[0.75rem] font-black uppercase tracking-wider transition-all shrink-0 w-auto md:w-full text-left border ${
                    selectedAnalysisTab === 'elternsprechtag'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10 border-indigo-600'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <User size={15} />
                  <span>Elternsprechtag</span>
                </button>

                <button
                  onClick={() => handleSelectTab('zeugnis')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[0.75rem] font-black uppercase tracking-wider transition-all shrink-0 w-auto md:w-full text-left border ${
                    selectedAnalysisTab === 'zeugnis'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10 border-indigo-600'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <Notebook size={15} />
                  <span>Zeugnistext</span>
                </button>

                <button
                  onClick={() => handleSelectTab('custom')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[0.75rem] font-black uppercase tracking-wider transition-all shrink-0 w-auto md:w-full text-left border ${
                    selectedAnalysisTab === 'custom'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10 border-indigo-600'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <MessageSquare size={15} />
                  <span>Eigene Frage</span>
                </button>

                <div className="hidden md:block mt-auto p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 text-[0.625rem] text-slate-500 font-medium leading-relaxed">
                  <p className="font-bold text-indigo-700 uppercase tracking-widest mb-1 block">Sichere KI-Verarbeitung</p>
                  Alle Analysen basieren auf pseudonymisierten schulinternen Stammdaten, Noten sowie Verhaltenseinträgen.
                </div>
              </div>

              {/* Right Column: Display & Interaction Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/30 flex flex-col">
                
                {/* 1. Custom Prompt Input Panel */}
                {selectedAnalysisTab === 'custom' && (
                  <div className="mb-6 bg-white p-5 rounded-3xl border border-slate-150 shadow-sm shrink-0">
                    <label className="block text-[0.6875rem] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Stelle eine eigene pädagogische Frage
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customQuestion}
                        onChange={(e) => setCustomQuestion(e.target.value)}
                        placeholder="Z.B: Welche Fördermaßnahmen in Mathe eignen sich? Oder wie kann ich die Leseleistung steigern?"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && customQuestion.trim() && !aiLoadingStates.custom) {
                            generateAnalysisForTab('custom');
                          }
                        }}
                      />
                      <button
                        onClick={() => generateAnalysisForTab('custom')}
                        disabled={aiLoadingStates.custom || !customQuestion.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-55 text-white text-[0.6875rem] font-black uppercase tracking-wider px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-600/10"
                      >
                        {aiLoadingStates.custom ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                        Anfrage Senden
                      </button>
                    </div>

                    {/* Recommendation chips */}
                    <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider mr-1">Vorschläge:</span>
                      
                      <button
                        onClick={() => {
                          setCustomQuestion(`Was sind die größten pädagogischen Stärken von ${student.vorname}?`);
                          generateAnalysisForTab('custom', `Was sind die größten pädagogischen Stärken von ${student.vorname}?`);
                        }}
                        className="text-[0.625rem] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/50 px-2.5 py-1 rounded-full transition-colors"
                      >
                        🌟 Stärken von {student.vorname}
                      </button>

                      <button
                        onClick={() => {
                          setCustomQuestion(`Welche konkreten, binnendifferenzierten Förderideen hast du für ${student.vorname} im mathematischen Bereich?`);
                          generateAnalysisForTab('custom', `Welche konkreten, binnendifferenzierten Förderideen hast du für ${student.vorname} im mathematischen Bereich?`);
                        }}
                        className="text-[0.625rem] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/50 px-2.5 py-1 rounded-full transition-colors"
                      >
                        🧮 Mathe-Förderideen
                      </button>

                      <button
                        onClick={() => {
                          setCustomQuestion(`Wie kann ich ein KEL-Gespräch vorbereiten, um das Thema Schüchternheit oder mangelnde Mitarbeit sensibel anzusprechen?`);
                          generateAnalysisForTab('custom', `Wie kann ich ein KEL-Gespräch vorbereiten, um das Thema Schüchternheit oder mangelnde Mitarbeit sensibel anzusprechen?`);
                        }}
                        className="text-[0.625rem] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/50 px-2.5 py-1 rounded-full transition-colors"
                      >
                        🤝 KEL-Mitarbeit Tipps
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Response / Message Content Window */}
                <div className="flex-1 bg-white border border-slate-150 rounded-3xl p-6 shadow-xs overflow-y-auto relative flex flex-col justify-between min-h-[300px]">
                  
                  {/* Content State Engine */}
                  {aiLoadingStates[selectedAnalysisTab] ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 text-indigo-600 gap-4">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
                        <Sparkles size={18} className="text-indigo-600 absolute inset-0 m-auto animate-pulse" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-slate-800 animate-pulse">
                          {selectedAnalysisTab === 'entwicklung' && 'Umfassendes Schüler-Lernprofil wird berechnet...'}
                          {selectedAnalysisTab === 'elternsprechtag' && 'Elternsprechtags-Leitfaden wird ausformuliert...'}
                          {selectedAnalysisTab === 'zeugnis' && 'Rechtlich konforme Zeugnisnoten-Entwürfe werden erstellt...'}
                          {selectedAnalysisTab === 'custom' && 'Pädagogische Anfrage wird verarbeitet...'}
                        </p>
                        <p className="text-[0.6875rem] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                          Sammle Zeugnisnoten und Verhaltenseinträge
                        </p>
                      </div>
                    </div>
                  ) : aiAnalysisResults[selectedAnalysisTab] ? (
                    
                    <div className="prose prose-sm prose-slate max-w-none text-slate-700 leading-relaxed font-semibold">
                      <div className="markdown-body text-[0.8125rem] leading-relaxed">
                        <Markdown>{aiAnalysisResults[selectedAnalysisTab]!}</Markdown>
                      </div>
                    </div>

                  ) : (
                    
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16 gap-3">
                      <MessageSquare size={36} className="text-slate-350" />
                      <div className="text-center max-w-sm">
                        <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Bereit für die Anfrage</p>
                        <p className="text-[0.6875rem] text-slate-400 mt-1">
                          Gib oben deine individuelle Frage ein oder nutze einen unserer Vorschläge, um eine KI-gestützte Analyse zu starten.
                        </p>
                      </div>
                    </div>

                  )}

                  {/* 3. Action Belt (Only shown if results are generated and we are not in loading state) */}
                  {aiAnalysisResults[selectedAnalysisTab] && !aiLoadingStates[selectedAnalysisTab] && (
                    <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3 shrink-0">
                      
                      <div className="text-[0.625rem] font-bold text-slate-404">
                        Pädagogische Vorschau • Letztes Update: gerade eben
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Repeat / Regenerate */}
                        <button
                          onClick={() => generateAnalysisForTab(selectedAnalysisTab)}
                          className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[0.625rem] font-black uppercase tracking-wider px-3  py-2 rounded-xl transition-all"
                          title="Neu generieren"
                        >
                          <RefreshCw size={12} />
                          <span>Neu laden</span>
                        </button>

                        {/* Save as Note */}
                        <button
                          onClick={() => handleSaveAsNote(selectedAnalysisTab, aiAnalysisResults[selectedAnalysisTab])}
                          disabled={savedStates[selectedAnalysisTab]}
                          className={`flex items-center gap-1.5 border text-[0.625rem] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all ${
                            savedStates[selectedAnalysisTab]
                              ? 'bg-emerald-50 border-emerald-250 text-emerald-700 shadow-none'
                              : 'bg-white hover:bg-slate-50 border-slate-250 text-slate-700 shadow-sm'
                          }`}
                        >
                          {savedStates[selectedAnalysisTab] ? <Check size={12} /> : <Save size={12} />}
                          <span>{savedStates[selectedAnalysisTab] ? 'Gespeichert ✓' : 'In Chronik sichern'}</span>
                        </button>

                        {/* Copy to Clipboard */}
                        <button
                          onClick={() => handleCopyToClipboard(selectedAnalysisTab, aiAnalysisResults[selectedAnalysisTab])}
                          className={`flex items-center gap-1.5 text-[0.625rem] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all shadow-sm ${
                            copiedStates[selectedAnalysisTab]
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-none'
                              : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-600 text-white shadow-indigo-600/10'
                          }`}
                        >
                          {copiedStates[selectedAnalysisTab] ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedStates[selectedAnalysisTab] ? 'Kopiert! ✓' : 'Kopieren'}</span>
                        </button>
                      </div>

                    </div>
                  )}

                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* Grid Bento Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        
        {/* CARD 1: Stammblatt Quick Look */}
        <div 
          onClick={() => onTabChange('stammdaten')}
          className="bg-slate-50/50 border border-slate-200/80 rounded-[2rem] p-6 flex flex-col justify-between hover:border-slate-400 hover:shadow-md hover:bg-white transition-all cursor-pointer group/card active:scale-[0.99] duration-350"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-450 flex items-center gap-1.5">
                <User size={13} className="text-indigo-500" /> Stammblatt & Kontakte
              </h4>
              <span className="text-[0.5625rem] font-bold text-slate-405">Schuljahr {app.schuljahr || '—'}</span>
            </div>

            <div className="flex items-center gap-4">
              {student.foto ? (
                <img src={student.foto} alt="" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-100 shrink-0 shadow-sm" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-[1.25rem] leading-normal font-black shrink-0 shadow-inner">
                  {student.vorname.charAt(0)}{student.nachname.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-[1.125rem] leading-normal font-black text-slate-900 leading-tight">{student.vorname} {student.nachname}</p>
                <p className="text-[0.75rem] leading-tight text-slate-500 font-bold mt-1 uppercase tracking-wide">
                  {app.stufe}. Klasse {app.klassenbezeichnung}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3">
              <div className="bg-white/80 border border-slate-200/50 p-3 rounded-xl flex items-center gap-2.5">
                <Calendar size={14} className="text-slate-400" />
                <div className="min-w-0">
                  <span className="text-[0.5rem] font-extrabold text-slate-400 uppercase block leading-none">Geburtstag</span>
                  <p className="text-[0.75rem] leading-tight font-black text-slate-800 mt-1 text-wrap leading-tight break-words">
                    {student.geburtstag ? new Date(student.geburtstag).toLocaleDateString('de-DE') : '—'}
                  </p>
                </div>
              </div>

              <div className="bg-white/80 border border-slate-200/50 p-3 rounded-xl flex items-center gap-2.5">
                <User size={14} className="text-slate-400" />
                <div className="min-w-0">
                  <span className="text-[0.5rem] font-extrabold text-slate-400 uppercase block leading-none">SV-Nummer</span>
                  <p className="text-[0.75rem] leading-tight font-black text-slate-800 mt-1 text-wrap leading-tight break-words">{student.sv_nummer || '—'}</p>
                </div>
              </div>
            </div>

            {/* Quick Contacts Table */}
            <div className="space-y-2 pt-2 text-[0.75rem] leading-tight">
              {student.email_eltern && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail size={12} className="text-slate-400 shrink-0" />
                  <span className="text-wrap leading-tight break-words font-medium">{student.email_eltern}</span>
                </div>
              )}
              {(student.telefon_mutter || student.telefon_vater) && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone size={12} className="text-slate-400 shrink-0" />
                  <span className="font-medium text-wrap leading-tight break-words">{student.telefon_mutter || student.telefon_vater}</span>
                </div>
              )}
              {student.anschrift && (
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin size={12} className="text-slate-400 shrink-0" />
                  <span className="text-wrap leading-tight break-words font-medium">{student.plz} {student.ort}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200/60 flex justify-end">
            <button 
              onClick={() => onTabChange('stammdaten')}
              className="text-[0.75rem] leading-tight font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group active:scale-95 transition-all"
            >
              Vollständige Stammdaten bearbeiten 
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* CARD 2: Leistungs- & Notenspiegel */}
        <div 
          onClick={() => onTabChange('leistungen')}
          className="bg-slate-50/50 border border-slate-200/80 rounded-[2rem] p-6 flex flex-col justify-between hover:border-slate-400 hover:shadow-md hover:bg-white transition-all cursor-pointer group/card active:scale-[0.99] duration-350"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-450 flex items-center gap-1.5">
                <BarChart3 size={13} className="text-amber-500" /> Leistungs- & Notenschnitt
              </h4>
              <span className="text-[0.5625rem] font-bold text-slate-405">Semester 1</span>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="bg-white/80 border border-slate-200/60 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-3xs">
                <span className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider mb-1">Mittelwert</span>
                <span className="text-4xl font-black text-indigo-600 tracking-tight leading-none">
                  {averageGrade ? averageGrade.toFixed(2) : '—'}
                </span>
                <span className="text-[0.5rem] font-black text-slate-400 bg-slate-100 border border-slate-150 px-2 py-0.5 rounded-full uppercase mt-3">
                  Schüler-Schnitt
                </span>
              </div>

              <div className="bg-white/80 border border-slate-200/60 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-3xs">
                <span className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider mb-1">Klasse</span>
                <span className="text-4xl font-black text-slate-700 tracking-tight leading-none">
                  {classAverage ? classAverage.toFixed(2) : '—'}
                </span>
                <span className="text-[0.5rem] font-black text-slate-400 bg-slate-100 border border-slate-150 px-2 py-0.5 rounded-full uppercase mt-3">
                  Klassen-Schnitt
                </span>
              </div>
            </div>

            <div className="pt-2">
              <div className={`p-3 rounded-2xl border text-center font-black uppercase text-[0.625rem] tracking-wider inline-block w-full ${statusInfo.color}`}>
                Status: {statusInfo.text}
              </div>
            </div>

            {studentGradesWithTrends.length > 0 && (
              <div className="pt-2 space-y-1">
                 <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest block mb-2">Aktuelle Trends</span>
                 <div className="flex flex-wrap gap-2">
                   {studentGradesWithTrends.slice(0, 5).map(g => (
                     <div key={g.sub} className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-lg text-[0.75rem] leading-tight font-bold text-slate-700 shadow-3xs">
                       <span className="text-wrap leading-tight break-words max-w-[80px]">{g.sub}</span>
                       <span className="text-[0.625rem] w-4 text-center tabular-nums">{g.avg.toFixed(1)}</span>
                       {g.trend === 'up' && <span className="text-emerald-500 font-black">↑</span>}
                       {g.trend === 'down' && <span className="text-rose-500 font-black">↓</span>}
                       {g.trend === 'neutral' && <span className="text-slate-300 font-black">–</span>}
                     </div>
                   ))}
                 </div>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200/60 flex justify-end">
            <button 
              onClick={() => onTabChange('leistungen')}
              className="text-[0.75rem] leading-tight font-black text-amber-600 hover:text-amber-800 flex items-center gap-1 group active:scale-95 transition-all"
            >
              Leistungsanalyse & Notenliste 
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* CARD 3: Charaktereigenschaften & Badges */}
        <div 
          onClick={() => onTabChange('stats')}
          className="bg-slate-50/50 border border-slate-200/80 rounded-[2rem] p-6 flex flex-col justify-between hover:border-slate-400 hover:shadow-md hover:bg-white transition-all cursor-pointer group/card active:scale-[0.99] duration-350"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-450 flex items-center gap-1.5">
                <Award size={13} className="text-amber-500" /> Charakter & Auszeichnungen
              </h4>
            </div>

            {/* Character Traits Section */}
            <div className="space-y-2">
              <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest block">Sozial- & Arbeitsverhalten (Tags)</span>
              {student.charakter && student.charakter.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {student.charakter.map(trait => {
                    const info = characterLabels[trait];
                    if (!info) return null;
                    return (
                      <span key={trait} className={`px-2 py-1 ${info.color} text-[0.59375rem] font-black rounded-xl border shadow-3xs flex items-center gap-1`}>
                        <span>{info.emoji}</span>
                        <span>{info.label}</span>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[0.75rem] leading-tight font-medium text-slate-400 italic">Noch keine Charaktereigenschaften eingetragen.</p>
              )}
            </div>

            {/* Badges Section */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest block">Erreichte Medaillen & Badges ({student.badges?.length || 0})</span>
              {student.badges && student.badges.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {student.badges.map(b => (
                    <div key={b.id} className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl text-[0.625rem] font-black text-amber-800 flex items-center gap-1.5">
                      <span>{b.icon}</span>
                      <span>{b.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[0.75rem] leading-tight font-medium text-slate-400 italic">Noch keine Abzeichen verliehen.</p>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200/60 flex justify-end">
            <button 
              onClick={() => onTabChange('stats')}
              className="text-[0.75rem] leading-tight font-black text-emerald-600 hover:text-emerald-800 flex items-center gap-1 group active:scale-95 transition-all"
            >
              Abzeichen vergeben & verwalten 
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* CARD 4: Förderprofil & Pädagogischer Fokus */}
        <div 
          onClick={() => onTabChange('foerderprofil')}
          className="bg-slate-50/50 border border-slate-200/80 rounded-[2rem] p-6 flex flex-col justify-between hover:border-slate-400 hover:shadow-md hover:bg-white transition-all cursor-pointer group/card active:scale-[0.99] duration-350"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-450 flex items-center gap-1.5">
                <Heart size={13} className="text-rose-500" /> Stärken, Ressourcen & Support
              </h4>
            </div>

            {/* Diagnosen / Wichtige Hinweise */}
            {(student.foerderprofil?.diagnosen || student.spf || student.espf || student.daz) && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5">
                <ShieldAlert size={15} className="text-red-500 shrink-0 mt-0.5 animate-pulse" />
                <div className="min-w-0">
                  <span className="text-[0.5rem] font-black uppercase text-red-700 block tracking-widest">Achtung: Pädagogischer Hilfebedarf</span>
                  <p className="text-[0.75rem] leading-tight font-bold text-red-900 mt-1 line-clamp-2">
                    {student.foerderprofil?.diagnosen || 'Besondere Rahmenbedingungen aktiv (SPF / DAZ).'}
                  </p>
                </div>
              </div>
            )}

            {/* Strengths List */}
            <div className="space-y-2">
              <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest block">Dokumentierte Stärken (Förderprofil)</span>
              {student.foerderprofil?.staerken && student.foerderprofil.staerken.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {student.foerderprofil.staerken.map((s, idx) => (
                    <span key={idx} className="bg-rose-50/80 border border-rose-100 px-2.5 py-1 rounded-xl text-[0.625rem] font-black text-rose-700 flex items-center gap-1">
                      🌟 {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[0.75rem] leading-tight font-medium text-slate-400 italic">Noch keine Talente oder Ressourcen im Förderprofil eingetragen.</p>
              )}
            </div>

            {/* Educational Notes Preview & Goals */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              {agreements.length > 0 && (
                <div>
                  <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1 mb-2">
                    <Target size={11} className="text-emerald-500" /> Ausgemachte Lernziele & Vereinbarungen
                  </span>
                  <div className="space-y-1.5">
                    {agreements.map((agreement, idx) => (
                      <div key={idx} className="flex gap-2 p-2 bg-emerald-50/50 border border-emerald-100 rounded-xl text-[0.75rem] font-bold text-emerald-800">
                        <div className="w-4 h-4 rounded-full border border-emerald-300 bg-white shrink-0 mt-0.5" />
                        <span className="leading-tight pt-0.5">{agreement.replace(/^-|•/, '').trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {otherNotes && (
                <div>
                  <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1 mb-1">
                    <Notebook size={11} className="text-amber-500" /> Letzter Fokus der Lehrperson
                  </span>
                  <p className="text-[0.75rem] leading-tight font-medium text-slate-500/90 leading-relaxed italic line-clamp-3">
                    {otherNotes}
                  </p>
                </div>
              )}

              {!otherNotes && agreements.length === 0 && (
                <div>
                  <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1 mb-1">
                    <Notebook size={11} className="text-amber-500" /> Letzter Fokus der Lehrperson
                  </span>
                  <p className="text-[0.75rem] leading-tight font-medium text-slate-500/90 leading-relaxed italic line-clamp-2">
                    Keine pädagogischen Notizen oder Vereinbarungen hinterlegt.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200/60 flex justify-end">
            <button 
              onClick={() => onTabChange('foerderprofil')}
              className="text-[0.75rem] leading-tight font-black text-rose-600 hover:text-rose-800 flex items-center gap-1 group active:scale-95 transition-all"
            >
              Förderprofil & Ressourcen öffnen 
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* CARD 5: Lern- & Verhaltens-Pulse (NEW) */}
        <div 
          onClick={() => onTabChange('stats')}
          className="bg-slate-50/50 border border-slate-200/80 rounded-[2rem] p-6 flex flex-col justify-between hover:border-slate-400 hover:shadow-md hover:bg-white transition-all cursor-pointer group/card active:scale-[0.99] duration-350 md:col-span-2 lg:col-span-1"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-450 flex items-center gap-1.5">
                <Activity size={13} className="text-blue-500" /> Lern- & Verhaltens-Pulse
              </h4>
            </div>

            {/* Quick 1-Click Emoji Pulse Logger */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-slate-200 p-3 rounded-2xl shadow-3xs space-y-2 cursor-default"
            >
              <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest block">Verhalten heute schnell loggen (1-Click)</span>
              <div className="flex justify-between gap-1.5">
                {[
                  { id: '1', label: 'Herausragend', icon: '🌟' },
                  { id: '2', label: 'Sehr positiv', icon: '😊' },
                  { id: '3', label: 'Normal', icon: '😐' },
                  { id: '4', label: 'Ermahnung', icon: '⚠️' },
                  { id: '5', label: 'Kritisch', icon: '❌' }
                ].map(stage => (
                  <button
                    key={stage.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickLog(stage.id, stage.label);
                    }}
                    className="flex-1 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 active:scale-90 border border-slate-200 rounded-xl transition-all text-sm flex items-center justify-center gap-1 cursor-pointer"
                    title={`Als "${stage.label}" protokollieren`}
                  >
                    <span>{stage.icon}</span>
                  </button>
                ))}
              </div>
            </div>

            {last7DaysPulses.length > 0 ? (
              <div className="space-y-3">
                {last7DaysPulses.map(pulse => (
                  <div key={pulse.id} className="flex gap-3 text-[0.75rem] font-medium text-slate-700 bg-white p-3 rounded-xl border border-slate-100 shadow-3xs">
                     <div className={`px-2 py-1 uppercase text-[0.5625rem] font-black tracking-widest rounded-lg border h-fit shrink-0 ${pulse.colorClass}`}>
                       {pulse.badge}
                     </div>
                     <div className="space-y-0.5">
                       <p className="leading-snug font-bold text-slate-800">{pulse.title}</p>
                       {pulse.description && <p className="text-[0.6875rem] text-slate-500 leading-normal">{pulse.description}</p>}
                       <span className="text-[0.625rem] text-slate-400 font-bold block">{pulse.datum.toLocaleDateString('de-DE')}</span>
                     </div>
                  </div>
                ))}
              </div>
            ) : allPulses.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[0.6875rem] font-bold text-slate-400 uppercase tracking-wider mb-2">Keine Pulse in den letzten 7 Tagen. Kürzliche Einträge:</p>
                {allPulses.map(pulse => (
                  <div key={pulse.id} className="flex gap-3 text-[0.75rem] font-medium text-slate-700 bg-white p-3 rounded-xl border border-slate-100 shadow-3xs">
                     <div className={`px-2 py-1 uppercase text-[0.5625rem] font-black tracking-widest rounded-lg border h-fit shrink-0 ${pulse.colorClass}`}>
                       {pulse.badge}
                     </div>
                     <div className="space-y-0.5">
                       <p className="leading-snug font-bold text-slate-800">{pulse.title}</p>
                       {pulse.description && <p className="text-[0.6875rem] text-slate-500 leading-normal">{pulse.description}</p>}
                       <span className="text-[0.625rem] text-slate-400 font-bold block">{pulse.datum.toLocaleDateString('de-DE')}</span>
                     </div>
                  </div>
                ))}
              </div>
            ) : (
                <div className="bg-white/60 border border-slate-100 p-6 rounded-2xl flex items-center justify-center text-center">
                   <p className="text-[0.75rem] text-slate-400 font-medium">Keine aktuellen Einträge im Verhaltens-Protokoll vorhanden.</p>
                </div>
            )}
          </div>
          <div className="pt-4 mt-4 border-t border-slate-200/60 flex justify-end">
            <button 
              onClick={() => onTabChange('stats')}
              className="text-[0.75rem] leading-tight font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 group active:scale-95 transition-all"
            >
              Zum Verhaltens-Journal
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* CARD 6: Antolin-Leseanalyse & Klassenvergleich (NEW) */}
        <div 
          onClick={() => onTabChange('diagnostik')}
          className="bg-slate-50/50 border border-slate-200/80 rounded-[2rem] p-6 flex flex-col justify-between hover:border-slate-400 hover:shadow-md hover:bg-white transition-all cursor-pointer group/card active:scale-[0.99] duration-350 md:col-span-2 lg:col-span-1"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-450 flex items-center gap-1.5">
                <BookOpen size={13} className="text-indigo-600" /> Antolin Lese-Zusammenfassung
              </h4>
              {antolinLatestAndAverages.latestStudentRec && (
                <span className="text-[0.5625rem] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase">
                  Aktiv
                </span>
              )}
            </div>

            {antolinLatestAndAverages.latestStudentRec ? (() => {
              const latest = antolinLatestAndAverages.latestStudentRec;
              const avgBooks = antolinLatestAndAverages.avgBooksValue;
              const avgPoints = antolinLatestAndAverages.avgPointsValue;
              const avgLeistung = antolinLatestAndAverages.avgLeistungValue;
              const avgSchwierigkeit = antolinLatestAndAverages.avgSchwierigkeitValue;

              return (
                <div className="space-y-4">
                  {/* Key metrics grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/80 p-3 rounded-xl border border-slate-200/50 flex flex-col justify-between h-[85px]">
                      <div>
                        <span className="text-[0.5rem] font-black uppercase text-slate-400">Bücher gelesen</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-lg font-black text-slate-800 font-mono">{latest.anzahlBuecher}</span>
                          <span className="text-[0.625rem] text-slate-400 font-bold">Ø {avgBooks.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="mt-1">
                        {latest.anzahlBuecher >= avgBooks ? (
                          <span className="text-[0.55rem] text-emerald-600 font-black">Über Schnitt ↑</span>
                        ) : (
                          <span className="text-[0.55rem] text-rose-500 font-black">Unter Schnitt ↓</span>
                        )}
                      </div>
                    </div>

                    <div className="bg-white/80 p-3 rounded-xl border border-slate-200/50 flex flex-col justify-between h-[85px]">
                      <div>
                        <span className="text-[0.5rem] font-black uppercase text-slate-400">Punkte gesammelt</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-lg font-black text-amber-700 font-mono">{latest.punkte}</span>
                          <span className="text-[0.625rem] text-slate-400 font-bold">Ø {avgPoints.toFixed(0)}</span>
                        </div>
                      </div>
                      <div className="mt-1">
                        {latest.punkte >= avgPoints ? (
                          <span className="text-[0.55rem] text-emerald-600 font-black">Über Schnitt ↑</span>
                        ) : (
                          <span className="text-[0.55rem] text-slate-400 font-black">Unter Schnitt ↓</span>
                        )}
                      </div>
                    </div>

                    <div className="bg-white/80 p-3 rounded-xl border border-slate-200/50 flex flex-col justify-between h-[85px]">
                      <div>
                        <span className="text-[0.5rem] font-black uppercase text-slate-400">Erfolgsquote</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-lg font-black text-slate-800 font-mono">{latest.leistung}%</span>
                          <span className="text-[0.625rem] text-slate-400 font-bold">Ø {avgLeistung.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="mt-1">
                        {latest.leistung >= 80 ? (
                          <span className="text-[0.55rem] text-emerald-600 font-black">Hohe Präzision 🎯</span>
                        ) : (
                          <span className="text-[0.55rem] text-amber-600 font-black">Flüchtigkeitsrisiko ⚠️</span>
                        )}
                      </div>
                    </div>

                    <div className="bg-white/80 p-3 rounded-xl border border-slate-200/50 flex flex-col justify-between h-[85px]">
                      <div>
                        <span className="text-[0.5rem] font-black uppercase text-slate-400">Buchschwierigkeit</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-lg font-black text-slate-800 font-mono">ST {latest.schwierigkeit}</span>
                          <span className="text-[0.625rem] text-slate-400 font-bold font-sans">Ø {avgSchwierigkeit.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="mt-1">
                        {latest.schwierigkeit > avgSchwierigkeit ? (
                          <span className="text-[0.55rem] text-indigo-600 font-black">Schwerere Bücher 📚</span>
                        ) : (
                          <span className="text-[0.55rem] text-emerald-600 font-black">Optimaler Fluss 🌱</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Verbal interpretation summary */}
                  <div className="p-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 text-[0.725rem] font-semibold text-slate-700">
                    <p className="leading-relaxed">
                      {latest.anzahlBuecher >= avgBooks ? (
                        latest.schwierigkeit >= avgSchwierigkeit ? (
                          <span>🧠 <strong>Anspruchsvolle/r Vielleser/in</strong>: Liest überdurchschnittlich viel und wählt sichtlich anspruchsvollere Bücher als die Klasse.</span>
                        ) : (
                          <span>🌟 <strong>Fleißige/r Leser/in</strong>: Hohe Lesemotivation bei altersgerechten, passgenauen Geschichten.</span>
                        )
                      ) : (
                        latest.anzahlBuecher > 0 ? (
                          <span>🌱 <strong>Entwickelndes Leseinteresse</strong>: Nimmt bereits am Leseprogramm teil; Steigerung der Häufigkeit empfohlen.</span>
                        ) : (
                          <span>⚠️ Noch keine Leseteilnahme im Antolin-Portal verzeichnet.</span>
                        )
                      )}
                    </p>
                  </div>
                </div>
              );
            })() : (
              <div className="py-8 text-center text-slate-400 text-[0.75rem] font-semibold leading-relaxed italic space-y-3">
                <p>Noch keine Antolin-Daten für {student.vorname} erfasst.</p>
                <div className="px-3.5 py-1.5 bg-slate-100 inline-block rounded-xl text-[0.625rem] font-black uppercase text-slate-500 tracking-wider font-sans">
                  Klassenvergleich nach Import verfügbar
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200/60 flex justify-end">
            <button 
              onClick={() => onTabChange('diagnostik')}
              className="text-[0.75rem] leading-tight font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group active:scale-95 transition-all"
            >
              Kompletten Klassenvergleich & KI-Interpretation 
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

      </div>

      {/* Visual Behavior Trend Card */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 lg:p-8 hover:shadow-xs transition-shadow w-full space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
              <Activity size={20} className="text-blue-500" />
            </span>
            <div>
              <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Verhalten & Impulse</h4>
              <h3 className="text-[1.125rem] leading-normal font-black text-slate-800 tracking-tight">Visuelle Trendanalyse (Verhaltenskurve)</h3>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {trendData.isSimulated && (
              <span className="text-[0.5625rem] font-black uppercase bg-amber-50 text-amber-700 border border-amber-100/60 px-2.5 py-1 rounded-lg">
                Referenz simuliert
              </span>
            )}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[0.6875rem] font-black uppercase tracking-wide border ${
              trendData.trendDirection === 'up' 
                ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                : trendData.trendDirection === 'down' 
                ? 'text-rose-700 bg-rose-50 border-rose-100' 
                : 'text-slate-600 bg-slate-50 border-slate-200'
            }`}>
              {trendData.trendDirection === 'up' ? (
                <>
                  <TrendingUp size={14} />
                  Trend: Verbesserung (+{trendData.trendDiff})
                </>
              ) : trendData.trendDirection === 'down' ? (
                <>
                  <TrendingDown size={14} />
                  Trend: Rückläufig ({trendData.trendDiff})
                </>
              ) : (
                <>
                  <Activity size={14} className="text-slate-500" />
                  Trend: Stabil (Ausgeglichen)
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Descriptive analysis card */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 rounded-2xl border border-blue-50 bg-blue-50/20 text-[0.725rem] leading-relaxed space-y-3 text-slate-700 font-medium">
              <p>
                Diese Trendlinie aggregiert alle Einträge der wöchentlichen Verhaltenserfassungen und zeigt die Dynamik der 
                Einschätzungen für <strong>{student.vorname}</strong> über einen kontinuierlichen 6-Wochen-Zeitraum.
              </p>
              <div className="border-t border-blue-100/60 pt-3">
                <span className="font-extrabold uppercase text-[0.5625rem] text-slate-400 block mb-1">Pädagogische Empfehlung:</span>
                {trendData.trendDirection === 'up' ? (
                  <span>
                    🚀 <strong>Hervorragende Entwicklung</strong>: Bestätige das positive Verhalten durch ein lobendes Kurzgespräch ("Ipsatives Feedback"), um die autonome Lernmotivation fortlaufend zu stärken.
                  </span>
                ) : trendData.trendDirection === 'down' ? (
                  <span>
                    ⚠️ <strong>Fokusgespräch empfohlen</strong>: Suche zeitnah das vertrauliche Gespräch mit {student.vorname}, um Ursachen des Abwärtstrends zu reflektieren und gemeinsam eine Verhaltensvereinbarung zu treffen.
                  </span>
                ) : (
                  <span>
                    🌱 <strong>Konsistente Haltung</strong>: Das Sozial- und Arbeitsverhalten bewegt sich auf einem stabilen Niveau. Reite auf der Welle der Beständigkeit und belohne stille Erfolge.
                  </span>
                )}
              </div>
            </div>

            {trendData.isSimulated && (
              <p className="text-[0.625rem] leading-normal text-slate-400 font-medium italic">
                ℹ️ Hinweis für die Lehrkraft: Da für {student.vorname} noch keine historischen Journal-Einträge vorliegen, basiert dieser Verlauf auf den hinterlegten Charakterzügen und dem aktuellen Status. Sobald neue Daten erfasst werden, fließen diese live ein.
              </p>
            )}
          </div>

          {/* Line Chart */}
          <div className="lg:col-span-8 h-72 w-full bg-slate-50/30 border border-slate-100 rounded-3xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData.trendPoints} margin={{ top: 15, right: 30, left: 15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                />
                <YAxis 
                  domain={[1, 5]} 
                  ticks={[1, 2, 3, 4, 5]} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => {
                    if (val === 5) return '🌟 Super';
                    if (val === 4) return '😊 Gut';
                    if (val === 3) return '😐 OK';
                    if (val === 2) return '⚠️ Achtung';
                    if (val === 1) return '🚫 Kritisch';
                    return '';
                  }}
                  tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} 
                  width={75}
                />
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const scoreLabel = data.score >= 4.5 ? '🌟 Super' : data.score >= 3.5 ? '😊 Gut' : data.score >= 2.5 ? '😐 OK' : data.score >= 1.5 ? '⚠️ Achtung' : '🚫 Kritisch';
                      return (
                        <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 shadow-xl max-w-xs text-[0.725rem] leading-normal space-y-1.5 font-sans">
                          <p className="font-extrabold uppercase tracking-wide text-slate-400 text-[0.5625rem]">{data.label} ({data.range})</p>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-white text-[0.8125rem]">Ø-Index: {data.score}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[0.5625rem] font-bold text-slate-300">
                              {scoreLabel}
                            </span>
                          </div>
                          {data.comments && data.comments.length > 0 && (
                            <div className="border-t border-slate-800 pt-1.5 space-y-1 mt-1 text-slate-300 max-h-24 overflow-y-auto">
                              <span className="text-[0.5rem] font-black uppercase tracking-wider text-slate-450 block">Beobachtungen:</span>
                              {data.comments.slice(0, 3).map((item: string, i: number) => (
                                <p key={i} className="italic text-[0.625rem] leading-snug">• "{item}"</p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#3b82f6" 
                  strokeWidth={4.5} 
                  dot={{ stroke: '#3b82f6', strokeWidth: 2, fill: '#fff', r: 6 }} 
                  activeDot={{ r: 8, strokeWidth: 0, fill: '#2563eb' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Timeline & Entwicklungsdiagramm Section */}
      <div className="flex flex-col gap-8">
        {/* Timeline */}
        <div className="bg-slate-50/50 border border-slate-200/80 rounded-[2.5rem] flex flex-col h-[500px]">
           <StudentTimeline studentId={student.id} />
        </div>

        {/* Kollaboratives Entwicklungsdiagramm */}
        <div className="bg-slate-50/50 border border-slate-200/80 rounded-[2.5rem] p-4 flex flex-col justify-center">
          <FlowerChart 
            studentId={student.id} 
            app={app} 
            isCollaborative={true} 
            editable={true} 
          />
        </div>

        {/* CARD 6: Lernstand & Kompetenzen (NEW) Full Width & Radar-Chart */}
        <div className="bg-slate-50/50 border border-slate-200/80 rounded-[2.5rem] p-8 flex flex-col hover:shadow-xs transition-shadow">
          {(() => {
            // Helper to calculate actual competency percentages
            const getSubjectScoreForRadar = (subNames: string[]): number => {
              const numGrades = activeFaecher
                .filter(f => subNames.includes(f))
                .map(sub => berechne(app, student.id, sub, '1'))
                .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
              if (numGrades.length === 0) {
                // Return a standard average/baseline score for illustration if no grades are recorded yet
                const isStrong = student.niveau === 1 || (student.badges?.length || 0) > 1;
                const isWeak = student.niveau === 3;
                if (isStrong) return 90;
                if (isWeak) return 55;
                return 75; // standard medium
              }
              const avg = numGrades.reduce((a, b) => a + b, 0) / numGrades.length;
              return Math.max(20, Math.min(100, 100 - (avg - 1) * 20)); // Note 1: 100%, Note 5: 20%
            };

            const hasSubjectGradesForRadar = (subNames: string[]): boolean => {
              const numGrades = activeFaecher
                .filter(f => subNames.includes(f))
                .map(sub => berechne(app, student.id, sub, '1'))
                .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
              return numGrades.length > 0;
            };

            const matheScore = getSubjectScoreForRadar(['M', 'MA', 'Mathematik']);
            const deutschScore = getSubjectScoreForRadar(['D', 'DE', 'Deutsch']);
            const sachScore = getSubjectScoreForRadar(['SU', 'Sachunterricht', 'BU', 'PH']);
            const englischScore = getSubjectScoreForRadar(['E', 'EN', 'Englisch']);
            const sportScore = getSubjectScoreForRadar(['BE', 'ME', 'WE', 'BSP', 'Bewegung und Sport']);

            const radarData = [
              { subject: 'Mathematik', value: Math.round(matheScore), fullMark: 100 },
              { subject: 'Deutsch', value: Math.round(deutschScore), fullMark: 100 },
              { subject: 'Sachunterricht', value: Math.round(sachScore), fullMark: 100 },
              { subject: 'Englisch', value: Math.round(englischScore), fullMark: 100 },
              { subject: 'Sport & Kreativ', value: Math.round(sportScore), fullMark: 100 }
            ];

            const getRadarInterpretation = () => {
              const hasAnyGrades = hasSubjectGradesForRadar(['M', 'MA', 'Mathematik']) || 
                                   hasSubjectGradesForRadar(['D', 'DE', 'Deutsch']) || 
                                   hasSubjectGradesForRadar(['SU', 'Sachunterricht', 'BU', 'PH']);

              if (!hasAnyGrades) {
                return `Bisher sind keine Noten für ${student.vorname} eingetragen. Das Radar zeigt eine modellierte Orientierung basierend auf dem Schülerprofil (Lernniveau ${student.niveau || 'ausgeglichen'}).`;
              }

              const strengths = [];
              const focalAreas = [];

              if (matheScore >= 85) strengths.push('Mathematik');
              else if (matheScore <= 55) focalAreas.push('Mathematik');

              if (deutschScore >= 85) strengths.push('Deutsch');
              else if (deutschScore <= 55) focalAreas.push('Deutsch');

              if (sachScore >= 85) strengths.push('Sachunterricht');
              else if (sachScore <= 55) focalAreas.push('Sachunterricht');

              if (strengths.length > 0 && focalAreas.length > 0) {
                return `Herausragende Stärken liegen im Bereich ${strengths.join(' & ')}. Ein gezielter pädagogischer Fokus empfiehlt sich aktuell in ${focalAreas.join(' & ')}.`;
              } else if (strengths.length > 0) {
                return `Besonders stark ausgeprägte Kompetenzen zeigen sich in ${strengths.join(' & ')}. In allen anderen Bereichen zeigt sich ein solides, verlässliches Lernniveau.`;
              } else if (focalAreas.length > 0) {
                return `Ein gezielter pädagogischer Fokus empfiehlt sich in ${focalAreas.join(' & ')}. Die übrigen Bereiche verbleiben auf stabilem Kurs.`;
              } else {
                return `${student.vorname} zeigt eine sehr ausgewogene, ausgeglichene Kompetenzverteilung über alle Kernbereiche des Lehrplans hinweg.`;
              }
            };

            const getScore = (subjects: string[]) => {
              const numGrades = activeFaecher
                .filter(f => subjects.includes(f))
                .map(sub => berechne(app, student.id, sub, '1'))
                .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
              if (numGrades.length === 0) return null;
              const avg = numGrades.reduce((a, b) => a + b, 0) / numGrades.length;
              return Math.max(0, Math.min(100, 100 - (avg - 1) * 20));
            };

            const competencies = [
              { label: "Sprachkompetenz", score: getScore(['D', 'DE', 'Deutsch', 'E', 'EN', 'Englisch']), color: "violet" },
              { label: "Mathematische Kompetenz", score: getScore(['M', 'MA', 'Mathematik']), color: "blue" },
              { label: "Sach- & Naturkompetenz", score: getScore(['SU', 'Sachunterricht', 'BU', 'PH']), color: "emerald" },
              { label: "Kreativität & Sport", score: getScore(['BE', 'ME', 'WE', 'BSP']), color: "amber" },
            ].filter(c => c.score !== null);

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Side: Competency progress bars (6 columns on desktop) */}
                <div className="lg:col-span-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
                      <h4 className="text-[0.75rem] font-black uppercase tracking-widest text-slate-450 flex items-center gap-1.5">
                        <Target size={16} className="text-violet-500" /> Ausprägung der Kernkompetenzen
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {competencies.length === 0 ? (
                        <div className="col-span-full bg-white/60 border border-slate-100 p-6 rounded-2xl flex items-center justify-center text-center">
                           <p className="text-[0.75rem] text-slate-400 font-medium">Lernstandsanzeige benötigt eingetragene Noten in den Kernfächern.</p>
                        </div>
                      ) : (
                        competencies.map((comp, idx) => {
                          const getColors = (c: string) => {
                            switch(c) {
                              case 'violet': return { text: 'text-violet-700', bg: 'bg-violet-100/60', fill: 'bg-gradient-to-r from-violet-400 to-violet-600' };
                              case 'emerald': return { text: 'text-emerald-700', bg: 'bg-emerald-100/60', fill: 'bg-gradient-to-r from-emerald-400 to-emerald-600' };
                              case 'amber': return { text: 'text-amber-700', bg: 'bg-amber-100/60', fill: 'bg-gradient-to-r from-amber-400 to-amber-600' };
                              default: return { text: 'text-blue-700', bg: 'bg-blue-100/60', fill: 'bg-gradient-to-r from-blue-400 to-blue-600' };
                            }
                          };
                          const colors = getColors(comp.color);
                          
                          return (
                            <div key={idx} className="space-y-4 bg-white/60 border border-slate-100 rounded-2xl p-5 shadow-3xs hover:-translate-y-0.5 transition-transform duration-300">
                              <div className="flex flex-col gap-1">
                                <span className={`text-[0.75rem] font-bold ${colors.text}`}>{comp.label}</span>
                                <span className="text-2xl font-black text-slate-800 tracking-tight">{Math.round(comp.score as number)}%</span>
                              </div>
                              <div className={`h-3 w-full ${colors.bg} rounded-full overflow-hidden shadow-inner`}>
                                 <div 
                                   className={`h-full ${colors.fill} rounded-full transition-all duration-1000 ease-out`} 
                                   style={{ width: `${comp.score}%` }} 
                                 />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-200/60 flex justify-end">
                    <button 
                      onClick={() => onTabChange('leistungen')}
                      className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200 text-[0.75rem] leading-tight font-black text-violet-600 hover:text-violet-800 hover:bg-violet-50 flex items-center gap-2 group active:scale-95 transition-all"
                    >
                      Kompetenzraster Details ansehen
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Right Side: Gesamt-Kompetenz-Karte Radar-Chart (6 columns on desktop) */}
                <div className="lg:col-span-6 border-t lg:border-t-0 lg:border-l border-slate-200/60 pt-6 lg:pt-0 lg:pl-8 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
                      <h4 className="text-[0.75rem] font-black uppercase tracking-widest text-slate-450 flex items-center gap-1.5">
                        <Activity size={16} className="text-indigo-500" /> Gesamt-Kompetenz-Karte
                      </h4>
                    </div>
                    <p className="text-[0.6875rem] text-slate-400 font-medium leading-relaxed mt-2">
                      Visuelle Spinnweb-Analyse des aktuellen Lernstandes in den primären Fachbereichen (Mathematik, Deutsch, Sachunterricht, Englisch, Sport). Eine größere Fläche signalisiert höhere Kompetenz-Ausprägungen.
                    </p>
                  </div>

                  <div className="h-[260px] w-full flex items-center justify-center py-2" id="gesamt-kompetenz-radar-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis 
                          dataKey="subject" 
                          tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
                        />
                        <PolarRadiusAxis 
                          angle={90} 
                          domain={[0, 100]} 
                          tickCount={6}
                          tick={{ fill: '#94a3b8', fontSize: 9 }}
                        />
                        <Radar 
                          name="Lernstand" 
                          dataKey="value" 
                          stroke="#6366f1" 
                          strokeWidth={2.5}
                          fill="#6366f1" 
                          fillOpacity={0.15} 
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-indigo-50/40 border border-indigo-100 p-4 rounded-2xl flex flex-col gap-1">
                     <span className="text-[0.625rem] font-black uppercase text-indigo-700 tracking-wider">Pädagogische Interpretation</span>
                     <p className="text-[0.75rem] text-slate-600 leading-normal font-medium">
                       {getRadarInterpretation()}
                     </p>
                  </div>
                </div>

              </div>
            );
          })()}
        </div>
      </div>

      <div className="bg-white border border-slate-200/60 p-5 rounded-2xl flex items-start gap-4">
         <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
            <Award size={18} />
         </div>
         <div>
            <span className="text-[0.625rem] font-black uppercase text-amber-700 tracking-widest block mb-1">Pädagogische Notiz</span>
            <p className="text-[0.8125rem] text-slate-600 leading-relaxed font-medium">
              Diese Ausprägungen helfen dabei, Leistungen im Kontext der individuellen Arbeitshaltung zu interpretieren. 
              Sie sind ein wichtiges Instrument für das <strong>ipsative Feedback</strong> (Entwicklung im Vergleich zu sich selbst).
            </p>
         </div>
      </div>
    </div>
  );
}
