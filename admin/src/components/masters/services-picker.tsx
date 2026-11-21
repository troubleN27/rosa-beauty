"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setMasterServicesAction } from "@/app/(dashboard)/masters/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type Group = { id: string; name: string; services: { id: string; name: string; hint: string; isActive: boolean }[] };

export function ServicesPicker({
  masterId,
  groups,
  selected: initial,
}: {
  masterId: string;
  groups: Group[];
  selected: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(() => new Set(initial));
  const [pending, startTransition] = useTransition();
  const dirty = selected.size !== initial.length || initial.some((id) => !selected.has(id));

  function toggle(id: string, on: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const result = await setMasterServicesAction(masterId, [...selected]);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Услуги мастера сохранены");
      router.refresh();
    });
  }

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">Услуг пока нет. Добавьте их в разделе «Услуги».</p>;
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => {
          const ids = group.services.map((s) => s.id);
          const all = ids.length > 0 && ids.every((id) => selected.has(id));
          return (
            <fieldset key={group.id} className="rounded-xl border bg-card p-4">
              <legend className="sr-only">{group.name}</legend>
              <label className="mb-3 flex items-center gap-2 font-medium">
                <Checkbox
                  checked={all}
                  indeterminate={!all && ids.some((id) => selected.has(id))}
                  onCheckedChange={(on) => ids.forEach((id) => toggle(id, on))}
                />
                {group.name}
              </label>
              <ul className="space-y-2 pl-1">
                {group.services.map((service) => (
                  <li key={service.id}>
                    <label className="flex items-start gap-2 text-sm">
                      <Checkbox
                        className="mt-0.5"
                        checked={selected.has(service.id)}
                        onCheckedChange={(on) => toggle(service.id, on)}
                      />
                      <span>
                        {service.name}
                        <span className="block text-xs text-muted-foreground">
                          {service.hint}
                          {!service.isActive && " · скрыта"}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-3">
        <span className="text-sm text-muted-foreground">Выбрано: {selected.size}</span>
        <Button onClick={save} disabled={!dirty || pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Сохранить услуги
        </Button>
      </div>
    </div>
  );
}
