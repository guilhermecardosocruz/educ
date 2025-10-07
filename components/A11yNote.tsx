"use client";

import React from "react";

/**
 * A11yNote
 * Componente discreto para dicas/contexto acessível.
 * - Visível por padrão, com semântica role="note"
 * - Útil para instruções de formulários e alertas
 */
export default function A11yNote({
  children,
  id,
  className = "",
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div
      id={id}
      role="note"
      className={`text-sm text-gray-700 bg-gray-50 border rounded-lg p-3 ${className}`}
    >
      {children}
    </div>
  );
}
