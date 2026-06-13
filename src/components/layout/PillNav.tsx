'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export type PillNavItem = {
  label: string;
  href: string;
  ariaLabel?: string;
};

export interface PillNavProps {
  brandName?: string;
  items: PillNavItem[];
  activeHref?: string;
  className?: string;
  baseColor?: string;
  pillColor?: string;
  pillTextColor?: string;
  hoveredPillTextColor?: string;
  onMobileMenuClick?: () => void;
  initialLoadAnimation?: boolean;
  ease?: string;
}

const PillNav: React.FC<PillNavProps> = ({
  brandName,
  items,
  activeHref,
  className = '',
  baseColor = '#FFFFFF',
  pillColor = '#1A1A2E',
  pillTextColor,
  hoveredPillTextColor = '#FFFFFF',
}) => {
  const accentColor = '#C4793A';
  const resolvedPillTextColor = pillTextColor ?? baseColor;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Main bar */}
      <nav
        className="flex items-center justify-between px-4 rounded-full w-full border"
        style={{
          height: '48px',
          background: baseColor,
          borderColor: '#E8E4DC',
          boxShadow: '0 4px 24px rgba(26,26,46,0.08)',
        }}
        aria-label="Primary"
      >
        {/* Brand */}
        <Link
          href="/"
          className="font-bold text-lg pl-2 flex-shrink-0 tracking-tight"
          style={{ color: accentColor, fontFamily: 'Playfair Display, serif' }}
        >
          {brandName}
        </Link>

        {/* Desktop nav pills */}
        <div className="hidden md:flex items-center gap-2 pr-1">
          {items.map((item) => {
            const isActive = activeHref === item.href;
            const isHovered = hoveredHref === item.href;
            const highlighted = isActive || isHovered;
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => setHoveredHref(item.href)}
                onMouseLeave={() => setHoveredHref(null)}
                className="px-5 py-1.5 rounded-full text-sm font-semibold uppercase tracking-wide transition-colors duration-200"
                style={{
                  background: highlighted ? accentColor : 'transparent',
                  color: highlighted ? hoveredPillTextColor : pillColor,
                  border: highlighted ? 'none' : `1.5px solid ${pillColor}`,
                }}
                aria-label={item.ariaLabel || item.label}
              >
                {item.label}
              </Link>
            );
          })}
        </div>


        {/* Mobile hamburger */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
          className="md:hidden flex flex-col gap-1.5 px-2"
        >
          <span className="w-5 h-0.5 rounded" style={{ background: pillColor }} />
          <span className="w-5 h-0.5 rounded" style={{ background: pillColor }} />
        </button>
      </nav>

      {/* Mobile dropdown */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden absolute top-[56px] left-0 right-0 rounded-2xl shadow-lg z-50 p-2 flex flex-col gap-1 border"
          style={{ background: baseColor, borderColor: '#E8E4DC' }}
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block py-3 px-4 rounded-xl text-sm font-semibold transition-colors duration-200"
              style={{ background: 'transparent', color: pillColor }}
              onClick={() => setIsMobileMenuOpen(false)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = accentColor;
                e.currentTarget.style.color = hoveredPillTextColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = pillColor;
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default PillNav;
