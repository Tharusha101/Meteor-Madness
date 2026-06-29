/**
 * Term — an inline glossary term. Renders its label with a dotted underline and
 * shows the plain-language definition on hover/focus (via Tooltip).
 *
 * Usage: <Term k="eccentricity" /> or <Term k="velocity">Velocity (v∞)</Term>
 */
import type { ReactNode } from "react";
import { Tooltip } from "./Tooltip";
import { GLOSSARY, type GlossaryKey } from "../lib/glossary";

interface TermProps {
  k: GlossaryKey;
  children?: ReactNode;
}

export function Term({ k, children }: TermProps) {
  return <Tooltip content={GLOSSARY[k]}>{children ?? k}</Tooltip>;
}

export default Term;
