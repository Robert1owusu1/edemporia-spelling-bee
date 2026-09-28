// `@types/react-dom` is not a dependency of this project (and dependencies
// cannot be installed in this pass), so `react-dom/client` would be an
// implicit `any` under `strict`. Declare the exact surface the app uses
// instead of weakening the compiler option.
declare module 'react-dom/client' {
  import type { ReactNode } from 'react';

  export interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }

  export function createRoot(
    container: Element | DocumentFragment,
    options?: { onRecoverableError?: (error: unknown) => void },
  ): Root;

  export function hydrateRoot(
    container: Element | Document,
    initialChildren: ReactNode,
    options?: { onRecoverableError?: (error: unknown) => void },
  ): Root;
}
