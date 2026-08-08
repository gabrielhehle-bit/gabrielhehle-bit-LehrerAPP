import React, { useMemo, useState, useEffect } from 'react';
import { Student, SkillRadar } from '../../types';
import { useApp } from '../../context/AppContext';
import { Activity, Star, Smile, Sparkles, Compass, Target, Award, BookOpen } from 'lucide-react';
import { berechne } from '../../lib/GradeUtils';
import { FAECHER_ALLE } from '../../constants';
import { DEVELOPMENT_DIAGRAM_FIELDS } from '../FlowerChart';
import { parseGradeToValue } from '../NotenverlaufChart';
import { LERNZIELE_BY_STUFE } from '../LernzielTracker';
import OverallDossierView from './OverallDossierView';
import SubjectDossierView from './SubjectDossierView';

function calculateSubjectTrend(app: any, studentId: string, subject: string, overallAvg: number | null) {
  if (overallAvg === null) return { direction: 'none' as const, label: 'Keine Daten' };

  const periods: ('1' | '2')[] = ['1', '2'];
  const grades: number[] = [];

  periods.forEach(sem => {
    const nd = app.noten?.[studentId]?.[subject]?.[sem] || {};
    if (nd.aufgaben) {
      nd.aufgaben.forEach((g: any) => {
        const val = parseGradeToValue(g.grade || g.originalGrade || g.numericGrade);
        if (val !== null) grades.push(val);
      });
    }
    if (nd.sa) {
      nd.sa.forEach((g: any) => {
        const val = parseGradeToValue(g.grade || g.originalGrade || g.numericGrade);
        if (val !== null) grades.push(val);
      });
    }
    if (nd.lzk) {
      nd.lzk.forEach((g: any) => {
        const val = parseGradeToValue(g.grade || g.originalGrade || g.numericGrade);
        if (val !== null) grades.push(val);
      });
    }
  });

  if (grades.length < 2) {
    return { direction: 'none' as const, label: 'Konstant (Zu wenige Daten)' };
  }

  const firstHalf = grades.slice(0, Math.floor(grades.length / 2));
  const secondHalf = grades.slice(Math.floor(grades.length / 2));

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const diff = avgSecond - avgFirst;

  if (diff < -0.15) {
    return { 
      direction: 'up' as const, 
      text: 'Verbesserung', 
      icon: '↗️', 
      colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      label: 'Die Leistungen zeigen in letzter Zeit einen deutlichen Aufwärtstrend.' 
    };
  } else if (diff > 0.15) {
    return { 
      direction: 'down' as const, 
      text: 'Rückgang', 
      icon: '↘️', 
      colorClass: 'bg-rose-50 text-rose-700 border-rose-100',
      label: 'Die Notenwerte sind im Verlauf des Semesters leicht abgesunken.' 
    };
  } else {
    return { 
      direction: 'stable' as const, 
      text: 'Stabil', 
      icon: '➡️', 
      colorClass: 'bg-slate-50 text-slate-600 border-slate-200',
      label: 'Die Leistungen verbleiben auf einem konstanten, verlässlichen Niveau.' 
    };
  }
}

function getChronologicalGradesForSubject(app: any, studentId: string, subject: string) {
  const semesters: ('1' | '2')[] = ['1', '2'];
  const list: any[] = [];

  semesters.forEach(sem => {
    const nd = app.noten?.[studentId]?.[subject]?.[sem] || {};
    
    if (nd.sa) {
      nd.sa.forEach((g: any) => list.push({
        ...g,
        type: 'sa',
        typeLabel: 'Schularbeit',
        semester: sem,
        numericGrade: parseGradeToValue(g.grade || g.originalGrade || g.numericGrade) || 3,
        originalGrade: g.grade || g.originalGrade || g.numericGrade || '3'
      }));
    }
    if (nd.lzk) {
      nd.lzk.forEach((g: any) => list.push({
        ...g,
        type: 'lzk',
        typeLabel: 'Lernzielkontrolle',
        semester: sem,
        numericGrade: parseGradeToValue(g.grade || g.originalGrade || g.numericGrade) || 3,
        originalGrade: g.grade || g.originalGrade || g.numericGrade || '3'
      }));
    }
    if (nd.wp) {
      nd.wp.forEach((g: any) => list.push({
        ...g,
        type: 'wp',
        typeLabel: 'Wochenplan',
        semester: sem,
        numericGrade: parseGradeToValue(g.grade || g.originalGrade || g.numericGrade) || 3,
        originalGrade: g.grade || g.originalGrade || g.numericGrade || '3'
      }));
    }
    if (nd.aufgaben) {
      nd.aufgaben.forEach((g: any) => list.push({
        ...g,
        type: 'aufgaben',
        typeLabel: 'Hausübung',
        semester: sem,
        numericGrade: parseGradeToValue(g.grade || g.originalGrade || g.numericGrade) || 3,
        originalGrade: g.grade || g.originalGrade || g.numericGrade || '3'
      }));
    }
  });

  return list.sort((a, b) => {
    if (a.date && b.date) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    return Number(a.semester) - Number(b.semester);
  });
}

function getSubjectEmoji(subject: string): string {
  switch (subject) {
    case 'Mathematik': return '📐';
    case 'Deutsch': return '📕';
    case 'Sachunterricht': return '🔬';
    case 'Englisch': return '🇬🇧';
    case 'Musik': return '🎵';
    case 'Kunst': return '🎨';
    case 'Sport': return '🏃';
    case 'Religion': return '🕊️';
    default: return '📘';
  }
}

function generateOverallEvaluationText(
  avg: number | null,
  workBehaviorId: string,
  antolin: any,
  diagnosticsCount: number
): string {
  if (avg === null) return 'Es liegen noch keine ausreichenden Leistungs- und Bewertungsdaten vor, um ein aussagekräftiges pädagogisches Gesamtgutachten zu erstellen.';

  let performanceText = '';
  if (avg <= 1.5) {
    performanceText = 'Der Schüler erbringt in allen Unterrichtsfächern herausragende Leistungen und zeigt eine außerordentlich hohe Sach- und Methodenkompetenz.';
  } else if (avg <= 2.5) {
    performanceText = 'Die schulischen Leistungen liegen auf einem guten und stabilen Niveau. Der Schüler bewältigt die Lehrplananforderungen weitgehend mühelos.';
  } else if (avg <= 3.5) {
    performanceText = 'Die schulische Gesamtleistung ist zufriedenstellend. In manchen Teilbereichen zeigen sich jedoch vereinzelte Lücken, die durch kontinuierliche Übung geschlossen werden sollten.';
  } else {
    performanceText = 'Im schulischen Leistungsprofil zeigen sich erhebliche Lücken und deutlicher Entwicklungsbedarf in mehreren Kernfächern. Eine engmaschige pädagogische Begleitung ist ratsam.';
  }

  let behaviorText = '';
  if (workBehaviorId === '1') {
    behaviorText = ' Das Arbeits- und Sozialverhalten ist als vorbildlich und äußerst engagiert zu bewerten. Er arbeitet fokussiert und unterstützt Mitschüler aktiv.';
  } else if (workBehaviorId === '2') {
    behaviorText = ' Das Arbeitsverhalten ist geprägt von Fleiß und Zuverlässigkeit. Er folgt dem Unterricht aufmerksam und erledigt Aufgaben gewissenhaft.';
  } else {
    behaviorText = ' Im Arbeits- und Konzentrationsverhalten zeigen sich phasenweise Ablenkungen. Eine Stärkung des selbstständigen Arbeitens wird empfohlen.';
  }

  let readingText = '';
  if (antolin && antolin.punkte > 150) {
    readingText = ` Besonders hervorzuheben ist das große Interesse an der Leseförderung (Antolin-Ergebnis: ${antolin.punkte} Punkte), das eine sehr gute Sinnerfassung belegt.`;
  }

  let diagText = '';
  if (diagnosticsCount > 0) {
    diagText = ` Die standardisierten Screening-Ergebnisse deuten auf punktuelle Förderbedarfe hin, die im individuellen Förderplan berücksichtigt werden.`;
  }

  return `${performanceText}${behaviorText}${readingText}${diagText}`;
}

function generateSubjectEvaluationText(
  subject: string,
  avg: number | null,
  goalsCount: number,
  criticalDiagCount: number
): string {
  if (avg === null) return `Im Fach ${subject} liegen aktuell noch keine hinreichenden Bewertungsdaten für eine differenzierte Bilanz vor.`;

  let perf = '';
  if (avg <= 1.5) perf = `glänzt im Fach ${subject} mit hervorragenden Leistungen und erfasst neue Sachverhalte blitzschnell.`;
  else if (avg <= 2.5) perf = `erbringt im Fach ${subject} konstant gute Leistungen und arbeitet im Unterricht motiviert und aktiv mit.`;
  else if (avg <= 3.5) perf = `zeigt im Fach ${subject} eine solide Arbeitsweise, benötigt jedoch bei komplexeren Aufgabenstellungen noch Unterstützung.`;
  else perf = `bekundet im Fach ${subject} erhebliche Verständnisschwierigkeiten und benötigt dringend zusätzliche, gezielte Fördermaßnahmen.`;

  let goals = '';
  if (goalsCount > 3) {
    goals = ` Zudem wurden bereits ${goalsCount} fachspezifische Lernziele dieses Semesters erfolgreich gefestigt und als gesichert verbucht.`;
  }

  let diag = '';
  if (criticalDiagCount > 0) {
    diag = ` Die jüngsten fachbezogenen Diagnoseergebnisse weisen auf spezifischen Förderbedarf hin, welcher im laufenden Unterricht begleitet wird.`;
  }

  return `Der Schüler ${perf}${goals}${diag}`;
}

interface DossierLeistungenProps {
  student: Student;
}

export default function DossierLeistungen({ student }: DossierLeistungenProps) {
  const { app, setApp } = useApp();
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [lernzieleState, setLernzieleState] = useState<Record<string, number>>({});

  const currentClass = app.classes?.find(c => c.id === app.activeClassId);
  if (!currentClass) return <div className="p-8 text-center text-slate-500 font-bold">Keine Klassendaten für Leistungen gefunden.</div>;

  const activeFaecher = (app.faecher && app.faecher.length > 0) ? app.faecher : FAECHER_ALLE;

  // Sync with FlowerChart Data (Kollaboratives Entwicklungsdiagramm)
  const latestKel = useMemo(() => {
    return (app.kelGespraeche || []).find((k: any) => k.schuelerId === student.id);
  }, [app.kelGespraeche, student.id]);

  const skillData = useMemo(() => {
    return DEVELOPMENT_DIAGRAM_FIELDS.map(field => {
      const lehrerValue = student?.foerderprofil?.skillRadar?.[field.id as keyof SkillRadar] || 0;
      return { ...field, value: lehrerValue };
    }).sort((a, b) => b.value - a.value);
  }, [student.foerderprofil?.skillRadar]);

  const strengths = skillData.filter(s => s.value >= 4).slice(0, 3);
  const challenges = skillData.filter(s => s.value <= 2).slice(0, 2);

  // Sync state for learning objectives toggles on student load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`student_lernziele_${student.id}`);
      setLernzieleState(saved ? JSON.parse(saved) : {});
    } catch (e) {
      setLernzieleState({});
    }
  }, [student.id]);

  const handleToggleGoal = (goalId: string) => {
    const currentStatus = lernzieleState[goalId] || 0;
    // Cycle: 0 (Ausstehend) -> 1 (Erreicht) -> 2 (Im Wesentlichen) -> 3 (Minimal) -> 0
    let nextStatus = 0;
    if (currentStatus === 0) nextStatus = 1;
    else if (currentStatus === 1) nextStatus = 2;
    else if (currentStatus === 2) nextStatus = 3;
    else nextStatus = 0;

    const updated = { ...lernzieleState, [goalId]: nextStatus };
    setLernzieleState(updated);
    localStorage.setItem(`student_lernziele_${student.id}`, JSON.stringify(updated));
  };

  const gradeSummary = useMemo(() => {
    return activeFaecher.map(subject => {
      // Student's grade calculated via the weighted berechne() utility
      const avg = berechne(app, student.id, subject, '1');

      // Class's grades for the same subject using the weighted berechne() utility on each class member
      const classAverages = currentClass.schueler
        .map(s => berechne(app, s.id, subject, '1'))
        .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

      const classAvg = classAverages.length > 0 
        ? classAverages.reduce((a, b) => a + b, 0) / classAverages.length 
        : null;

      // Get certificate grade (endnote) from '1' or '2' semester
      const endnote = app.noten?.[student.id]?.[subject]?.[ '1' ]?.endnote || 
                      app.noten?.[student.id]?.[subject]?.[ '2' ]?.endnote || '—';
      
      return {
        subject,
        avg: avg !== null ? Number(avg.toFixed(2)) : null,
        classAvg: classAvg !== null ? Number(classAvg.toFixed(2)) : null,
        endnote: endnote,
        count: (app.noten?.[student.id]?.[subject]?.[ '1' ]?.sa?.length || 0) + 
               (app.noten?.[student.id]?.[subject]?.[ '1' ]?.lzk?.length || 0) + 
               (app.noten?.[student.id]?.[subject]?.[ '1' ]?.wp?.length || 0),
        trend: calculateSubjectTrend(app, student.id, subject, avg)
      };
    }).filter(item => item.avg !== null || item.classAvg !== null || item.endnote !== '—');
  }, [app, student.id, activeFaecher, currentClass.schueler]);

  // Selected subject metadata if any specific subject is chosen
  const currentSubjectData = useMemo(() => {
    return gradeSummary.find(g => g.subject === selectedSubject);
  }, [gradeSummary, selectedSubject]);

  // Calculate overall student average across all active subjects
  const studentAvgList = gradeSummary
    .map(g => g.avg)
    .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

  const studentTotalAvg = studentAvgList.length > 0 
    ? studentAvgList.reduce((a, b) => a + b, 0) / studentAvgList.length
    : null;

  // Calculate overall class average across all active subjects
  const classAvgList = gradeSummary
    .map(g => g.classAvg)
    .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

  const classTotalAvg = classAvgList.length > 0 
    ? classAvgList.reduce((a, b) => a + b, 0) / classAvgList.length
    : null;

  // Austrian Grade scale: lower value is better (1 is best, 5 is worst)
  const comparisonResult = () => {
    if (!studentTotalAvg || !classTotalAvg) return { text: 'Keine Bewertung', color: 'bg-slate-100 text-slate-700' };
    const diff = studentTotalAvg - classTotalAvg;
    if (diff < -0.2) return { text: 'Über Klassendurchschnitt', color: 'bg-emerald-100 text-emerald-800' };
    if (diff > 0.2) return { text: 'Bedarf an Unterstützung', color: 'bg-rose-100 text-rose-800' };
    return { text: 'Im Klassendurchschnitt', color: 'bg-blue-100 text-blue-800' };
  };

  // Build chart comparison data, parsing Zeugnisnoten to plot them alongside averages
  const comparisonChartData = gradeSummary.map(s => {
    const endnoteNum = s.endnote ? Number(s.endnote) : null;
    return {
      name: s.subject,
      'Schüler-Schnitt': s.avg || null,
      'Klassen-Schnitt': s.classAvg || null,
      'Zeugnisnote': endnoteNum && !isNaN(endnoteNum) ? endnoteNum : null,
    };
  }).filter(d => d['Schüler-Schnitt'] !== null || d['Klassen-Schnitt'] !== null || d['Zeugnisnote'] !== null);

  // Diagnostic Test & Results Loader
  const subjectDiagnostics = useMemo(() => {
    const tests = app.diagnostikTests || [];
    const erhebungen = (app.diagnostikErhebungen || []).filter((e: any) => e.schuelerId === student.id);
    
    return erhebungen.map((e: any) => {
      const testObj = tests.find((t: any) => t.id === e.testId);
      return {
        ...e,
        test: testObj
      };
    });
  }, [app, student.id]);

  const filteredDiagnosticsForSubject = useMemo(() => {
    if (selectedSubject === 'All') return subjectDiagnostics;
    return subjectDiagnostics.filter((d: any) => d.test?.fach === selectedSubject);
  }, [subjectDiagnostics, selectedSubject]);

  const criticalCount = useMemo(() => {
    return subjectDiagnostics.filter((d: any) => d.foerderbedarfErkannt).length;
  }, [subjectDiagnostics]);

  // Antolin integration
  const latestAntolin = useMemo(() => {
    const studentRecs = (app.antolinRecords || []).filter((a: any) => a.schuelerId === student.id);
    if (studentRecs.length === 0) return undefined;
    return [...studentRecs].sort((a: any, b: any) => b.datum.localeCompare(a.datum))[0];
  }, [app.antolinRecords, student.id]);

  // Retrieve current active school grade level
  const classLevel = useMemo(() => {
    if (!currentClass.name) return 1;
    const match = currentClass.name.match(/\d+/);
    return match ? Math.max(1, Math.min(4, parseInt(match[0]))) : 1;
  }, [currentClass.name]);

  // Specific Subject Goals/Objectives list
  const subjectGoals = useMemo(() => {
    if (selectedSubject === 'All') return [];
    const list = LERNZIELE_BY_STUFE[classLevel as 1 | 2 | 3 | 4] || {};
    return list[selectedSubject as keyof typeof list] || [];
  }, [classLevel, selectedSubject]);

  const goalCompletionStats = useMemo(() => {
    if (subjectGoals.length === 0) return null;
    const assessed = subjectGoals.filter(g => lernzieleState[g.id] !== undefined && lernzieleState[g.id] !== null && lernzieleState[g.id] !== 0);
    const achieved = subjectGoals.filter(g => lernzieleState[g.id] === 1); // 1 = Erreicht
    const partial = subjectGoals.filter(g => lernzieleState[g.id] === 2);  // 2 = Im Wesentlichen
    const minimal = subjectGoals.filter(g => lernzieleState[g.id] === 3);  // 3 = Minimal
    
    return {
      total: subjectGoals.length,
      assessedCount: assessed.length,
      achievedCount: achieved.length,
      partialCount: partial.length,
      minimalCount: minimal.length,
      achievedPercent: Math.round((achieved.length / subjectGoals.length) * 100),
      progressPercent: Math.round(((achieved.length + partial.length * 0.5) / subjectGoals.length) * 100)
    };
  }, [subjectGoals, lernzieleState]);

  // Retrieve notes & observations sorted chronologically
  const studentNotes = useMemo(() => {
    return (app.notes || [])
      .filter((n: any) => n.schuelerId === student.id)
      .sort((a: any, b: any) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
  }, [app.notes, student.id]);

  const subjectChronologicalGrades = useMemo(() => {
    if (selectedSubject === 'All') return [];
    return getChronologicalGradesForSubject(app, student.id, selectedSubject);
  }, [app, student.id, selectedSubject]);

  const gradeDistribution = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    subjectChronologicalGrades.forEach(g => {
      const rounded = Math.round(g.numericGrade);
      if (rounded >= 1 && rounded <= 5) {
        counts[rounded] = (counts[rounded] || 0) + 1;
      }
    });
    return counts;
  }, [subjectChronologicalGrades]);

  const overallText = useMemo(() => {
    return generateOverallEvaluationText(
      studentTotalAvg,
      app.behavior_status?.[student.id] || app.behavior_default_stage_id || '3',
      latestAntolin,
      criticalCount
    );
  }, [studentTotalAvg, app.behavior_status, student.id, app.behavior_default_stage_id, latestAntolin, criticalCount]);

  const subjectEvaluationText = useMemo(() => {
    if (selectedSubject === 'All') return '';
    return generateSubjectEvaluationText(
      selectedSubject,
      currentSubjectData?.avg || null,
      goalCompletionStats ? goalCompletionStats.achievedCount : 0,
      filteredDiagnosticsForSubject.filter(d => d.foerderbedarfErkannt).length
    );
  }, [selectedSubject, currentSubjectData, goalCompletionStats, filteredDiagnosticsForSubject]);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION & TAB-LIKE NAVIGATION */}
      <div className="flex flex-col gap-5 border-b border-slate-150 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Activity size={20} className="text-indigo-600 animate-pulse" />
              <span>Leistungen, Kompetenzen & Diagnostik</span>
            </h3>
            <p className="text-[0.6875rem] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Schulische Entwicklung, Lernzielkontrollen und Beobachtungen
            </p>
          </div>
        </div>

        {/* Dynamic Tab Navigation Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {/* All View Tab */}
          <button
            onClick={() => setSelectedSubject('All')}
            className={`px-4.5 py-2.5 rounded-full text-[0.71875rem] font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${
              selectedSubject === 'All' 
                ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-100' 
                : 'bg-white text-slate-600 hover:text-slate-800 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>📊 Gesamtübersicht</span>
            {studentTotalAvg && (
              <span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-bold ${selectedSubject === 'All' ? 'bg-slate-800 text-amber-400' : 'bg-slate-100 text-slate-605'}`}>
                Ø {studentTotalAvg.toFixed(2)}
              </span>
            )}
          </button>

          {/* Individual Subject Tabs */}
          {activeFaecher.map((fach) => {
            const gradeItem = gradeSummary.find(g => g.subject === fach);
            const hasGrades = gradeItem && gradeItem.avg !== null;
            const isSelected = selectedSubject === fach;
            
            return (
              <button
                key={fach}
                onClick={() => setSelectedSubject(fach)}
                className={`px-4.5 py-2.5 rounded-full text-[0.71875rem] font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${
                  isSelected 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' 
                    : 'bg-white text-slate-600 hover:text-slate-850 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{getSubjectEmoji(fach)} {fach}</span>
                {hasGrades && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[0.625rem] font-bold ${isSelected ? 'bg-indigo-700 text-amber-300' : 'bg-slate-100 text-slate-500'}`}>
                    Ø {gradeItem.avg!.toFixed(1)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* RENDER ACTIVE TAB COMPONENT */}
      {selectedSubject === 'All' ? (
        <OverallDossierView
          student={student}
          app={app}
          setApp={setApp}
          gradeSummary={gradeSummary}
          studentTotalAvg={studentTotalAvg}
          classTotalAvg={classTotalAvg}
          comparisonResult={comparisonResult}
          overallText={overallText}
          criticalCount={criticalCount}
          latestAntolin={latestAntolin}
          strengths={strengths}
          challenges={challenges}
          comparisonChartData={comparisonChartData}
          studentNotes={studentNotes}
          setSelectedSubject={setSelectedSubject}
          getSubjectEmoji={getSubjectEmoji}
        />
      ) : (
        <SubjectDossierView
          student={student}
          app={app}
          setApp={setApp}
          selectedSubject={selectedSubject}
          currentSubjectData={currentSubjectData}
          subjectEvaluationText={subjectEvaluationText}
          gradeDistribution={gradeDistribution}
          subjectChronologicalGrades={subjectChronologicalGrades}
          filteredDiagnosticsForSubject={filteredDiagnosticsForSubject}
          latestAntolin={latestAntolin}
          classLevel={classLevel}
          subjectGoals={subjectGoals}
          lernzieleState={lernzieleState}
          handleToggleGoal={handleToggleGoal}
          goalCompletionStats={goalCompletionStats}
          studentNotes={studentNotes}
        />
      )}
    </div>
  );
}
