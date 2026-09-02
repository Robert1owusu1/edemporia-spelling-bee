// Copy text to the clipboard, returning whether it actually succeeded.
//
// navigator.clipboard only exists in secure contexts (https / localhost) and
// can reject when permission is denied or the document is not focused, so the
// promise must be awaited rather than fire-and-forgot. On failure we fall back
// to a hidden textarea + document.execCommand("copy"), which still works on
// plain-http origins, and report the real outcome either way so callers never
// show a "copied" toast for a copy that did not happen.
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the textarea fallback
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
