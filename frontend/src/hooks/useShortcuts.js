import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useShortcuts({ onNew } = {}) {
  const navigate = useNavigate();

  useEffect(() => {
    let gPressed = false;
    let gTimer   = null;

    const GOTO = {
      d:'/', s:'/students', t:'/teachers',
      c:'/classes', x:'/subjects', e:'/exams',
      f:'/fees', v:'/events', a:'/announcements',
      r:'/reports', p:'/settings', h:'/shs',
    };

    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||e.target.isContentEditable) return;
      if (e.ctrlKey||e.altKey||e.metaKey) return;

      const key = e.key.toLowerCase();

      if (e.key === '/') {
        e.preventDefault();
        const s = document.querySelector('.tb-search input,.tsearch input');
        if (s) { s.focus(); s.select(); }
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('toggle-shortcuts-panel'));
        return;
      }
      if (key === 'n' && !gPressed) {
        if (onNew) { e.preventDefault(); onNew(); }
        return;
      }
      if (key === 'g') {
        gPressed = true;
        clearTimeout(gTimer);
        gTimer = setTimeout(() => { gPressed = false; }, 1500);
        return;
      }
      if (gPressed && GOTO[key]) {
        e.preventDefault();
        gPressed = false;
        clearTimeout(gTimer);
        navigate(GOTO[key]);
      }
    };

    document.addEventListener('keydown', handler);
    return () => { document.removeEventListener('keydown', handler); clearTimeout(gTimer); };
  }, [navigate, onNew]);
}

export const SHORTCUT_LIST = [
  { group: 'Navigate to Page', items: [
    { keys:['G','D'], desc:'Dashboard' },
    { keys:['G','S'], desc:'Students' },
    { keys:['G','T'], desc:'Teachers' },
    { keys:['G','C'], desc:'Classes' },
    { keys:['G','X'], desc:'Subjects' },
    { keys:['G','E'], desc:'Examinations' },
    { keys:['G','F'], desc:'Fee Management' },
    { keys:['G','V'], desc:'Events' },
    { keys:['G','A'], desc:'Announcements' },
    { keys:['G','H'], desc:'SHS Overview' },
    { keys:['G','R'], desc:'Reports' },
    { keys:['G','P'], desc:'Settings' },
  ]},
  { group: 'Actions', items: [
    { keys:['N'],   desc:'Add new item (current page)' },
    { keys:['/'],   desc:'Focus search bar' },
    { keys:['?'],   desc:'Show / hide shortcuts' },
    { keys:['Esc'], desc:'Close modal' },
  ]},
];
