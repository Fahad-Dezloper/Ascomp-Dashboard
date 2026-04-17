"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import {
  RECOMMENDED_CFM_MODEL_RULES,
  type CfmModelRule,
} from "@/lib/cfm-model-rules";

export type { CfmModelRule };

type Props = {
  rules: CfmModelRule[];
  onChange: (rules: CfmModelRule[]) => void;
  compact?: boolean;
};

export function CfmModelRulesEditor({
  rules,
  onChange,
  compact = false,
}: Props) {
  const update = (index: number, patch: Partial<CfmModelRule>) => {
    onChange(
      rules.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  };

  const remove = (index: number) =>
    onChange(rules.filter((_, i) => i !== index));

  const add = () =>
    onChange([
      ...rules,
      { projectorModelPattern: "", min: 7, max: 8.5 },
    ]);

  const cellPad = compact ? "py-1 px-1" : "py-2 px-2";

  return (
    <div className="border border-border/60 bg-card shadow-sm rounded-lg overflow-hidden">
      <div className="py-2.5 px-4 border-b border-border/50 bg-muted/20 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-semibold text-foreground tracking-tight text-sm">
            Exhaust CFM — model ranges
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xl">
            Match is by substring on projector model (e.g. CP2220). Inclusive
            min–max: values inside the band store as OK; below min as LOW;
            above max as HIGH in the report. No match falls back to OK when a
            reading exists.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs shrink-0"
          onClick={() => onChange([...RECOMMENDED_CFM_MODEL_RULES])}
        >
          Reset to recommended
        </Button>
      </div>
      <CardContent className={`p-2.5 ${compact ? "space-y-2" : "space-y-3"}`}>
        <div className="overflow-x-auto rounded-md border border-border/50">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-muted/40 border-b border-border/50">
                <th className={`font-semibold text-foreground ${cellPad}`}>
                  Model contains
                </th>
                <th className={`font-semibold text-foreground w-24 ${cellPad}`}>
                  Min (M/S)
                </th>
                <th className={`font-semibold text-foreground w-24 ${cellPad}`}>
                  Max (M/S)
                </th>
                <th className={`w-10 ${cellPad}`} />
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className={`text-muted-foreground italic ${cellPad}`}
                  >
                    No rules — field engineers use recommended defaults until
                    you save at least one row.
                  </td>
                </tr>
              ) : (
                rules.map((row, idx) => (
                  <tr
                    key={`${row.projectorModelPattern}-${idx}`}
                    className="border-b border-border/40 last:border-b-0"
                  >
                    <td className={cellPad}>
                      <Input
                        value={row.projectorModelPattern}
                        onChange={(e) =>
                          update(idx, {
                            projectorModelPattern: e.target.value,
                          })
                        }
                        placeholder="e.g. CP2220"
                        className="h-8 text-xs border-border"
                      />
                    </td>
                    <td className={cellPad}>
                      <Input
                        type="number"
                        step="any"
                        value={Number.isNaN(row.min) ? "" : row.min}
                        onChange={(e) =>
                          update(idx, {
                            min: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-xs border-border"
                      />
                    </td>
                    <td className={cellPad}>
                      <Input
                        type="number"
                        step="any"
                        value={Number.isNaN(row.max) ? "" : row.max}
                        onChange={(e) =>
                          update(idx, {
                            max: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-xs border-border"
                      />
                    </td>
                    <td className={cellPad}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => remove(idx)}
                        aria-label="Remove rule"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={add}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add rule
        </Button>
      </CardContent>
    </div>
  );
}
