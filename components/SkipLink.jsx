"use client";

export default function SkipLink({ targetId = "main" }) {
  const onClick = (e) => {
    const target = document.getElementById(targetId);
    if (!target) return;
    e.preventDefault();
    target.focus();
    target.scrollIntoView?.();
  };
  return (
    <a href={`#${targetId}`} className="skip-link" onClick={onClick}>
      Skip to main content
    </a>
  );
}
