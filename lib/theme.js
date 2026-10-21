export const THEME_KEY = "liquifact-theme";
const PREFS = ["light", "dark", "system"];

export function resolveTheme(pref, systemDark) {
  if (pref === "light" || pref === "dark") return pref;
  return systemDark ? "dark" : "light";
}

export function readPref(storage) {
  try {
    const v = storage && storage.getItem(THEME_KEY);
    return PREFS.includes(v) ? v : "system";
  } catch {
    return "system";
  }
}

export const THEME_INIT_SCRIPT =
  '(function(){try{var p=localStorage.getItem("liquifact-theme");' +
  'if(p!=="light"&&p!=="dark")p="system";' +
  'var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);' +
  'var r=document.documentElement;r.dataset.theme=d?"dark":"light";' +
  'r.style.colorScheme=d?"dark":"light"}catch(e){}})();';
