"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Page number that snaps back to 1 whenever the filter signature changes — derived, no effect needed. */
export function usePage(filterKey: string) {
  const [state, setState] = useState({ key: filterKey, page: 1 });
  const page = state.key === filterKey ? state.page : 1;
  return [page, (p: number) => setState({ key: filterKey, page: p })] as const;
}

/** Open state for a "create" sheet that also honors the `?new=1` deep-link convention. */
export function useCreateParam() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [local, setLocal] = useState(false);
  const fromUrl = params.get("new") === "1";
  const open = local || fromUrl;
  const setOpen = (v: boolean) => {
    setLocal(v);
    if (!v && fromUrl) {
      const next = new URLSearchParams(params.toString());
      next.delete("new");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
  };
  return [open, setOpen] as const;
}

/** Runs `onOpen` once each time `open` becomes true (including first render), during render — React's
 *  "adjust state when a prop changes" pattern. `onOpen` must only set state, never perform side effects. */
export function useOnOpen(open: boolean, onOpen: () => void) {
  const [prev, setPrev] = useState(false);
  if (open !== prev) {
    setPrev(open);
    if (open) onOpen();
  }
}
