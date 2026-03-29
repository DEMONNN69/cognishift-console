import React, { useState, useRef, useEffect, useMemo } from "react"
import { Home, Briefcase, Calendar, Shield, Settings } from "lucide-react"

type IconComponentType = React.ElementType<{ className?: string }>

export interface InteractiveMenuItem {
  label: string
  icon: IconComponentType
}

export interface InteractiveMenuProps {
  items?: InteractiveMenuItem[]
  accentColor?: string
  activeIndex?: number
  onItemSelect?: (item: InteractiveMenuItem, index: number) => void
}

const defaultItems: InteractiveMenuItem[] = [
  { label: "home", icon: Home },
  { label: "strategy", icon: Briefcase },
  { label: "period", icon: Calendar },
  { label: "security", icon: Shield },
  { label: "settings", icon: Settings },
]

const defaultAccentColor = "var(--component-active-color-default)"

const InteractiveMenu: React.FC<InteractiveMenuProps> = ({
  items,
  accentColor,
  activeIndex,
  onItemSelect,
}) => {
  const finalItems = useMemo(() => {
    const isValid = items && Array.isArray(items) && items.length >= 2 && items.length <= 5
    if (!isValid) {
      console.warn("InteractiveMenu: 'items' prop is invalid or missing. Using default items.", items)
      return defaultItems
    }
    return items
  }, [items])

  const [internalActiveIndex, setInternalActiveIndex] = useState(0)
  const selectedIndex = typeof activeIndex === "number" ? activeIndex : internalActiveIndex

  useEffect(() => {
    if (selectedIndex >= finalItems.length) {
      setInternalActiveIndex(0)
    }
  }, [finalItems, selectedIndex])

  const textRefs = useRef<(HTMLElement | null)[]>([])
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const setLineWidth = () => {
      const activeItemElement = itemRefs.current[selectedIndex]
      const activeTextElement = textRefs.current[selectedIndex]

      if (activeItemElement && activeTextElement) {
        const textWidth = activeTextElement.offsetWidth
        activeItemElement.style.setProperty("--lineWidth", `${textWidth}px`)
      }
    }

    setLineWidth()
    window.addEventListener("resize", setLineWidth)
    return () => {
      window.removeEventListener("resize", setLineWidth)
    }
  }, [selectedIndex, finalItems])

  const handleItemClick = (index: number) => {
    setInternalActiveIndex(index)
    onItemSelect?.(finalItems[index], index)
  }

  const navStyle = useMemo(() => {
    const activeColor = accentColor || defaultAccentColor
    return { "--component-active-color": activeColor } as React.CSSProperties
  }, [accentColor])

  return (
    <nav className="menu" role="navigation" style={navStyle}>
      {finalItems.map((item, index) => {
        const isActive = index === selectedIndex
        const IconComponent = item.icon

        return (
          <button
            key={item.label}
            className={`menu__item ${isActive ? "active" : ""}`}
            onClick={() => handleItemClick(index)}
            ref={(el) => {
              itemRefs.current[index] = el
            }}
            style={{ "--lineWidth": "0px" } as React.CSSProperties}
            type="button"
          >
            <div className="menu__icon">
              <IconComponent className="icon" />
            </div>
            <strong
              className={`menu__text ${isActive ? "active" : ""}`}
              ref={(el) => {
                textRefs.current[index] = el
              }}
            >
              {item.label}
            </strong>
          </button>
        )
      })}
    </nav>
  )
}

export { InteractiveMenu }
