import { useLayoutEffect, useSyncExternalStore } from "react";
import { post } from "./api";
import { emblemGeometry, emblemPaths } from "./emblemGeometry";
import type { Profile, VisualStyle } from "./types";

export const visualStyles = [
  { id: "rhine", label: "零一 · 黑白机械", name: "FROM ZERO TO ONE", description: "原始银灰徽记 · 机械定位 · 深色留白" },
  { id: "laterano", label: "拉特兰风 UI", name: "CONCORD", description: "几何推演 · 尖拱徽章 · 珠白与冷蓝" },
] as const;

let currentStyle: VisualStyle = "rhine";
const listeners = new Set<() => void>();
export const normalizeVisualStyle = (value: unknown): VisualStyle => value === "laterano" ? "laterano" : "rhine";
export const readVisualStyle = () => currentStyle;

/** The shared Rust profile is authoritative; no browser-only preference copy. */
export function acceptVisualProfile(profile: Pick<Profile, "visual_style">) {
  const next = normalizeVisualStyle(profile.visual_style);
  if (currentStyle === next) return;
  currentStyle = next;
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function useVisualStyle() {
  return useSyncExternalStore(subscribe, readVisualStyle, () => "rhine" as const);
}

export async function saveVisualStyle(token: string, visual_style: VisualStyle) {
  // Patch only this setting: editing appearance must never overwrite identity.
  const profile = await post<Profile>("/api/profile", token, { visual_style });
  if (profile?.visual_style !== visual_style)
    throw new Error("本机服务未保存此 UI 风格，请更新 DSH 后重试。");
  return profile;
}

export function useVisualStyleEffects() {
  const style = useVisualStyle();
  useLayoutEffect(() => {
    document.documentElement.dataset.visualStyle = style;
    const paths = emblemPaths(emblemGeometry(style));
    if (paths.length || style === "rhine") {
      let favicon = document.querySelector<HTMLLinkElement>('link[data-dsh-favicon]');
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        favicon.type = "image/svg+xml";
        favicon.dataset.dshFavicon = "";
        document.head.append(favicon);
      }
      const paper = style === "laterano" ? "#f7f8fb" : "#0a1013";
      const ink = style === "laterano" ? "#1253e5" : "#edf0eb";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-118 -118 236 236"><path fill="${paper}" d="M-118-118H118V118H-118Z"/><g fill="${ink}" fill-rule="evenodd">${paths.map((path) => `<path d="${path}"/>`).join("")}</g></svg>`;
      favicon.href = style === "rhine" ? "/rixin-logo.jpg" : `data:image/svg+xml,${encodeURIComponent(svg)}`;
      favicon.type = style === "rhine" ? "image/jpeg" : "image/svg+xml";
    }
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = style === "laterano" ? "#f7f8fb" : "#0a0a0a";
    const desktop = window as typeof window & {
      __DSH_DESKTOP__?: boolean;
      ipc?: { postMessage?: (message: string) => void };
    };
    if (desktop.__DSH_DESKTOP__ && typeof desktop.ipc?.postMessage === "function")
      desktop.ipc.postMessage(JSON.stringify({ event: "dsh-visual-style", visual_style: style }));
  }, [style]);
}
