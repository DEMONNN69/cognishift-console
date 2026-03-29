import { useState, useEffect, ComponentType, memo } from "react"
import type { IconBaseProps } from "react-icons"
import React from "react"

// ─── Package loaders (statically analysable by Vite) ─────────────────────────

const PACKAGE_LOADERS: Record<string, () => Promise<Record<string, ComponentType<IconBaseProps>>>> = {
  fa:  () => import("react-icons/fa")  as any,
  si:  () => import("react-icons/si")  as any,
  md:  () => import("react-icons/md")  as any,
  io5: () => import("react-icons/io5") as any,
  io:  () => import("react-icons/io")  as any,
  bs:  () => import("react-icons/bs")  as any,
  ri:  () => import("react-icons/ri")  as any,
  hi:  () => import("react-icons/hi")  as any,
  ai:  () => import("react-icons/ai")  as any,
  tb:  () => import("react-icons/tb")  as any,
  lu:  () => import("react-icons/lu")  as any,
  bi:  () => import("react-icons/bi")  as any,
  ci:  () => import("react-icons/ci")  as any,
  fi:  () => import("react-icons/fi")  as any,
  gi:  () => import("react-icons/gi")  as any,
  go:  () => import("react-icons/go")  as any,
  gr:  () => import("react-icons/gr")  as any,
  pi:  () => import("react-icons/pi")  as any,
  rx:  () => import("react-icons/rx")  as any,
  sl:  () => import("react-icons/sl")  as any,
  ti:  () => import("react-icons/ti")  as any,
  vsc: () => import("react-icons/vsc") as any,
  wi:  () => import("react-icons/wi")  as any,
  cg:  () => import("react-icons/cg")  as any,
}

// ─── Prefix → package key (longest prefix checked first) ─────────────────────

const PREFIX_MAP: [string, string][] = [
  ["Io5", "io5"],
  ["Vsc", "vsc"],
  ["Fa",  "fa"],
  ["Si",  "si"],
  ["Md",  "md"],
  ["Io",  "io"],
  ["Bs",  "bs"],
  ["Ri",  "ri"],
  ["Hi",  "hi"],
  ["Ai",  "ai"],
  ["Tb",  "tb"],
  ["Lu",  "lu"],
  ["Bi",  "bi"],
  ["Ci",  "ci"],
  ["Fi",  "fi"],
  ["Gi",  "gi"],
  ["Go",  "go"],
  ["Gr",  "gr"],
  ["Pi",  "pi"],
  ["Rx",  "rx"],
  ["Sl",  "sl"],
  ["Ti",  "ti"],
  ["Wi",  "wi"],
  ["Cg",  "cg"],
]

function getPackageKey(name: string): string | null {
  for (const [prefix, pkg] of PREFIX_MAP) {
    if (name.startsWith(prefix)) return pkg
  }
  return null
}

// ─── Module-level cache so each package is only loaded once ──────────────────

const iconCache = new Map<string, ComponentType<IconBaseProps> | null>()

async function resolveIcon(name: string): Promise<ComponentType<IconBaseProps> | null> {
  if (iconCache.has(name)) return iconCache.get(name)!

  const pkg = getPackageKey(name)
  if (!pkg || !PACKAGE_LOADERS[pkg]) {
    iconCache.set(name, null)
    return null
  }

  try {
    const mod = await PACKAGE_LOADERS[pkg]()
    const Icon = (mod[name] ?? null) as ComponentType<IconBaseProps> | null
    iconCache.set(name, Icon)
    return Icon
  } catch {
    iconCache.set(name, null)
    return null
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
// NOTE: Component functions must NEVER be stored directly in useState because
// React treats function state as a lazy initializer and calls it, turning the
// component into a React element. We wrap them in { C } objects instead.

export interface DynamicIconProps extends IconBaseProps {
  /** react-icons export name, e.g. "FaWhatsapp", "SiGmail" */
  name: string
  /** Fallback rendered while the icon chunk is loading */
  fallback?: React.ReactNode
}

const DynamicIcon = memo(function DynamicIcon({ name, fallback = null, ...props }: DynamicIconProps) {
  const [slot, setSlot] = useState<{ C: ComponentType<IconBaseProps> } | null>(() => {
    const ic = iconCache.get(name)
    return ic ? { C: ic } : null
  })

  useEffect(() => {
    if (iconCache.has(name)) {
      const ic = iconCache.get(name)!
      setSlot(ic ? { C: ic } : null)
      return
    }
    let cancelled = false
    resolveIcon(name).then((ic) => {
      if (!cancelled) setSlot(ic ? { C: ic } : null)
    })
    return () => { cancelled = true }
  }, [name])

  if (!slot) return <>{fallback}</>
  const { C: Icon } = slot
  return <Icon {...props} />
})

export default DynamicIcon

// ─── AppIcon — resolves brand icon from a plain app name ─────────────────────
//
// Given e.g. "discord", tries candidate names in order:
//   FaDiscord → SiDiscord → BiLogoDiscord → RiDiscordLine …
// Returns the first one that exists in react-icons, no prior mapping needed.

function pascalCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

// Candidate patterns ordered by likelihood (no spaces — react-icons exports never have spaces)
const GUESS_TEMPLATES = (p: string): string[] => [
  `Fa${p}`,
  `Si${p}`,
  `Bi${p}`,
  `BiLogo${p}`,
  `Ri${p}Line`,
  `Ri${p}Fill`,
  `Md${p}`,
  `Bs${p}`,
  `Io${p}`,
  `Lu${p}`,
  `Hi${p}`,
  `Gi${p}`,
]

const appIconCache = new Map<string, ComponentType<IconBaseProps> | null>()

async function resolveAppIcon(appName: string): Promise<ComponentType<IconBaseProps> | null> {
  const key = appName.toLowerCase()
  if (appIconCache.has(key)) return appIconCache.get(key)!

  const p = pascalCase(appName)
  const candidates = GUESS_TEMPLATES(p)

  for (const candidate of candidates) {
    const icon = await resolveIcon(candidate)
    if (icon) {
      appIconCache.set(key, icon)
      return icon
    }
  }

  appIconCache.set(key, null)
  return null
}

export interface AppIconProps extends IconBaseProps {
  /** Plain app name, e.g. "discord", "whatsapp", "notion" */
  app: string
  fallback?: React.ReactNode
}

export const AppIcon = memo(function AppIcon({ app, fallback = null, ...props }: AppIconProps) {
  const key = app.toLowerCase()
  const [slot, setSlot] = useState<{ C: ComponentType<IconBaseProps> } | null>(() => {
    const ic = appIconCache.get(key)
    return ic ? { C: ic } : null
  })

  useEffect(() => {
    if (appIconCache.has(key)) {
      const ic = appIconCache.get(key)!
      setSlot(ic ? { C: ic } : null)
      return
    }
    let cancelled = false
    resolveAppIcon(app).then((ic) => {
      if (!cancelled) setSlot(ic ? { C: ic } : null)
    })
    return () => { cancelled = true }
  }, [key, app])

  if (!slot) return <>{fallback}</>
  const { C: Icon } = slot
  return <Icon {...props} />
})
