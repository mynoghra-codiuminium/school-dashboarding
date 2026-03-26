import { createContext, useContext, useState, useCallback } from 'react';

const DEFAULT_CONFIG = {
  schoolYear: '2025-2026',
  semester: '1st Semester',
  start: '2025-06-02',
  end: '2026-03-27',
  startMonth: 6,
  autoDetect: true,
};

const PRESET_CONFIGS = {
  '2024-2025': { schoolYear: '2024-2025', semester: '2nd Semester', start: '2024-06-03', end: '2025-03-28', startMonth: 6, autoDetect: false },
  '2025-2026': { schoolYear: '2025-2026', semester: '1st Semester', start: '2025-06-02', end: '2026-03-27', startMonth: 6, autoDetect: false },
  '2026-2027': { schoolYear: '2026-2027', semester: '1st Semester', start: '2026-06-01', end: '2027-03-26', startMonth: 6, autoDetect: false },
};

function detectCurrentSY(startMonth = 6) {
  const now   = new Date();
  const month = now.getMonth() + 1; // 1-based
  const year  = now.getFullYear();
  const sy    = month >= startMonth ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  const sem   = (month >= startMonth && month <= 10) ? '1st Semester' : '2nd Semester';
  return { schoolYear: sy, semester: sem };
}

const SchoolYearContext = createContext(null);

export function SchoolYearProvider({ children }) {
  const [config, setConfig] = useState(() => {
    const detected = detectCurrentSY(DEFAULT_CONFIG.startMonth);
    return { ...DEFAULT_CONFIG, ...detected };
  });

  const label = `S.Y. ${config.schoolYear} · ${config.semester}`;

  const updateConfig = useCallback((patch) => {
    setConfig(c => ({ ...c, ...patch }));
  }, []);

  const setManual = useCallback((schoolYear, semester) => {
    setConfig(c => ({ ...c, schoolYear, semester: semester || c.semester, autoDetect: false }));
  }, []);

  const enableAuto = useCallback(() => {
    setConfig(c => {
      const detected = detectCurrentSY(c.startMonth);
      return { ...c, ...detected, autoDetect: true };
    });
  }, []);

  return (
    <SchoolYearContext.Provider value={{
      schoolYear: config.schoolYear,
      config,
      label,
      configs: PRESET_CONFIGS,
      updateConfig,
      setManual,
      enableAuto,
      setSchoolYear: (sy) => setManual(sy, null),
    }}>
      {children}
    </SchoolYearContext.Provider>
  );
}

export const useSchoolYear = () => useContext(SchoolYearContext);
