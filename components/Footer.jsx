import { copy } from '../app/copy/en';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-6 py-8">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-6 text-sm text-slate-500">
        {/* TODO: Add actual links when ready */}
        <a href="#" className="hover:text-cyan-400 transition-colors">
          {copy.footer.docs}
        </a>
        <a href="#" className="hover:text-cyan-400 transition-colors">
          {copy.footer.status}
        </a>
        <a href="#" className="hover:text-cyan-400 transition-colors">
          {copy.footer.contact}
        </a>
      </div>
    </footer>
  );
}
