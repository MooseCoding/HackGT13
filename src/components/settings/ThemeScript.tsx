/** Inline FOUC-safe theme bootstrap for `<head>`. */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem("hearth-theme");var dark=t==="dark"||((t==null||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(dark)document.documentElement.classList.add("dark");var easy=localStorage.getItem("hearth-larger-text");if(easy==="1")document.documentElement.classList.add("easy");}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
