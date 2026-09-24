// The real root layout is app/[locale]/layout.tsx. This pass-through exists so app/not-found.tsx
// can handle requests that never reach a locale (next-intl's recommended setup).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
