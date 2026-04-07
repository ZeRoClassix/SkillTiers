/**
 * icons.js – Local SVG Tab Icons
 * Uses actual SVG files from /tabs folder
 */

// Map gamemode slugs to their SVG file paths
const TAB_ICON_PATHS = {
  overall: './tabs/overall.svg',
  ltm: './tabs/2v2.svg',
  vanilla: './tabs/vanilla.svg',
  uhc: './tabs/uhc.svg',
  pot: './tabs/pot.svg',
  nethop: './tabs/nethop.svg',
  smp: './tabs/smp.svg',
  sword: './tabs/sword.svg',
  axe: './tabs/axe.svg',
  mace: './tabs/mace.svg'
};

// Inline SVG cache to avoid repeated fetches
const svgCache = new Map();

/**
 * Get icon HTML for a gamemode slug
 * Fetches and returns the actual SVG content from /tabs folder
 */
export async function getIcon(slug) {
  const norm = (slug || '').toLowerCase();
  const iconPath = TAB_ICON_PATHS[norm];

  if (!iconPath) {
    return getFallbackIcon(norm);
  }

  try {
    let svgContent;
    // Return cached raw SVG if available to avoid refetching
    if (svgCache.has(norm)) {
      svgContent = svgCache.get(norm);
    } else {
      const response = await fetch(iconPath);
      if (!response.ok) throw new Error('Failed to load SVG');
      svgContent = await response.text();
      svgCache.set(norm, svgContent);
    }

    // Extract original viewBox or synthesize one from width/height (stripping units like px)
    const vbMatch = svgContent.match(/viewBox\s*=\s*["']([\s\d.,-]+)["']/i);
    let viewBox = vbMatch ? vbMatch[1] : null;

    if (!viewBox) {
      const wMatch = svgContent.match(/width\s*=\s*["']([\d.]+)[^"']*["']/i);
      const hMatch = svgContent.match(/height\s*=\s*["']([\d.]+)[^"']*["']/i);
      if (wMatch && hMatch) {
        viewBox = `0 0 ${wMatch[1]} ${hMatch[1]}`;
      } else {
        viewBox = "0 0 24 24"; // Safe default for UI icons
      }
    }

    // Force consistent sizing for all SVGs - update essential attributes but keep others
    svgContent = svgContent.replace(/<svg([^>]*)>/i, (match, attrs) => {
      const cleanAttrs = attrs.replace(/\b(width|height|viewBox|style|preserveAspectRatio|xmlns:xlink)\s*=\s*["'][^"']*["']/gi, '').trim();
      return `<svg width="100%" height="100%" viewBox="${viewBox}" style="display:block; width:100%; height:100%; overflow:hidden;" preserveAspectRatio="xMidYMid meet" ${cleanAttrs}>`;
    });

    // Isolate SVG styles to prevent class name bleeding - prefix with gamemode slug and a random tag
    const prefix = `svg-${norm}-${Math.random().toString(36).substring(2, 6)}-`;
    // Replace class names in <style> block: .st0 -> .svg-overall-st0
    svgContent = svgContent.replace(/<style[^>]*>([\s\S]*?)<\/style>/i, (match, css) => {
      // Find all class selectors: .st0, .st1, etc.
      return match.replace(/\.([a-zA-Z0-9_-]+)\s*\{/g, `.${prefix}$1 {`);
    });
    // Replace class usage in elements: class="st0" -> class="svg-overall-st0"
    svgContent = svgContent.replace(/class="([^"]+)"/g, (match, classList) => {
      const prefixedClasses = classList.split(/\s+/).map(c => `${prefix}${c}`).join(' ');
      return `class="${prefixedClasses}"`;
    });

    // Fix IDs to prevent collisions
    svgContent = svgContent.replace(/id="([^"]+)"/gi, `id="${prefix}$1"`);
    svgContent = svgContent.replace(/url\(\s*#([^)]+)\s*\)/gi, `url(#${prefix}$1)`);
    svgContent = svgContent.replace(/href="#([^"]+)"/gi, `href="#${prefix}$1"`);

    // Wrap in a container that ensures consistent display size
    const wrappedContent = `<div class="icon-svg-wrapper" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${svgContent}</div>`;

    return wrappedContent;
  } catch (err) {
    console.warn(`Failed to load icon for ${slug}:`, err);
    return getFallbackIcon(norm);
  }
}

/**
 * Get icon path for reference
 */
export function getIconPath(slug) {
  return TAB_ICON_PATHS[slug?.toLowerCase()] || null;
}

/**
 * Check if a gamemode has an icon
 */
export function hasIcon(slug) {
  return !!TAB_ICON_PATHS[slug?.toLowerCase()];
}

/**
 * Fallback inline SVGs
 */
function getFallbackIcon(slug) {
  const fallbacks = {
    overall: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#FBBF24"><path d="M5 4h14v2H5V4zm14 3v5c0 2.2-1.8 4-4 4h-1v2h3v2H7v-2h3v-2H9c-2.2 0-4-1.8-4-4V7h14zM7 9v3c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V9H7z"/></svg>',
    ltm: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#9CA3AF"><path d="M12 2l-5.5 9h11L12 2zm0 3.84L14.7 10H9.3L12 5.84zM7.5 13L2 22h11l-5.5-9zm8.5 0l-5.5 9H21.5L16 13z"/></svg>',
    vanilla: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#D946EF"><path d="M12 2L4 10l8 12 8-12-8-8zm0 3.5l4.8 4.5H7.2L12 5.5z"/></svg>',
    uhc: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#EF4444"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
    pot: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#F472B6"><path d="M19.12 18.88A9.87 9.87 0 0112 22c-2.6 0-5.06-1-6.88-2.88a9.85 9.85 0 01-2.83-6.12 10 10 0 011.66-6.6l4.63-6.32a1 1 0 011.62 0l4.63 6.32c1.47 2 2.19 4.29 2.19 6.6 0 1.11-.1 2.24-.3 3.32-.4 1.9-1.33 3.58-2.8 4.56z"/></svg>',
    nethop: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#10B981"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4" fill="#065f46"/></svg>',
    smp: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 1L2 6v12l10 5 10-5V6L12 1zm0 2.2L19.5 7 12 10.2 4.5 7 12 3.2z" fill="#5EBD5E"/><path d="M3 8.6l8 3.1v8.3l-8-3.7V8.6z" fill="#3D8C40"/><path d="M13 20v-8.3l8-3.1v8.7l-8 2.7z" fill="#4CAF50"/></svg>',
    sword: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#3B82F6"><path d="M19.7 4.3L15.4 0 14 1.4l1.3 1.3-9.5 9.5-2.8-2.8L1 11.4 5.6 16 0 21.6 2.4 24l5.6-5.6 4.6 4.6 2-2-2.8-2.8 9.5-9.5 1.3 1.3 1.4-1.4-4.3-4.3z"/></svg>',
    axe: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#0EA5E9"><path d="M20 2L10 12l2 2L22 4z"/><path d="M7 11c-1.6 0-3 1.4-3 3 0 1 0 2.5.5 4L2.2 20.3 3.7 21.8l2.3-2.3c1.5.5 3 .5 4 .5 1.6 0 3-1.4 3-3V11H7z"/></svg>',
    mace: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#A855F7"><path d="M19.8 4.2c-1.2-1.2-3.1-1.2-4.2 0L5 14H2v3h3l10.6-10.6c1.2-1.2 1.2-3.1 0-4.2z"/></svg>'
  };
  return fallbacks[slug] || fallbacks.overall;
}

export const ICONS = TAB_ICON_PATHS;
