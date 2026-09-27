import { AlertTriangle, Ban, CheckCircle2, CircleDashed, CircleHelp, Clock, Lightbulb, MinusCircle, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { daysUntil, formatDateTime } from "@/lib/dates";
import { COMPATIBILITY_LABEL, INNOVATION_LABEL, KIND_LABEL, WORKFLOW_LABEL } from "@/lib/labels";
import { Badge, cx } from "./ui";

/** Colour is never the only signal: every status has an icon and a text label. */
export function CompatibilityBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  if (!status) return <Badge tone="muted" className={className}><MinusCircle className="size-3" aria-hidden />Sem análise</Badge>;
  const map: Record<string, { tone: "positive" | "info" | "attention" | "negative" | "neutral" | "muted"; icon: React.ReactNode }> = {
    HIGH_COMPATIBILITY: { tone: "positive", icon: <CheckCircle2 className="size-3" aria-hidden /> },
    MEDIUM_COMPATIBILITY: { tone: "info", icon: <CircleDashed className="size-3" aria-hidden /> },
    LOW_COMPATIBILITY: { tone: "neutral", icon: <MinusCircle className="size-3" aria-hidden /> },
    REQUIRES_REVIEW: { tone: "attention", icon: <Search className="size-3" aria-hidden /> },
    LIKELY_INCOMPATIBLE: { tone: "negative", icon: <Ban className="size-3" aria-hidden /> },
    INSUFFICIENT_INFORMATION: { tone: "muted", icon: <CircleHelp className="size-3" aria-hidden /> },
  };
  const m = map[status] ?? map.INSUFFICIENT_INFORMATION;
  return (
    <Badge tone={m.tone} className={className}>
      {m.icon}
      {COMPATIBILITY_LABEL[status] ?? status}
    </Badge>
  );
}

export function ScoreMeter({ score, manual, size = "md" }: { score: number | null | undefined; manual?: boolean; size?: "sm" | "md" | "lg" }) {
  if (score == null) return <span className="text-sm text-slate-500">—</span>;
  const tone = score >= 75 ? "bg-emerald-600" : score >= 55 ? "bg-sky-600" : score >= 35 ? "bg-amber-500" : "bg-slate-400";
  const text = size === "lg" ? "text-3xl" : size === "md" ? "text-lg" : "text-sm";
  return (
    <div className="flex items-center gap-2" aria-label={`Score ${score} de 100${manual ? " (ajustado manualmente)" : ""}`}>
      <span className={cx("font-semibold tabular-nums text-slate-900", text)}>
        {score}
        <span className="text-xs font-normal text-slate-500">/100</span>
      </span>
      {size !== "sm" && (
        <span className="h-1.5 w-16 overflow-hidden rounded bg-slate-200" aria-hidden>
          <span className={cx("block h-full", tone)} style={{ width: `${Math.max(2, score)}%` }} />
        </span>
      )}
      {manual && <Badge tone="brand" title="Valor ajustado manualmente; o automático é preservado">manual</Badge>}
    </div>
  );
}

const HUMAN = new Set(["INTERESTED", "ANALYZING_DOCUMENTS", "PREPARING_PROPOSAL", "READY_FOR_HUMAN_SUBMISSION", "SUBMITTED_EXTERNALLY", "WON", "LOST", "DISCARDED", "CANCELLED"]);

export function DecisionBadge({ status }: { status: string | null | undefined }) {
  if (!status || !HUMAN.has(status)) {
    return (
      <Badge tone="muted">
        <CircleDashed className="size-3" aria-hidden />
        Decisão: ainda não analisada
      </Badge>
    );
  }
  const tone = status === "DISCARDED" || status === "LOST" || status === "CANCELLED" ? "neutral" : status === "WON" ? "positive" : "brand";
  return (
    <Badge tone={tone}>
      <ShieldCheck className="size-3" aria-hidden />
      Decisão: {WORKFLOW_LABEL[status] ?? status}
    </Badge>
  );
}

export function DeadlineBadge({ deadline, kind, now = new Date() }: { deadline: Date | null | undefined; kind?: string; now?: Date }) {
  if (kind === "FUTURE_PROCUREMENT") return <Badge tone="info"><Clock className="size-3" aria-hidden />Sem edital publicado</Badge>;
  if (!deadline) return <Badge tone="muted"><Clock className="size-3" aria-hidden />Prazo não informado</Badge>;
  const days = daysUntil(deadline, now);
  const label = days < 0 ? "Encerrado" : days === 0 ? "Encerra hoje" : `${days} dia${days === 1 ? "" : "s"}`;
  const tone = days < 0 ? "neutral" : days <= 3 ? "negative" : days <= 7 ? "attention" : "positive";
  return (
    <Badge tone={tone} title={`Encerramento das propostas: ${formatDateTime(deadline)}`}>
      <Clock className="size-3" aria-hidden />
      {label}
    </Badge>
  );
}

export function KindBadge({ kind }: { kind: string }) {
  return <Badge tone={kind === "FUTURE_PROCUREMENT" ? "info" : "neutral"}>{KIND_LABEL[kind] ?? kind}</Badge>;
}

export function InnovationBadge({ innovationClass }: { innovationClass: string }) {
  if (!innovationClass || innovationClass === "NONE") return null;
  const strong = innovationClass !== "INNOVATION_MENTION";
  return (
    <Badge tone={strong ? "brand" : "muted"} title={strong ? "Classificado a partir de base legal/modalidade oficial" : "Apenas menção textual — não caracteriza CPSI"}>
      <Lightbulb className="size-3" aria-hidden />
      {INNOVATION_LABEL[innovationClass]}
    </Badge>
  );
}

export function VerificationBadge({ verification }: { verification: string }) {
  return verification === "VERIFIED" ? (
    <Badge tone="positive" title="Trecho encontrado literalmente na fonte">
      <ShieldCheck className="size-3" aria-hidden />
      Citação verificada
    </Badge>
  ) : (
    <Badge tone="attention" title="Não foi possível localizar o trecho na fonte — não tratar como fato">
      <ShieldAlert className="size-3" aria-hidden />
      Não confirmado na fonte
    </Badge>
  );
}

export function AttentionIcon() {
  return <AlertTriangle className="size-3.5 text-amber-600" aria-hidden />;
}
