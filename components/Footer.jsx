import { copy } from '../app/copy/en';

function isExternalLink(href) {
  return /^https?:\/\//.test(href);
}

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-6 py-8">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-6 text-sm text-slate-300">
        {copy.footer.links.map((link) => {
          const externalProps = isExternalLink(link.href)
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : {};

          return (
            <a
              key={link.href}
              href={link.href}
              className="inline-block py-3 hover:text-cyan-400 transition-colors"
              {...externalProps}
            >
              {link.label}
            </a>
          );
        })}
      </div>
    </footer>
  );
}
