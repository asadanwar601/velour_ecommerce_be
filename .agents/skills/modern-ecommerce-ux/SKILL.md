---
name: modern-ecommerce-ux
description: >-
  Enforces pristine, accessible, light-themed e-commerce UX/UI design standards, crystal-clear component layout hierarchies, robust responsive navigation, and zero-artifact styling patterns.
---

# Modern E-Commerce UX & Clean Styling Guidelines

This skill enforces pristine, accessible, light-themed e-commerce UX/UI design standards, crystal-clear component layout hierarchies, robust responsive navigation, and zero-artifact styling patterns across all web interfaces.

---

## 1. Navbar & Header Layout Integrity
- **Background Integrity:** Never apply generic background cover images directly to global layout containers (`header` or `nav`). Use clean backdrops (`bg-white/90 backdrop-blur-md border-b border-slate-200` or `border-sand-200`) to maintain readability.
- **Clickable Routing:** All interactive links must use proper Next.js `Link` components with explicit z-index layers (`z-50`) to ensure they are never blocked by overlapping hero images or absolute containers.
- **Theme Constraint:** Enforce a clean **light theme** baseline (`bg-slate-50` / `bg-white` canvas, `text-slate-900` headings, and primary brand accents like emerald, indigo, or artisanal gold). Avoid harsh dark backgrounds or messy gradient overlays on operational headers.

---

## 2. 2026 E-Commerce Design Patterns
- **High-Contrast Micro-Interactions:** Buttons and interactive cards must feature smooth hover states, clean shadows (`shadow-sm hover:shadow-md transition-all`), and obvious cursor indicators (`cursor-pointer`).
- **Component Modularization:** Keep every UI card, header, and navigation dropdown strictly under **250 lines**, breaking sub-elements (like mobile drawers, filters, or search bars) into isolated components.
- **Layout Hierarchy:** Ensure clear visual contrast between navigation bars, announcement banners, hero sections, product grids, and checkout panels.
- **Form Usability:** Form fields must have visible borders (`border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900`), explicit labels, and accessible validation states.
