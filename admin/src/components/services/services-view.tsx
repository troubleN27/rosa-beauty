"use client";

import { EyeOff, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteCategoryAction,
  deleteServiceAction,
  setServiceActiveAction,
} from "@/app/(dashboard)/services/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CategoryDialog } from "@/components/services/category-dialog";
import { ServiceDialog } from "@/components/services/service-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CategoryValues, ServiceValues } from "@/lib/validations/catalog";
import { categoryTone } from "@/lib/category-tone";

export type ServiceRow = {
  id: string;
  nameRu: string;
  nameEn: string;
  descriptionRu: string | null;
  descriptionEn: string | null;
  durationMin: number;
  duration: string;
  price: string;
  priceLabel: string;
  sort: number;
  isActive: boolean;
  bookingsCount: number;
  mastersCount: number;
};

export type CategoryView = {
  id: string;
  nameRu: string;
  nameEn: string;
  sort: number;
  isActive: boolean;
  services: ServiceRow[];
};

function HiddenMark() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      <EyeOff className="size-3" aria-hidden />
      Скрыта
    </span>
  );
}

export function ServicesView({
  categories,
  selectedId,
  currency,
}: {
  categories: CategoryView[];
  selectedId: string | null;
  currency: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; initial: CategoryValues | null }>({
    open: false,
    initial: null,
  });
  const [serviceDialog, setServiceDialog] = useState<{ open: boolean; initial: ServiceValues | null }>({
    open: false,
    initial: null,
  });
  const [confirm, setConfirm] = useState<
    { kind: "category"; id: string; name: string } | { kind: "service"; id: string; name: string } | null
  >(null);

  const selected = categories.find((c) => c.id === selectedId) ?? categories[0] ?? null;
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.nameRu }));

  function selectCategory(id: string) {
    router.replace(`${pathname}?category=${id}`, { scroll: false });
  }

  function newService() {
    if (!selected) return;
    setServiceDialog({
      open: true,
      initial: {
        categoryId: selected.id,
        nameRu: "",
        nameEn: "",
        descriptionRu: "",
        descriptionEn: "",
        durationMin: 60,
        price: 0,
        sort: (selected.services.at(-1)?.sort ?? 0) + 1,
        isActive: true,
      },
    });
  }

  function editService(service: ServiceRow) {
    if (!selected) return;
    setServiceDialog({
      open: true,
      initial: {
        id: service.id,
        categoryId: selected.id,
        nameRu: service.nameRu,
        nameEn: service.nameEn,
        descriptionRu: service.descriptionRu ?? "",
        descriptionEn: service.descriptionEn ?? "",
        durationMin: service.durationMin,
        price: Number(service.price),
        sort: service.sort,
        isActive: service.isActive,
      },
    });
  }

  function toggleService(service: ServiceRow) {
    startTransition(async () => {
      const result = await setServiceActiveAction({ id: service.id, isActive: !service.isActive });
      if (!result.ok) return void toast.error(result.error);
      toast.success(service.isActive ? "Услуга скрыта из бота" : "Услуга снова видна в боте");
      router.refresh();
    });
  }

  function runDelete() {
    if (!confirm) return;
    startTransition(async () => {
      const result =
        confirm.kind === "category" ? await deleteCategoryAction(confirm.id) : await deleteServiceAction(confirm.id);
      setConfirm(null);
      if (!result.ok) return void toast.error(result.error);
      toast.success(confirm.kind === "category" ? "Категория удалена" : "Услуга удалена");
      if (confirm.kind === "category") router.replace(pathname);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {categories.length > 0 && (
          <div className="max-w-full overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
            <Tabs value={selected?.id ?? ""} onValueChange={(value) => selectCategory(String(value))}>
              <TabsList>
                {categories.map((category) => (
                  <TabsTrigger key={category.id} value={category.id} className={category.isActive ? "" : "opacity-60"}>
                    {category.nameRu}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}
        <Button variant="outline" onClick={() => setCategoryDialog({ open: true, initial: null })}>
          <Plus aria-hidden />
          Категория
        </Button>
      </div>

      {!selected ? (
        <p className="rounded-xl border bg-card empty-state px-4 py-12 text-center text-sm text-muted-foreground">
          Категорий пока нет. Создайте первую категорию, затем добавьте в неё услуги.
        </p>
      ) : (
        <section className="rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="tone-dot size-2.5 shrink-0 rounded-full" style={categoryTone(selected.sort)} aria-hidden />
              <h2 className="truncate font-display text-2xl font-semibold">{selected.nameRu}</h2>
              <span className="truncate text-sm text-muted-foreground">{selected.nameEn}</span>
              {!selected.isActive && <HiddenMark />}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCategoryDialog({
                    open: true,
                    initial: {
                      id: selected.id,
                      nameRu: selected.nameRu,
                      nameEn: selected.nameEn,
                      sort: selected.sort,
                      isActive: selected.isActive,
                    },
                  })
                }
              >
                <Pencil aria-hidden />
                Изменить
              </Button>
              {selected.services.length === 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirm({ kind: "category", id: selected.id, name: selected.nameRu })}
                >
                  <Trash2 aria-hidden />
                  Удалить
                </Button>
              )}
              <Button size="sm" onClick={newService}>
                <Plus aria-hidden />
                Услуга
              </Button>
            </div>
          </div>

          {selected.services.length === 0 ? (
            <p className="empty-state px-4 py-10 text-center text-sm text-muted-foreground">В этой категории пока нет услуг.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground">Услуга</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Длительность</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Цена</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Мастера</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Действия</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selected.services.map((service) => (
                  <TableRow key={service.id} className={service.isActive ? "" : "text-muted-foreground"}>
                    <TableCell className="py-2.5">
                      <button type="button" className="text-left hover:text-primary" onClick={() => editService(service)}>
                        <span className="block min-w-40 font-medium">{service.nameRu}</span>
                        <span className="block text-xs text-muted-foreground">{service.nameEn}</span>
                      </button>
                      {!service.isActive && <div className="mt-1"><HiddenMark /></div>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{service.duration}</TableCell>
                    <TableCell className="tabular-nums">{service.priceLabel}</TableCell>
                    <TableCell>
                      {service.mastersCount > 0 ? (
                        service.mastersCount
                      ) : (
                        <span className="text-xs text-destructive">нет — в боте не видна</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon-sm" aria-label={`Действия: ${service.nameRu}`} />}
                        >
                          <MoreHorizontal aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => editService(service)}>Изменить</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleService(service)} disabled={pending}>
                            {service.isActive ? "Скрыть из бота" : "Показать в боте"}
                          </DropdownMenuItem>
                          {service.bookingsCount === 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setConfirm({ kind: "service", id: service.id, name: service.nameRu })}
                              >
                                Удалить
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      )}

      <CategoryDialog
        open={categoryDialog.open}
        onOpenChange={(open) => setCategoryDialog((state) => ({ ...state, open }))}
        initial={categoryDialog.initial}
        onSaved={selectCategory}
      />
      {serviceDialog.initial && (
        <ServiceDialog
          open={serviceDialog.open}
          onOpenChange={(open) => setServiceDialog((state) => ({ ...state, open }))}
          initial={serviceDialog.initial}
          categories={categoryOptions}
          currency={currency}
        />
      )}
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.kind === "category" ? "Удалить категорию?" : "Удалить услугу?"}
        description={`«${confirm?.name ?? ""}» будет удалена без возможности восстановления.`}
        confirmLabel="Удалить"
        pending={pending}
        onConfirm={runDelete}
      />
    </>
  );
}
