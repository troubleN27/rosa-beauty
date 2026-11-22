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
import { useI18n } from "@/i18n/client";

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
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      <EyeOff className="size-3" aria-hidden />
      {t("common.hidden")}
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
  const { t, tm, pick, lang } = useI18n();
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
  const categoryOptions = categories.map((c) => ({ id: c.id, name: pick(c.nameRu, c.nameEn) }));

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
      if (!result.ok) return void toast.error(tm(result.error));
      toast.success(service.isActive ? t("services.hiddenToast") : t("services.shownToast"));
      router.refresh();
    });
  }

  function runDelete() {
    if (!confirm) return;
    startTransition(async () => {
      const result =
        confirm.kind === "category" ? await deleteCategoryAction(confirm.id) : await deleteServiceAction(confirm.id);
      setConfirm(null);
      if (!result.ok) return void toast.error(tm(result.error));
      toast.success(confirm.kind === "category" ? t("services.categoryDeleted") : t("services.serviceDeleted"));
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
                    {pick(category.nameRu, category.nameEn)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}
        <Button variant="outline" onClick={() => setCategoryDialog({ open: true, initial: null })}>
          <Plus aria-hidden />
          {t("services.category")}
        </Button>
      </div>

      {!selected ? (
        <p className="rounded-xl border bg-card empty-state px-4 py-12 text-center text-sm text-muted-foreground">
          {t("services.noCategories")}
        </p>
      ) : (
        <section className="rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate font-display text-2xl font-semibold">{pick(selected.nameRu, selected.nameEn)}</h2>
              <span className="truncate text-sm text-muted-foreground">{lang === "en" ? selected.nameRu : selected.nameEn}</span>
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
                {t("common.edit")}
              </Button>
              {selected.services.length === 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirm({ kind: "category", id: selected.id, name: pick(selected.nameRu, selected.nameEn) })}
                >
                  <Trash2 aria-hidden />
                  {t("common.delete")}
                </Button>
              )}
              <Button size="sm" onClick={newService}>
                <Plus aria-hidden />
                {t("services.service")}
              </Button>
            </div>
          </div>

          {selected.services.length === 0 ? (
            <p className="empty-state px-4 py-10 text-center text-sm text-muted-foreground">{t("services.noServices")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground">{t("services.columns.service")}</TableHead>
                  <TableHead className="text-xs text-muted-foreground">{t("services.columns.duration")}</TableHead>
                  <TableHead className="text-xs text-muted-foreground">{t("services.columns.price")}</TableHead>
                  <TableHead className="text-xs text-muted-foreground">{t("services.columns.masters")}</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">{t("common.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selected.services.map((service) => (
                  <TableRow key={service.id} className={service.isActive ? "" : "text-muted-foreground"}>
                    <TableCell className="py-2.5">
                      <button type="button" className="text-left hover:text-primary" onClick={() => editService(service)}>
                        <span className="block min-w-40 font-medium">{pick(service.nameRu, service.nameEn)}</span>
                        <span className="block text-xs text-muted-foreground">{lang === "en" ? service.nameRu : service.nameEn}</span>
                      </button>
                      {!service.isActive && <div className="mt-1"><HiddenMark /></div>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{service.duration}</TableCell>
                    <TableCell className="tabular-nums">{service.priceLabel}</TableCell>
                    <TableCell>
                      {service.mastersCount > 0 ? (
                        service.mastersCount
                      ) : (
                        <span className="text-xs text-destructive">{t("services.nobodyDoes")}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon-sm" aria-label={t("services.actionsFor", { name: pick(service.nameRu, service.nameEn) })} />}
                        >
                          <MoreHorizontal aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => editService(service)}>{t("common.edit")}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleService(service)} disabled={pending}>
                            {service.isActive ? t("services.hide") : t("services.show")}
                          </DropdownMenuItem>
                          {service.bookingsCount === 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setConfirm({ kind: "service", id: service.id, name: pick(service.nameRu, service.nameEn) })}
                              >
                                {t("common.delete")}
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
        title={confirm?.kind === "category" ? t("services.deleteCategory") : t("services.deleteService")}
        description={t("services.deleteText", { name: confirm?.name ?? "" })}
        confirmLabel={t("common.delete")}
        pending={pending}
        onConfirm={runDelete}
      />
    </>
  );
}
