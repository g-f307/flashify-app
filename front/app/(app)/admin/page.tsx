"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowDownWideNarrow,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  CopyPlus,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import {
  AdminUserUpdateRequest,
  AcquisitionPerformance,
  AcquisitionSummary,
  AnalyticsFilters,
  AnalyticsFunnel,
  AnalyticsRetention,
  AnalyticsUserDetail,
  AnalyticsOverview,
  AnalyticsUserRow,
  apiClient,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type FilterState = {
  days: string;
  provider: string;
  lifecycle_stage: string;
  include_internal: string;
  utm_source: string;
  utm_campaign: string;
  is_team: string;
  is_test_user: string;
  is_blocked: string;
};

type SortKey =
  | "username"
  | "provider"
  | "utm_source"
  | "lifecycle_stage"
  | "total_decks"
  | "flashcards_studied"
  | "quizzes_completed"
  | "created_at"
  | "activated_at"
  | "last_login_at";

type SortDirection = "asc" | "desc";

type PdfExportOptions = {
  includeFilters: boolean;
  includeOverview: boolean;
  includeAcquisition: boolean;
  includeUsers: boolean;
  includeMilestones: boolean;
  includeMetrics: boolean;
};

type ReportPresetId = "executive" | "campaign" | "operational" | "custom";

const DEFAULT_OVERVIEW: AnalyticsOverview = {
  total_users: 0,
  new_users_7d: 0,
  active_users_7d: 0,
  activated_users_7d: 0,
  users_with_decks: 0,
  users_who_studied: 0,
  users_who_completed_quiz: 0,
  decks_created_7d: 0,
  decks_completed_7d: 0,
};

const DEFAULT_ACQUISITION: AcquisitionSummary = {
  unattributed_users: 0,
  top_sources: [],
  top_campaigns: [],
};

const DEFAULT_ACQUISITION_PERFORMANCE: AcquisitionPerformance = {
  attributed_users: 0,
  top_sources: [],
  top_campaigns: [],
};

const DEFAULT_FUNNEL: AnalyticsFunnel = {
  cohort_users: 0,
  steps: [],
};

const DEFAULT_RETENTION: AnalyticsRetention = {
  active_users_1d: 0,
  active_users_7d: 0,
  active_users_30d: 0,
  returning_users_7d: 0,
  returning_users_30d: 0,
  activation_retention_7d: 0,
  activation_retention_30d: 0,
};

const DEFAULT_PDF_OPTIONS: PdfExportOptions = {
  includeFilters: true,
  includeOverview: true,
  includeAcquisition: true,
  includeUsers: true,
  includeMilestones: true,
  includeMetrics: true,
};

const REPORT_STORAGE_KEY = "flashify-admin-report-preset";
const REPORT_OPTIONS_STORAGE_KEY = "flashify-admin-report-options";

const REPORT_PRESETS: Record<
  Exclude<ReportPresetId, "custom">,
  {
    label: string;
    description: string;
    reportTitle: string;
    reportSubtitle: string;
    filenameSuffix: string;
    options: PdfExportOptions;
  }
> = {
  executive: {
    label: "Executivo",
    description: "Resumo direto para liderança com foco em visão geral e aquisição.",
    reportTitle: "Relatório Executivo Flashify",
    reportSubtitle: "Resumo de ativação, aquisição e leitura de negócio para acompanhamento gerencial.",
    filenameSuffix: "executivo",
    options: {
      includeFilters: true,
      includeOverview: true,
      includeAcquisition: true,
      includeUsers: false,
      includeMilestones: false,
      includeMetrics: false,
    },
  },
  campaign: {
    label: "Campanha",
    description: "Leitura de qualidade de aquisição para marketing e tráfego pago.",
    reportTitle: "Relatório de Campanhas Flashify",
    reportSubtitle: "Desempenho de aquisição com foco em origem, ativação e consistência de uso.",
    filenameSuffix: "campanhas",
    options: {
      includeFilters: true,
      includeOverview: false,
      includeAcquisition: true,
      includeUsers: true,
      includeMilestones: false,
      includeMetrics: true,
    },
  },
  operational: {
    label: "Operacional",
    description: "Base detalhada para suporte, operação e acompanhamento diário da equipe.",
    reportTitle: "Relatório Operacional Flashify",
    reportSubtitle: "Visão operacional da base filtrada com usuários, marcos do funil e sinais de uso.",
    filenameSuffix: "operacional",
    options: {
      includeFilters: true,
      includeOverview: true,
      includeAcquisition: false,
      includeUsers: true,
      includeMilestones: true,
      includeMetrics: true,
    },
  },
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const LIFECYCLE_LABELS: Record<string, string> = {
  registered: "Registrado",
  created_deck: "Criou deck",
  studied: "Estudou",
  quiz_completed: "Quiz concluído",
  activated: "Ativado",
};

const SORT_LABELS: Record<SortKey, string> = {
  username: "Nome",
  provider: "Provider",
  utm_source: "Origem",
  lifecycle_stage: "Estágio",
  total_decks: "Decks",
  flashcards_studied: "Estudos",
  quizzes_completed: "Quizzes",
  created_at: "Cadastro",
  activated_at: "Ativação",
  last_login_at: "Último login",
};

const formatDateTime = (value: string | null) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const formatDateTimeLong = (value: string | null) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const formatCompact = (value: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);

const buildFilters = (filters: FilterState): AnalyticsFilters => ({
  days: Number(filters.days),
  provider: filters.provider === "all" ? undefined : (filters.provider as "local" | "google"),
  lifecycle_stage: filters.lifecycle_stage === "all" ? undefined : filters.lifecycle_stage,
  include_internal: filters.include_internal === "yes",
  utm_source: filters.utm_source === "all" ? undefined : filters.utm_source,
  utm_campaign: filters.utm_campaign === "all" ? undefined : filters.utm_campaign,
  is_team: filters.is_team === "all" ? undefined : filters.is_team === "yes",
  is_test_user: filters.is_test_user === "all" ? undefined : filters.is_test_user === "yes",
  is_blocked: filters.is_blocked === "all" ? undefined : filters.is_blocked === "yes",
});

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const getLifecycleLabel = (value: string | null) =>
  LIFECYCLE_LABELS[value || "registered"] || value || "Registrado";

const arePdfOptionsEqual = (left: PdfExportOptions, right: PdfExportOptions) =>
  left.includeFilters === right.includeFilters &&
  left.includeOverview === right.includeOverview &&
  left.includeAcquisition === right.includeAcquisition &&
  left.includeUsers === right.includeUsers &&
  left.includeMilestones === right.includeMilestones &&
  left.includeMetrics === right.includeMetrics;

const getSortValue = (entry: AnalyticsUserRow, key: SortKey): string | number => {
  switch (key) {
    case "username":
      return entry.username.toLowerCase();
    case "provider":
      return entry.provider.toLowerCase();
    case "utm_source":
      return (entry.utm_source || "").toLowerCase();
    case "lifecycle_stage":
      return getLifecycleLabel(entry.lifecycle_stage).toLowerCase();
    case "total_decks":
      return entry.total_decks;
    case "flashcards_studied":
      return entry.flashcards_studied;
    case "quizzes_completed":
      return entry.quizzes_completed;
    case "created_at":
      return entry.created_at ? new Date(entry.created_at).getTime() : 0;
    case "activated_at":
      return entry.activated_at ? new Date(entry.activated_at).getTime() : 0;
    case "last_login_at":
      return entry.last_login_at ? new Date(entry.last_login_at).getTime() : 0;
    default:
      return 0;
  }
};

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "blue",
}: {
  title: string;
  value: string | number;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone?: "blue" | "yellow" | "emerald" | "slate";
}) {
  const toneClass = {
    blue: "from-[#48cfea]/18 via-[#48cfea]/8 to-transparent border-[#48cfea]/30",
    yellow: "from-[#facc15]/18 via-[#facc15]/8 to-transparent border-[#facc15]/30",
    emerald: "from-emerald-500/16 via-emerald-500/8 to-transparent border-emerald-500/30",
    slate: "from-slate-500/14 via-slate-500/6 to-transparent border-slate-500/20",
  }[tone];

  return (
    <Card className={cn("relative overflow-hidden border bg-card/95 shadow-sm", toneClass)}>
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.02),transparent_45%)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.03),transparent_50%)]" />
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardDescription className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
            {title}
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight">{value}</CardTitle>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/80 p-2.5 shadow-sm">
          <Icon className="h-5 w-5 text-foreground/80" />
        </div>
      </CardHeader>
      <CardContent className="relative pt-0">
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isFetching, setIsFetching] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    days: "30",
    provider: "all",
    lifecycle_stage: "all",
    include_internal: "no",
    utm_source: "all",
    utm_campaign: "all",
    is_team: "all",
    is_test_user: "all",
    is_blocked: "all",
  });
  const [overview, setOverview] = useState<AnalyticsOverview>(DEFAULT_OVERVIEW);
  const [acquisition, setAcquisition] = useState<AcquisitionSummary>(DEFAULT_ACQUISITION);
  const [acquisitionPerformance, setAcquisitionPerformance] = useState<AcquisitionPerformance>(DEFAULT_ACQUISITION_PERFORMANCE);
  const [funnel, setFunnel] = useState<AnalyticsFunnel>(DEFAULT_FUNNEL);
  const [retention, setRetention] = useState<AnalyticsRetention>(DEFAULT_RETENTION);
  const [users, setUsers] = useState<AnalyticsUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [sortKey, setSortKey] = useState<SortKey>("last_login_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfOptions, setPdfOptions] = useState<PdfExportOptions>(DEFAULT_PDF_OPTIONS);
  const [reportPreset, setReportPreset] = useState<ReportPresetId>("executive");
  const [isUserSheetOpen, setIsUserSheetOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<AnalyticsUserDetail | null>(null);
  const [isUserDetailLoading, setIsUserDetailLoading] = useState(false);
  const [isSavingUserAdmin, setIsSavingUserAdmin] = useState(false);
  const [userAdminDraft, setUserAdminDraft] = useState<AdminUserUpdateRequest>({});
  const [noteDraft, setNoteDraft] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const apiFilters = useMemo(() => buildFilters(filters), [filters]);
  const userSourceOptions = useMemo(
    () => Array.from(new Set(users.map((entry) => entry.utm_source).filter(Boolean) as string[])).sort(),
    [users]
  );
  const userCampaignOptions = useMemo(
    () => Array.from(new Set(users.map((entry) => entry.utm_campaign).filter(Boolean) as string[])).sort(),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return users;

    return users.filter((entry) =>
      [entry.username, entry.email, entry.utm_source, entry.utm_campaign]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }, [search, users]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const left = getSortValue(a, sortKey);
      const right = getSortValue(b, sortKey);

      if (typeof left === "number" && typeof right === "number") {
        return sortDirection === "asc" ? left - right : right - left;
      }

      const result = String(left).localeCompare(String(right), "pt-BR", { sensitivity: "base" });
      return sortDirection === "asc" ? result : -result;
    });
  }, [filteredUsers, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [currentPage, pageSize, sortedUsers]);

  const activationRate = overview.total_users > 0
    ? Math.round((overview.activated_users_7d / overview.total_users) * 100)
    : 0;
  const retentionRate7d = overview.total_users > 0
    ? Math.round((retention.returning_users_7d / overview.total_users) * 100)
    : 0;
  const retentionRate30d = overview.total_users > 0
    ? Math.round((retention.returning_users_30d / overview.total_users) * 100)
    : 0;
  const isEditingSelf = selectedUserDetail?.id === user.id;
  const invalidSelfAdminChange = Boolean(
    isEditingSelf &&
      (userAdminDraft.is_team === false || userAdminDraft.is_blocked === true)
  );
  const activeReportDefinition =
    reportPreset === "custom" ? null : REPORT_PRESETS[reportPreset];

  const filtersSummary = useMemo(
    () => [
      { label: "Período", value: `${filters.days} dias` },
      { label: "Provider", value: filters.provider === "all" ? "Todos" : filters.provider },
      {
        label: "Estágio",
        value:
          filters.lifecycle_stage === "all"
            ? "Todos"
            : getLifecycleLabel(filters.lifecycle_stage),
      },
      {
        label: "Internos",
        value: filters.include_internal === "yes" ? "Incluídos" : "Ocultos",
      },
      { label: "Equipe", value: filters.is_team === "all" ? "Todos" : filters.is_team === "yes" ? "Sim" : "Não" },
      { label: "Teste", value: filters.is_test_user === "all" ? "Todos" : filters.is_test_user === "yes" ? "Sim" : "Não" },
      { label: "Bloqueado", value: filters.is_blocked === "all" ? "Todos" : filters.is_blocked === "yes" ? "Sim" : "Não" },
      { label: "Origem", value: filters.utm_source === "all" ? "Todas" : filters.utm_source },
      {
        label: "Campanha",
        value: filters.utm_campaign === "all" ? "Todas" : filters.utm_campaign,
      },
      { label: "Busca", value: search.trim() || "Sem busca local" },
      { label: "Ordenação", value: `${SORT_LABELS[sortKey]} • ${sortDirection === "asc" ? "Crescente" : "Decrescente"}` },
    ],
    [filters, search, sortDirection, sortKey]
  );

  const loadAdminData = () => {
    if (!user?.is_team) {
      return;
    }

    let cancelled = false;
    setIsFetching(true);
    setError(null);

    Promise.all([
      apiClient.getAnalyticsOverview(apiFilters),
      apiClient.getAcquisitionSummary({ ...apiFilters, limit: 8 }),
      apiClient.getAcquisitionPerformance({ ...apiFilters, limit: 6 }),
      apiClient.getAnalyticsFunnel(apiFilters),
      apiClient.getAnalyticsRetention(apiFilters),
      apiClient.getAnalyticsUsers({ ...apiFilters, limit: 200 }),
    ])
      .then(([overviewResponse, acquisitionResponse, acquisitionPerformanceResponse, funnelResponse, retentionResponse, usersResponse]) => {
        if (cancelled) return;
        setOverview(overviewResponse);
        setAcquisition(acquisitionResponse);
        setAcquisitionPerformance(acquisitionPerformanceResponse);
        setFunnel(funnelResponse);
        setRetention(retentionResponse);
        setUsers(usersResponse);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        console.error("Erro ao carregar admin:", fetchError);
        setError("Não foi possível carregar os indicadores do admin.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsFetching(false);
        }
      });

    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    if (!loading && user && !user.is_team) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user?.is_team) {
      return;
    }
    return loadAdminData();
  }, [apiFilters, user?.is_team]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, search, sortKey, sortDirection, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedPreset = window.localStorage.getItem(REPORT_STORAGE_KEY);
    const savedOptions = window.localStorage.getItem(REPORT_OPTIONS_STORAGE_KEY);

    if (
      savedPreset === "executive" ||
      savedPreset === "campaign" ||
      savedPreset === "operational" ||
      savedPreset === "custom"
    ) {
      setReportPreset(savedPreset);
    }

    if (savedOptions) {
      try {
        const parsed = JSON.parse(savedOptions) as PdfExportOptions;
        if (parsed && typeof parsed === "object") {
          setPdfOptions({
            includeFilters: Boolean(parsed.includeFilters),
            includeOverview: Boolean(parsed.includeOverview),
            includeAcquisition: Boolean(parsed.includeAcquisition),
            includeUsers: Boolean(parsed.includeUsers),
            includeMilestones: Boolean(parsed.includeMilestones),
            includeMetrics: Boolean(parsed.includeMetrics),
          });
        }
      } catch (error) {
        console.error("Erro ao carregar preferências de relatório:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(REPORT_STORAGE_KEY, reportPreset);
    window.localStorage.setItem(REPORT_OPTIONS_STORAGE_KEY, JSON.stringify(pdfOptions));
  }, [pdfOptions, reportPreset]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "username" || key === "utm_source" || key === "provider" ? "asc" : "desc");
  };

  const applyReportPreset = (preset: Exclude<ReportPresetId, "custom">) => {
    setReportPreset(preset);
    setPdfOptions(REPORT_PRESETS[preset].options);
  };

  const updatePdfOption = (key: keyof PdfExportOptions, value: boolean) => {
    const nextOptions = { ...pdfOptions, [key]: value };
    setPdfOptions(nextOptions);

    const matchingPreset = (Object.entries(REPORT_PRESETS) as Array<
      [Exclude<ReportPresetId, "custom">, (typeof REPORT_PRESETS)[Exclude<ReportPresetId, "custom">]]
    >).find(([, preset]) => arePdfOptionsEqual(preset.options, nextOptions));

    setReportPreset(matchingPreset ? matchingPreset[0] : "custom");
  };

  const openUserSheet = (userId: number) => {
    setSelectedUserId(userId);
    setIsUserSheetOpen(true);
  };

  const loadUserDetail = async (userId: number) => {
    setIsUserDetailLoading(true);
    try {
      const detail = await apiClient.getAnalyticsUserDetail(userId);
      setSelectedUserDetail(detail);
      setUserAdminDraft({
        is_team: detail.is_team,
        is_test_user: detail.is_test_user,
        is_blocked: detail.is_blocked,
      });
      setNoteDraft("");
    } catch (detailError) {
      console.error("Erro ao carregar detalhe do usuário:", detailError);
      setError("Não foi possível carregar os detalhes do usuário.");
    } finally {
      setIsUserDetailLoading(false);
    }
  };

  const saveAdminFlags = async () => {
    if (!selectedUserDetail?.id) return;

    setIsSavingUserAdmin(true);
    setError(null);
    try {
      const updated = await apiClient.updateAnalyticsUser(selectedUserDetail.id, userAdminDraft);
      setSelectedUserDetail(updated);
      setUserAdminDraft({
        is_team: updated.is_team,
        is_test_user: updated.is_test_user,
        is_blocked: updated.is_blocked,
      });
      loadAdminData();
    } catch (saveError) {
      console.error("Erro ao salvar flags administrativas:", saveError);
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar as alterações administrativas.");
    } finally {
      setIsSavingUserAdmin(false);
    }
  };

  const saveAdminNote = async () => {
    if (!selectedUserDetail?.id || !noteDraft.trim()) return;

    setIsSavingNote(true);
    setError(null);
    try {
      await apiClient.createAnalyticsUserNote(selectedUserDetail.id, { note: noteDraft.trim() });
      await loadUserDetail(selectedUserDetail.id);
      setNoteDraft("");
    } catch (noteError) {
      console.error("Erro ao salvar nota administrativa:", noteError);
      setError(noteError instanceof Error ? noteError.message : "Não foi possível salvar a nota.");
    } finally {
      setIsSavingNote(false);
    }
  };

  useEffect(() => {
    if (!isUserSheetOpen || selectedUserId === null) {
      return;
    }
    loadUserDetail(selectedUserId);
  }, [isUserSheetOpen, selectedUserId]);

  const exportCsv = () => {
    const rows = sortedUsers.map((entry) => ({
      usuario: entry.username,
      email: entry.email,
      provider: entry.provider,
      origem: entry.utm_source || "",
      campanha: entry.utm_campaign || "",
      estagio: getLifecycleLabel(entry.lifecycle_stage),
      criado_em: formatDateTime(entry.created_at),
      primeiro_login: formatDateTime(entry.first_login_at),
      primeiro_deck: formatDateTime(entry.first_deck_created_at),
      primeiro_estudo: formatDateTime(entry.first_study_at),
      primeiro_quiz: formatDateTime(entry.first_quiz_at),
      ativado_em: formatDateTime(entry.activated_at),
      decks: entry.total_decks,
      estudos: entry.flashcards_studied,
      quizzes: entry.quizzes_completed,
      ultimo_login: formatDateTime(entry.last_login_at),
    }));

    const headers = Object.keys(rows[0] || {
      usuario: "",
      email: "",
      provider: "",
      origem: "",
      campanha: "",
      estagio: "",
      criado_em: "",
      primeiro_login: "",
      primeiro_deck: "",
      primeiro_estudo: "",
      primeiro_quiz: "",
      ativado_em: "",
      decks: "",
      estudos: "",
      quizzes: "",
      ultimo_login: "",
    });

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const rawValue = String(row[header as keyof typeof row] ?? "");
            return `"${rawValue.replaceAll('"', '""')}"`;
          })
          .join(";")
      ),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const csvSuffix = activeReportDefinition?.filenameSuffix || "custom";
    link.download = `flashify-admin-${csvSuffix}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    setIsExportingPdf(true);

    try {
      const logoUrl = `${window.location.origin}/flashify_logo.svg`;
      const printedAt = formatDateTimeLong(new Date().toISOString());
      const reportTitle = activeReportDefinition?.reportTitle || "Relatório Personalizado Flashify";
      const reportSubtitle =
        activeReportDefinition?.reportSubtitle ||
        "Relatório personalizado com os blocos selecionados pela equipe para este recorte.";
      const reportFilenameSuffix = activeReportDefinition?.filenameSuffix || "custom";
      const usersRowsHtml = sortedUsers
        .map((entry) => {
          const metricParts = pdfOptions.includeMetrics
            ? `<div class="muted">Decks: ${entry.total_decks} • Estudos: ${entry.flashcards_studied} • Quizzes: ${entry.quizzes_completed}</div>`
            : "";

          const milestoneParts = pdfOptions.includeMilestones
            ? `
              <div class="muted">Primeiro deck: ${escapeHtml(formatDateTime(entry.first_deck_created_at))}</div>
              <div class="muted">Primeiro estudo: ${escapeHtml(formatDateTime(entry.first_study_at))}</div>
              <div class="muted">Primeiro quiz: ${escapeHtml(formatDateTime(entry.first_quiz_at))}</div>
              <div class="muted">Ativado em: ${escapeHtml(formatDateTime(entry.activated_at))}</div>
            `
            : "";

          return `
            <tr>
              <td>
                <div class="strong">${escapeHtml(entry.username)}</div>
                <div class="muted">${escapeHtml(entry.email)}</div>
              </td>
              <td>${escapeHtml(entry.provider)}</td>
              <td>${escapeHtml(entry.utm_source || "Sem UTM")}</td>
              <td>${escapeHtml(entry.utm_campaign || "Sem campanha")}</td>
              <td>${escapeHtml(getLifecycleLabel(entry.lifecycle_stage))}</td>
              <td>
                ${metricParts}
                ${milestoneParts}
                <div class="muted">Último login: ${escapeHtml(formatDateTime(entry.last_login_at))}</div>
              </td>
            </tr>
          `;
        })
        .join("");

      const html = `
        <!doctype html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8" />
            <title>${reportTitle}</title>
            <style>
              :root {
                --ink: #111827;
                --muted: #6b7280;
                --line: #d1d5db;
                --line-strong: #9ca3af;
                --accent: #48cfea;
                --accent-2: #facc15;
                --bg-soft: #f8fafc;
              }

              @page {
                size: A4;
                margin: 18mm 14mm 18mm 14mm;
              }

              * { box-sizing: border-box; }
              body {
                margin: 0;
                font-family: Arial, Helvetica, sans-serif;
                color: var(--ink);
                background: white;
                counter-reset: page;
              }

              header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 24px;
                padding-bottom: 14px;
                border-bottom: 1px solid var(--line-strong);
              }

              .brand {
                display: flex;
                align-items: center;
                gap: 14px;
              }

              .brand img {
                width: 128px;
                height: auto;
              }

              .eyebrow {
                font-size: 10px;
                letter-spacing: 0.18em;
                text-transform: uppercase;
                color: var(--muted);
                margin-bottom: 6px;
              }

              h1 {
                margin: 0;
                font-size: 24px;
                line-height: 1.15;
              }

              .sub {
                margin-top: 6px;
                color: var(--muted);
                font-size: 12px;
              }

              .meta {
                text-align: right;
                font-size: 12px;
                color: var(--muted);
              }

              main {
                padding-top: 18px;
              }

              section {
                margin-bottom: 18px;
                page-break-inside: avoid;
              }

              .section-title {
                margin: 0 0 10px;
                font-size: 14px;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: #0f172a;
              }

              .grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
              }

              .metric, .filter-box {
                border: 1px solid var(--line);
                background: var(--bg-soft);
                border-radius: 12px;
                padding: 12px;
              }

              .metric-label, .filter-label {
                color: var(--muted);
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.16em;
                margin-bottom: 8px;
              }

              .metric-value {
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 4px;
              }

              .metric-help {
                font-size: 11px;
                color: var(--muted);
              }

              .two-columns {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 14px;
              }

              .panel {
                border: 1px solid var(--line);
                border-radius: 14px;
                padding: 14px;
              }

              .list {
                margin: 0;
                padding: 0;
                list-style: none;
              }

              .list li {
                display: flex;
                justify-content: space-between;
                gap: 12px;
                padding: 8px 0;
                border-bottom: 1px solid var(--line);
                font-size: 12px;
              }

              .list li:last-child {
                border-bottom: 0;
              }

              table {
                width: 100%;
                border-collapse: collapse;
              }

              th, td {
                border-bottom: 1px solid var(--line);
                padding: 10px 8px;
                vertical-align: top;
                text-align: left;
                font-size: 11px;
              }

              th {
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                color: var(--muted);
              }

              .strong {
                font-weight: 700;
              }

              .muted {
                color: var(--muted);
                font-size: 10px;
                line-height: 1.45;
                margin-top: 2px;
              }

              .summary-band {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                background: linear-gradient(135deg, rgba(72, 207, 234, 0.12), rgba(250, 204, 21, 0.12));
                border: 1px solid rgba(15, 23, 42, 0.08);
                border-radius: 14px;
                padding: 14px 16px;
                margin-bottom: 18px;
              }

              .summary-band strong {
                font-size: 18px;
              }

              footer {
                position: fixed;
                left: 0;
                right: 0;
                bottom: 0;
                padding: 6px 14mm 0;
                border-top: 1px solid var(--line);
                color: var(--muted);
                font-size: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: white;
              }

              .page-number::after {
                content: counter(page);
              }

              @media print {
                .page-break {
                  page-break-before: always;
                }
              }
            </style>
          </head>
          <body>
            <header>
              <div class="brand">
                <img src="${logoUrl}" alt="Flashify" />
                <div>
                  <div class="eyebrow">Relatório Administrativo</div>
                  <h1>${reportTitle}</h1>
                  <div class="sub">${reportSubtitle}</div>
                </div>
              </div>
              <div class="meta">
                <div>Emitido em ${escapeHtml(printedAt)}</div>
                <div>Base considerada: ${sortedUsers.length} usuários</div>
                <div>Janela analítica: ${escapeHtml(filters.days)} dias</div>
              </div>
            </header>

            <main>
              <section class="summary-band">
                <div>
                  <div class="eyebrow">Resumo executivo</div>
                  <strong>${overview.activated_users_7d} ativados no recorte</strong>
                </div>
                <div class="meta">
                  <div>Taxa de ativação: ${activationRate}%</div>
                  <div>Decks concluídos: ${overview.decks_completed_7d}</div>
                </div>
              </section>

              ${pdfOptions.includeFilters ? `
                <section>
                  <h2 class="section-title">Critérios do relatório</h2>
                  <div class="grid">
                    ${filtersSummary
                      .map(
                        (item) => `
                          <div class="filter-box">
                            <div class="filter-label">${escapeHtml(item.label)}</div>
                            <div>${escapeHtml(item.value)}</div>
                          </div>
                        `
                      )
                      .join("")}
                  </div>
                </section>
              ` : ""}

              ${pdfOptions.includeOverview ? `
                <section>
                  <h2 class="section-title">Resumo operacional</h2>
                  <div class="grid">
                    ${[
                      ["Base total", String(overview.total_users), "Usuários visíveis dentro do recorte atual"],
                      ["Novos usuários", String(overview.new_users_7d), "Cadastros novos no período"],
                      ["Usuários ativos", String(overview.active_users_7d), "Logaram no período filtrado"],
                      ["Ativados", String(overview.activated_users_7d), "Alcançaram o marco de ativação"],
                      ["Com deck", String(overview.users_with_decks), "Criaram pelo menos um deck"],
                      ["Estudaram", String(overview.users_who_studied), "Tiveram uso real de estudo"],
                      ["Quiz concluído", String(overview.users_who_completed_quiz), "Chegaram ao quiz"],
                      ["Decks criados", String(overview.decks_created_7d), "Novos decks no recorte"],
                    ]
                      .map(
                        ([label, value, help]) => `
                          <div class="metric">
                            <div class="metric-label">${escapeHtml(label)}</div>
                            <div class="metric-value">${escapeHtml(value)}</div>
                            <div class="metric-help">${escapeHtml(help)}</div>
                          </div>
                        `
                      )
                      .join("")}
                  </div>
                </section>
              ` : ""}

              ${pdfOptions.includeAcquisition ? `
                <section>
                  <h2 class="section-title">Aquisição</h2>
                  <div class="two-columns">
                    <div class="panel">
                      <div class="metric-label">Top fontes</div>
                      <ul class="list">
                        ${
                          acquisition.top_sources.length
                            ? acquisition.top_sources
                                .map(
                                  (item) => `
                                    <li>
                                      <span>${escapeHtml(item.source)}</span>
                                      <strong>${item.users}</strong>
                                    </li>
                                  `
                                )
                                .join("")
                            : `<li><span>Sem origens atribuídas</span><strong>0</strong></li>`
                        }
                      </ul>
                    </div>
                    <div class="panel">
                      <div class="metric-label">Campanhas e não atribuídos</div>
                      <ul class="list">
                        <li>
                          <span>Sem atribuição</span>
                          <strong>${acquisition.unattributed_users}</strong>
                        </li>
                        ${
                          acquisition.top_campaigns.length
                            ? acquisition.top_campaigns
                                .map(
                                  (item) => `
                                    <li>
                                      <span>${escapeHtml(item.source)}</span>
                                      <strong>${item.users}</strong>
                                    </li>
                                  `
                                )
                                .join("")
                            : `<li><span>Sem campanhas atribuídas</span><strong>0</strong></li>`
                        }
                      </ul>
                    </div>
                  </div>
                </section>
              ` : ""}

              ${pdfOptions.includeUsers ? `
                <section class="${pdfOptions.includeOverview || pdfOptions.includeAcquisition ? "page-break" : ""}">
                  <h2 class="section-title">Base de usuários analisada</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Usuário</th>
                        <th>Provider</th>
                        <th>Origem</th>
                        <th>Campanha</th>
                        <th>Estágio</th>
                        <th>Uso e marcos</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${usersRowsHtml || `
                        <tr>
                          <td colspan="6">Nenhum usuário encontrado para os filtros atuais.</td>
                        </tr>
                      `}
                    </tbody>
                  </table>
                </section>
              ` : ""}
            </main>

            <footer>
              <span>Flashify Admin Report</span>
              <span>Gerado para uso interno da equipe</span>
              <span>Página <span class="page-number"></span></span>
            </footer>
          </body>
        </html>
      `;

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.setAttribute("aria-hidden", "true");
      document.body.appendChild(iframe);

      const iframeDocument = iframe.contentWindow?.document;
      if (!iframeDocument || !iframe.contentWindow) {
        document.body.removeChild(iframe);
        throw new Error("Não foi possível preparar a impressão do relatório.");
      }

      iframeDocument.open();
      iframeDocument.write(html);
      iframeDocument.close();

      iframe.onload = () => {
        const cleanup = () => {
          window.setTimeout(() => {
            iframe.remove();
          }, 300);
        };

        iframe.contentWindow?.focus();
        iframeDocument.title = `${reportFilenameSuffix}-${new Date().toISOString().slice(0, 10)}`;
        iframe.contentWindow?.print();
        iframe.contentWindow?.addEventListener("afterprint", cleanup, { once: true });
        window.setTimeout(cleanup, 1500);
      };

      setIsPdfDialogOpen(false);
    } catch (pdfError) {
      console.error("Erro ao gerar PDF:", pdfError);
      setError("Não foi possível gerar o relatório PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (loading || (user?.is_team && isFetching && users.length === 0)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/90 px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Preparando visão administrativa...</span>
        </div>
      </div>
    );
  }

  if (!user?.is_team) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.82))] p-6 shadow-sm dark:border-zinc-800/80 dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(24,24,27,0.92))]">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(72,207,234,0.16),transparent_52%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.16),transparent_44%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <Badge variant="outline" className="gap-2 border-[#48cfea]/30 bg-[#48cfea]/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#0f5f6f] dark:text-[#87ebfb]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Flashify Admin
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Operação, aquisição e uso real em uma única superfície.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Painel interno para a equipe acompanhar ativação, campanhas e comportamento do produto sem depender de consultas manuais no banco.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-border/60 bg-background/75 px-4 py-3 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/40">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Janela</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{filters.days} dias</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/75 px-4 py-3 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/40">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Ativação</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{activationRate}%</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/75 px-4 py-3 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/40">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Origens</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{acquisition.top_sources.length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/75 px-4 py-3 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/40">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Usuários</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{formatCompact(overview.total_users)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-3xl border border-border/60 bg-card/70 p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/70 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9">
        <div className="flex flex-col gap-3 px-2 pb-2 md:col-span-2 lg:col-span-4 xl:col-span-9 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Filtros estratégicos</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filters.include_internal === "no" ? (
              <Badge variant="outline" className="border-[#facc15]/30 bg-[#facc15]/12 text-[#6a5600] dark:text-[#ffe27c]">
                Contas internas ocultas
              </Badge>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={!sortedUsers.length}
              className="gap-2"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Exportar CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPdfDialogOpen(true)}
              disabled={!sortedUsers.length}
              className="gap-2"
            >
              <FileText className="h-3.5 w-3.5" />
              Exportar PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAdminData()}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCcw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Período</label>
          <Select value={filters.days} onValueChange={(value) => setFilters((prev) => ({ ...prev, days: value }))}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Provider</label>
          <Select value={filters.provider} onValueChange={(value) => setFilters((prev) => ({ ...prev, provider: value }))}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="local">Email e senha</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Estágio</label>
          <Select value={filters.lifecycle_stage} onValueChange={(value) => setFilters((prev) => ({ ...prev, lifecycle_stage: value }))}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="registered">Registrado</SelectItem>
              <SelectItem value="created_deck">Criou deck</SelectItem>
              <SelectItem value="studied">Estudou</SelectItem>
              <SelectItem value="quiz_completed">Quiz concluído</SelectItem>
              <SelectItem value="activated">Ativado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Internos</label>
          <Select value={filters.include_internal} onValueChange={(value) => setFilters((prev) => ({ ...prev, include_internal: value }))}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Não" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">Ocultar equipe/teste</SelectItem>
              <SelectItem value="yes">Incluir equipe/teste</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Origem</label>
          <Select value={filters.utm_source} onValueChange={(value) => setFilters((prev) => ({ ...prev, utm_source: value, utm_campaign: "all" }))}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {userSourceOptions.map((source) => (
                <SelectItem key={source} value={source}>{source}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Campanha</label>
          <Select value={filters.utm_campaign} onValueChange={(value) => setFilters((prev) => ({ ...prev, utm_campaign: value }))}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {userCampaignOptions.map((campaign) => (
                <SelectItem key={campaign} value={campaign}>{campaign}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Equipe</label>
          <Select value={filters.is_team} onValueChange={(value) => setFilters((prev) => ({ ...prev, is_team: value }))}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="yes">Somente equipe</SelectItem>
              <SelectItem value="no">Sem equipe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Teste</label>
          <Select value={filters.is_test_user} onValueChange={(value) => setFilters((prev) => ({ ...prev, is_test_user: value }))}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="yes">Somente teste</SelectItem>
              <SelectItem value="no">Sem teste</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Bloqueio</label>
          <Select value={filters.is_blocked} onValueChange={(value) => setFilters((prev) => ({ ...prev, is_blocked: value }))}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="yes">Bloqueados</SelectItem>
              <SelectItem value="no">Não bloqueados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Base total"
          value={formatCompact(overview.total_users)}
          description="Usuários visíveis dentro do recorte atual, já respeitando filtros e exclusão de contas internas."
          icon={Users}
          tone="slate"
        />
        <MetricCard
          title="Novos usuários"
          value={formatCompact(overview.new_users_7d)}
          description="Cadastros novos no período escolhido, útil para comparar volume de aquisição com ativação real."
          icon={TrendingUp}
          tone="blue"
        />
        <MetricCard
          title="Ativados"
          value={formatCompact(overview.activated_users_7d)}
          description="Usuários que chegaram ao marco de ativação no período, já com comportamento inicial útil no produto."
          icon={Target}
          tone="yellow"
        />
        <MetricCard
          title="Decks concluídos"
          value={formatCompact(overview.decks_completed_7d)}
          description="Processamentos efetivamente concluídos na janela. Ajuda a separar intenção de uso de execução real."
          icon={CheckCircle2}
          tone="emerald"
        />
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-auto bg-muted/60 p-1">
          <TabsTrigger value="overview" className="px-4 py-2">Visão geral</TabsTrigger>
          <TabsTrigger value="campaigns" className="px-4 py-2">Campanhas</TabsTrigger>
          <TabsTrigger value="users" className="px-4 py-2">Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="border-border/70 bg-card/95 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/95">
              <CardHeader>
                <CardTitle className="text-xl">Funil de ativação</CardTitle>
                <CardDescription>
                  Coorte de usuários cadastrados nos últimos {filters.days} dias, com conversão por etapa até ativação.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground dark:border-zinc-800/80 dark:bg-zinc-950/40">
                  Coorte analisada: <span className="font-medium text-foreground">{funnel.cohort_users}</span> usuários
                </div>
                <div className="grid gap-3 lg:grid-cols-5">
                  {funnel.steps.length ? funnel.steps.map((step, index) => (
                    <div key={step.key} className="relative rounded-2xl border border-border/60 bg-background/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Etapa {index + 1}
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">{step.label}</p>
                      <p className="mt-3 text-3xl font-semibold text-foreground">{step.users}</p>
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <p>
                          Base inicial:{" "}
                          <span className="font-medium text-foreground">
                            {step.conversion_from_start === null ? "—" : `${step.conversion_from_start}%`}
                          </span>
                        </p>
                        <p>
                          Etapa anterior:{" "}
                          <span className="font-medium text-foreground">
                            {step.conversion_from_previous === null ? "—" : `${step.conversion_from_previous}%`}
                          </span>
                        </p>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-8 text-sm text-muted-foreground dark:border-zinc-800/80 dark:bg-zinc-950/40">
                      Sem dados suficientes para compor o funil neste recorte.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/95 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/95">
              <CardHeader>
                <CardTitle className="text-xl">Retenção básica</CardTitle>
                <CardDescription>
                  Sinais rápidos de retorno e consistência da base filtrada.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Ativos 1d", retention.active_users_1d, "Voltaram nas últimas 24h"],
                  ["Ativos 7d", retention.active_users_7d, "Voltaram na última semana"],
                  ["Ativos 30d", retention.active_users_30d, "Voltaram no último mês"],
                  ["Retorno 7d", `${retentionRate7d}%`, `${retention.returning_users_7d} usuários da base antiga`],
                  ["Retorno 30d", `${retentionRate30d}%`, `${retention.returning_users_30d} usuários da base antiga`],
                  ["Ativados retidos", retention.activation_retention_7d, "Ativados há 7d+ e ainda ativos"],
                ].map(([label, value, helper]) => (
                  <div key={label} className="rounded-2xl border border-border/60 bg-background/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                    <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-border/70 bg-card/95 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/95">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-xl">Resumo operacional</CardTitle>
                  <CardDescription>Indicadores principais de uso e ativação para o período selecionado.</CardDescription>
                </div>
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  ["Ativos", overview.active_users_7d, "Logaram no período"],
                  ["Com deck", overview.users_with_decks, "Criaram pelo menos um deck"],
                  ["Estudaram", overview.users_who_studied, "Fizeram estudo real"],
                  ["Quiz concluído", overview.users_who_completed_quiz, "Chegaram ao quiz"],
                  ["Decks criados", overview.decks_created_7d, "Novos decks no recorte"],
                  ["Taxa de ativação", `${activationRate}%`, "Ativados sobre base filtrada"],
                ].map(([label, value, helper]) => (
                  <div key={label} className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/40">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                    <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/95 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/95">
              <CardHeader>
                <CardTitle className="text-xl">Aquisição</CardTitle>
                <CardDescription>Leitura rápida das origens mais presentes e do volume sem atribuição.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Sem atribuição</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{acquisition.unattributed_users}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Usuários sem `utm_source` no recorte atual.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Top fontes</p>
                    <div className="space-y-2">
                      {acquisition.top_sources.length ? acquisition.top_sources.map((item) => (
                        <div key={item.source} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 dark:border-zinc-800/70 dark:bg-zinc-950/35">
                          <span className="text-sm font-medium text-foreground">{item.source}</span>
                          <Badge variant="outline" className="border-[#48cfea]/30 bg-[#48cfea]/10 text-[#0f5f6f] dark:border-[#48cfea]/25 dark:bg-[#48cfea]/14 dark:text-[#87ebfb]">
                            {item.users}
                          </Badge>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">Nenhuma origem atribuída neste filtro.</p>}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Top campanhas</p>
                    <div className="space-y-2">
                      {acquisition.top_campaigns.length ? acquisition.top_campaigns.map((item) => (
                        <div key={item.source} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 dark:border-zinc-800/70 dark:bg-zinc-950/35">
                          <span className="text-sm font-medium text-foreground">{item.source}</span>
                          <Badge variant="outline" className="border-[#facc15]/30 bg-[#facc15]/12 text-[#6a5600] dark:border-[#facc15]/25 dark:bg-[#facc15]/14 dark:text-[#ffe27c]">
                            {item.users}
                          </Badge>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">Nenhuma campanha atribuída neste filtro.</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="border-border/70 bg-card/95 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/95">
              <CardHeader>
                <CardTitle className="text-xl">Qualidade da aquisição</CardTitle>
                <CardDescription>
                  Volume atribuído comparado com ativação e consistência de uso no recorte atual.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Atribuídos", acquisitionPerformance.attributed_users, "Usuários com origem conhecida"],
                  ["Sem atribuição", acquisition.unattributed_users, "Entraram sem `utm_source`"],
                  [
                    "Melhor fonte",
                    acquisitionPerformance.top_sources[0]?.dimension || "—",
                    acquisitionPerformance.top_sources[0]
                      ? `${acquisitionPerformance.top_sources[0].activation_rate}% de ativação`
                      : "Sem dados suficientes",
                  ],
                  [
                    "Melhor campanha",
                    acquisitionPerformance.top_campaigns[0]?.dimension || "—",
                    acquisitionPerformance.top_campaigns[0]
                      ? `${acquisitionPerformance.top_campaigns[0].consistency_rate}% de consistência`
                      : "Sem dados suficientes",
                  ],
                ].map(([label, value, helper]) => (
                  <div key={label} className="rounded-2xl border border-border/60 bg-background/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                    <p className="mt-3 text-2xl font-semibold text-foreground break-words">{value}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/95 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/95">
              <CardHeader>
                <CardTitle className="text-xl">Como ler este módulo</CardTitle>
                <CardDescription>
                  O foco aqui não é só volume de cadastro, e sim qualidade da aquisição.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                  <p className="font-medium text-foreground">Ativação</p>
                  <p className="mt-1">Percentual da origem ou campanha que realmente alcançou o marco de ativação.</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                  <p className="font-medium text-foreground">Estudo</p>
                  <p className="mt-1">Mostra quantos usuários chegaram ao comportamento mínimo de uso real.</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                  <p className="font-medium text-foreground">Consistência</p>
                  <p className="mt-1">Conta usuários já ativados que continuam ativos nos últimos 7 dias.</p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <Card className="border-border/70 bg-card/95 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/95">
              <CardHeader>
                <CardTitle className="text-xl">Performance por origem</CardTitle>
                <CardDescription>
                  Comparativo entre volume e qualidade por `utm_source`.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {acquisitionPerformance.top_sources.length ? acquisitionPerformance.top_sources.map((row) => (
                  <div key={row.dimension} className="rounded-2xl border border-border/60 bg-background/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{row.dimension}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {row.users} usuários • {row.activated_users} ativados • {row.consistent_users} consistentes
                        </p>
                      </div>
                      <Badge variant="outline" className="border-[#48cfea]/30 bg-[#48cfea]/10 text-[#0f5f6f] dark:border-[#48cfea]/25 dark:bg-[#48cfea]/14 dark:text-[#87ebfb]">
                        {row.activation_rate}%
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl border border-border/50 bg-background/75 px-3 py-2 dark:border-zinc-800/70 dark:bg-zinc-950/35">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Ativação</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{row.activation_rate}%</p>
                      </div>
                      <div className="rounded-xl border border-border/50 bg-background/75 px-3 py-2 dark:border-zinc-800/70 dark:bg-zinc-950/35">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Estudo</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{row.study_rate}%</p>
                      </div>
                      <div className="rounded-xl border border-border/50 bg-background/75 px-3 py-2 dark:border-zinc-800/70 dark:bg-zinc-950/35">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Consistência</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{row.consistency_rate}%</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-8 text-sm text-muted-foreground dark:border-zinc-800/80 dark:bg-zinc-950/40">
                    Nenhuma origem atribuída neste recorte.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/95 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/95">
              <CardHeader>
                <CardTitle className="text-xl">Performance por campanha</CardTitle>
                <CardDescription>
                  Campanhas ordenadas por ativação e consistência, não só por volume.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {acquisitionPerformance.top_campaigns.length ? acquisitionPerformance.top_campaigns.map((row) => (
                  <div key={row.dimension} className="rounded-2xl border border-border/60 bg-background/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-medium text-foreground">{row.dimension}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {row.users} usuários • {row.studied_users} estudaram • {row.quiz_users} chegaram ao quiz
                        </p>
                      </div>
                      <Badge variant="outline" className="border-[#facc15]/30 bg-[#facc15]/12 text-[#6a5600] dark:border-[#facc15]/25 dark:bg-[#facc15]/14 dark:text-[#ffe27c]">
                        {row.consistency_rate}%
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl border border-border/50 bg-background/75 px-3 py-2 dark:border-zinc-800/70 dark:bg-zinc-950/35">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Ativação</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{row.activation_rate}%</p>
                      </div>
                      <div className="rounded-xl border border-border/50 bg-background/75 px-3 py-2 dark:border-zinc-800/70 dark:bg-zinc-950/35">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Estudo</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{row.study_rate}%</p>
                      </div>
                      <div className="rounded-xl border border-border/50 bg-background/75 px-3 py-2 dark:border-zinc-800/70 dark:bg-zinc-950/35">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Consistência</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{row.consistency_rate}%</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-8 text-sm text-muted-foreground dark:border-zinc-800/80 dark:bg-zinc-950/40">
                    Nenhuma campanha atribuída neste recorte.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card className="border-border/70 bg-card/95 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/95">
            <CardHeader className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle className="text-xl">Usuários e estágio de funil</CardTitle>
                  <CardDescription>
                    Base operacional com aquisição, milestones e sinais de uso. Agora com ordenação, paginação e exportação.
                  </CardDescription>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-xs uppercase tracking-[0.16em] text-muted-foreground dark:border-zinc-800/80 dark:bg-zinc-950/40">
                  {sortedUsers.length} registros filtrados de {users.length} carregados
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
                <div className="relative w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nome, email, origem ou campanha"
                    className="border-border/60 bg-background pl-9"
                  />
                </div>

                <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SORT_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as SortDirection)}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Direção" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Decrescente</SelectItem>
                    <SelectItem value="asc">Crescente</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Itens por página" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>{size} por página</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CopyPlus className="h-3.5 w-3.5" />
                  Busca local sobre a amostra carregada
                </div>
                <div className="flex items-center gap-2">
                  <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                  Ordenando por {SORT_LABELS[sortKey].toLowerCase()} em ordem {sortDirection === "asc" ? "crescente" : "decrescente"}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 dark:border-zinc-800/80">
                    <TableHead className="pl-3">
                      <button type="button" onClick={() => toggleSort("username")} className="inline-flex items-center gap-1.5">
                        Usuário
                        <ArrowDownWideNarrow className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" onClick={() => toggleSort("utm_source")} className="inline-flex items-center gap-1.5">
                        Origem
                        <ArrowDownWideNarrow className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" onClick={() => toggleSort("lifecycle_stage")} className="inline-flex items-center gap-1.5">
                        Estágio
                        <ArrowDownWideNarrow className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" onClick={() => toggleSort("flashcards_studied")} className="inline-flex items-center gap-1.5">
                        Métricas
                        <ArrowDownWideNarrow className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" onClick={() => toggleSort("activated_at")} className="inline-flex items-center gap-1.5">
                        Ativação
                        <ArrowDownWideNarrow className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </TableHead>
                    <TableHead>Ações</TableHead>
                    <TableHead className="pr-3">
                      <button type="button" onClick={() => toggleSort("last_login_at")} className="inline-flex items-center gap-1.5">
                        Último login
                        <ArrowDownWideNarrow className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((entry) => (
                    <TableRow key={entry.id} className="border-border/50 dark:border-zinc-800/70">
                      <TableCell className="pl-3">
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">{entry.username}</div>
                          <div className="text-xs text-muted-foreground">{entry.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-border/60 bg-background/80 dark:border-zinc-800/80 dark:bg-zinc-950/45">
                              {entry.provider}
                            </Badge>
                            {entry.utm_source ? (
                              <Badge variant="outline" className="border-[#48cfea]/30 bg-[#48cfea]/10 text-[#0f5f6f] dark:text-[#87ebfb]">
                                {entry.utm_source}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Sem UTM</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{entry.utm_campaign || "Sem campanha"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "border px-2.5 py-1",
                            entry.lifecycle_stage === "activated" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                            entry.lifecycle_stage === "created_deck" && "border-[#facc15]/30 bg-[#facc15]/12 text-[#6a5600] dark:text-[#ffe27c]",
                            entry.lifecycle_stage === "registered" && "border-border/60 bg-background/80 dark:border-zinc-800/80 dark:bg-zinc-950/45",
                          )}
                        >
                          {getLifecycleLabel(entry.lifecycle_stage)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm text-foreground">
                          <div>{entry.total_decks} decks</div>
                          <div className="text-muted-foreground">{entry.flashcards_studied} estudos • {entry.quizzes_completed} quizzes</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <CircleDot className="h-3 w-3 text-[#48cfea]" />
                            <span>Deck: {formatDateTime(entry.first_deck_created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity className="h-3 w-3 text-[#facc15]" />
                            <span>Estudo: {formatDateTime(entry.first_study_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-3 w-3 text-emerald-500" />
                            <span>Ativado: {formatDateTime(entry.activated_at)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openUserSheet(entry.id)}
                          className="gap-2"
                        >
                          Ver detalhe
                        </Button>
                      </TableCell>
                      <TableCell className="pr-3 text-sm text-muted-foreground">
                        {formatDateTime(entry.last_login_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!paginatedUsers.length ? (
                    <TableRow className="border-border/50 dark:border-zinc-800/70">
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        Nenhum usuário encontrado para os filtros e busca atuais.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-950/40 lg:flex-row lg:items-center lg:justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando{" "}
                  <span className="font-medium text-foreground">
                    {sortedUsers.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, sortedUsers.length)}
                  </span>{" "}
                  de <span className="font-medium text-foreground">{sortedUsers.length}</span> usuários filtrados.
                </div>

                <div className="flex items-center gap-2 self-end lg:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Anterior
                  </Button>
                  <div className="rounded-lg border border-border/60 px-3 py-1.5 text-sm text-foreground dark:border-zinc-800/80">
                    Página {currentPage} de {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="gap-2"
                  >
                    Próxima
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isPdfDialogOpen} onOpenChange={setIsPdfDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Exportar relatório em PDF</DialogTitle>
            <DialogDescription>
              Escolha um preset pronto ou personalize os blocos do relatório. Suas preferências ficam salvas neste navegador para a próxima exportação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Presets de relatório</p>
                  <p className="text-sm text-muted-foreground">Aplicam combinações prontas para diferentes usos da equipe.</p>
                </div>
                <Badge variant="outline" className="border-border/60 bg-background/80 dark:border-zinc-800/80 dark:bg-zinc-950/45">
                  {reportPreset === "custom" ? "Personalizado" : REPORT_PRESETS[reportPreset].label}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {(Object.entries(REPORT_PRESETS) as Array<
                  [Exclude<ReportPresetId, "custom">, (typeof REPORT_PRESETS)[Exclude<ReportPresetId, "custom">]]
                >).map(([presetId, preset]) => (
                  <button
                    key={presetId}
                    type="button"
                    onClick={() => applyReportPreset(presetId)}
                    className={cn(
                      "rounded-2xl border px-4 py-4 text-left transition-colors",
                      reportPreset === presetId
                        ? "border-[#48cfea]/40 bg-[#48cfea]/10"
                        : "border-border/60 bg-background/70 hover:bg-background dark:border-zinc-800/80 dark:bg-zinc-950/40"
                    )}
                  >
                    <p className="font-medium text-foreground">{preset.label}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/40">
              <Checkbox
                checked={pdfOptions.includeFilters}
                onCheckedChange={(checked) => updatePdfOption("includeFilters", Boolean(checked))}
              />
              <div className="space-y-1">
                <Label className="font-medium text-foreground">Filtros aplicados</Label>
                <p className="text-sm text-muted-foreground">Inclui o contexto do recorte usado no relatório.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/40">
              <Checkbox
                checked={pdfOptions.includeOverview}
                onCheckedChange={(checked) => updatePdfOption("includeOverview", Boolean(checked))}
              />
              <div className="space-y-1">
                <Label className="font-medium text-foreground">Resumo operacional</Label>
                <p className="text-sm text-muted-foreground">Inclui os principais KPIs de ativação, uso e volume.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/40">
              <Checkbox
                checked={pdfOptions.includeAcquisition}
                onCheckedChange={(checked) => updatePdfOption("includeAcquisition", Boolean(checked))}
              />
              <div className="space-y-1">
                <Label className="font-medium text-foreground">Aquisição</Label>
                <p className="text-sm text-muted-foreground">Adiciona top fontes, campanhas e volume sem atribuição.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/40">
              <Checkbox
                checked={pdfOptions.includeUsers}
                onCheckedChange={(checked) => updatePdfOption("includeUsers", Boolean(checked))}
              />
              <div className="space-y-1">
                <Label className="font-medium text-foreground">Tabela de usuários</Label>
                <p className="text-sm text-muted-foreground">Leva a base filtrada para o relatório detalhado.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/40">
              <Checkbox
                checked={pdfOptions.includeMilestones}
                onCheckedChange={(checked) => updatePdfOption("includeMilestones", Boolean(checked))}
                disabled={!pdfOptions.includeUsers}
              />
              <div className="space-y-1">
                <Label className="font-medium text-foreground">Milestones do funil</Label>
                <p className="text-sm text-muted-foreground">Mostra deck, estudo, quiz e data de ativação por usuário.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/40">
              <Checkbox
                checked={pdfOptions.includeMetrics}
                onCheckedChange={(checked) => updatePdfOption("includeMetrics", Boolean(checked))}
                disabled={!pdfOptions.includeUsers}
              />
              <div className="space-y-1">
                <Label className="font-medium text-foreground">Métricas de uso</Label>
                <p className="text-sm text-muted-foreground">Inclui decks, estudos e quizzes da base exportada.</p>
              </div>
            </label>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground dark:border-zinc-800/80 dark:bg-zinc-950/40">
              <span className="font-medium text-foreground">Preset atual:</span>{" "}
              {reportPreset === "custom"
                ? "Personalizado pela equipe neste navegador."
                : `${REPORT_PRESETS[reportPreset].label} salvo como padrão local.`}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPdfDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={exportPdf} disabled={isExportingPdf}>
              {isExportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Gerar relatório
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={isUserSheetOpen}
        onOpenChange={(open) => {
          setIsUserSheetOpen(open);
          if (!open) {
            setSelectedUserId(null);
            setSelectedUserDetail(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto border-l border-border/70 bg-background dark:border-zinc-800/80 sm:max-w-2xl">
          <SheetHeader className="space-y-2 border-b border-border/60 pb-5 dark:border-zinc-800/80">
            <SheetTitle className="text-xl">Detalhe do usuário</SheetTitle>
            <SheetDescription>
              Contexto operacional, aquisição, milestones e controles administrativos da conta selecionada.
            </SheetDescription>
          </SheetHeader>

          {isUserDetailLoading || !selectedUserDetail ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/90 px-5 py-4 shadow-sm">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Carregando detalhe do usuário...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-5 p-4">
              <div className="rounded-3xl border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.82))] p-5 shadow-sm dark:border-zinc-800/80 dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(24,24,27,0.92))]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">{selectedUserDetail.username}</h3>
                      <p className="text-sm text-muted-foreground">{selectedUserDetail.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-border/60 bg-background/80 dark:border-zinc-800/80 dark:bg-zinc-950/45">
                        {selectedUserDetail.provider}
                      </Badge>
                      <Badge variant="outline" className="border-[#48cfea]/30 bg-[#48cfea]/10 text-[#0f5f6f] dark:text-[#87ebfb]">
                        {getLifecycleLabel(selectedUserDetail.lifecycle_stage)}
                      </Badge>
                      {selectedUserDetail.is_team ? (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          Equipe interna
                        </Badge>
                      ) : null}
                      {selectedUserDetail.is_test_user ? (
                        <Badge variant="outline" className="border-[#facc15]/30 bg-[#facc15]/12 text-[#6a5600] dark:text-[#ffe27c]">
                          Conta de teste
                        </Badge>
                      ) : null}
                      {selectedUserDetail.is_blocked ? (
                        <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
                          Bloqueado
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-3 text-center dark:border-zinc-800/80 dark:bg-zinc-950/40">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Decks</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">{selectedUserDetail.total_decks}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-3 text-center dark:border-zinc-800/80 dark:bg-zinc-950/40">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Estudos</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">{selectedUserDetail.flashcards_studied}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-3 text-center dark:border-zinc-800/80 dark:bg-zinc-950/40">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Quizzes</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">{selectedUserDetail.quizzes_completed}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="border-border/70 bg-card/95 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/95">
                  <CardHeader>
                    <CardTitle className="text-base">Aquisição e contexto</CardTitle>
                    <CardDescription>Primeiro toque e sinais de origem dessa conta.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {[
                      ["Origem", selectedUserDetail.utm_source || "Sem origem"],
                      ["Campanha", selectedUserDetail.utm_campaign || "Sem campanha"],
                      ["Medium", selectedUserDetail.utm_medium || "Sem medium"],
                      ["Term", selectedUserDetail.utm_term || "Sem term"],
                      ["Primeiro toque", formatDateTime(selectedUserDetail.first_touch_at)],
                      ["Landing page", selectedUserDetail.landing_page || "Sem landing page"],
                      ["Referrer", selectedUserDetail.referrer || "Sem referrer"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                        <p className="mt-2 break-all text-foreground">{value}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/95 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/95">
                  <CardHeader>
                    <CardTitle className="text-base">Milestones do funil</CardTitle>
                    <CardDescription>Marcos de ativação e evolução no produto.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      ["Cadastro", formatDateTime(selectedUserDetail.created_at)],
                      ["Primeiro login", formatDateTime(selectedUserDetail.first_login_at)],
                      ["Primeiro deck", formatDateTime(selectedUserDetail.first_deck_created_at)],
                      ["Primeiro estudo", formatDateTime(selectedUserDetail.first_study_at)],
                      ["Primeiro quiz", formatDateTime(selectedUserDetail.first_quiz_at)],
                      ["Ativação", formatDateTime(selectedUserDetail.activated_at)],
                      ["Último login", formatDateTime(selectedUserDetail.last_login_at)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <span className="text-sm font-medium text-foreground">{value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/70 bg-card/95 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/95">
                <CardHeader>
                  <CardTitle className="text-base">Controles administrativos</CardTitle>
                  <CardDescription>Flags internas para operação, marketing e suporte.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-4 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                    <div>
                      <p className="font-medium text-foreground">Equipe interna</p>
                      <p className="text-sm text-muted-foreground">Permite acesso aos módulos internos do admin.</p>
                    </div>
                    <Switch
                      checked={Boolean(userAdminDraft.is_team)}
                      onCheckedChange={(checked) => setUserAdminDraft((prev) => ({ ...prev, is_team: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-4 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                    <div>
                      <p className="font-medium text-foreground">Conta de teste</p>
                      <p className="text-sm text-muted-foreground">Exclui a conta das leituras padrão quando internos ficam ocultos.</p>
                    </div>
                    <Switch
                      checked={Boolean(userAdminDraft.is_test_user)}
                      onCheckedChange={(checked) => setUserAdminDraft((prev) => ({ ...prev, is_test_user: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-4 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                    <div>
                      <p className="font-medium text-foreground">Bloquear conta</p>
                      <p className="text-sm text-muted-foreground">Impede acesso quando houver necessidade operacional.</p>
                    </div>
                    <Switch
                      checked={Boolean(userAdminDraft.is_blocked)}
                      onCheckedChange={(checked) => setUserAdminDraft((prev) => ({ ...prev, is_blocked: checked }))}
                    />
                  </div>
                  {invalidSelfAdminChange ? (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      Você não pode remover seu próprio acesso de equipe nem bloquear sua própria conta.
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="border-border/70 bg-card/95 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/95">
                  <CardHeader>
                    <CardTitle className="text-base">Notas internas</CardTitle>
                    <CardDescription>Contexto manual para marketing, suporte e operação.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <Textarea
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        placeholder="Adicionar observação interna sobre este usuário..."
                        className="min-h-24 border-border/60 bg-background dark:border-zinc-800/80"
                      />
                      <div className="flex justify-end">
                        <Button onClick={saveAdminNote} disabled={isSavingNote || !noteDraft.trim()}>
                          {isSavingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Salvar nota
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {selectedUserDetail.admin_notes.length ? selectedUserDetail.admin_notes.map((note) => (
                        <div key={note.id} className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {note.author_username || note.author_email || `Usuário #${note.author_user_id}`}
                              </p>
                              <p className="mt-1 break-words text-sm text-foreground/90">{note.note}</p>
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(note.created_at)}</span>
                          </div>
                        </div>
                      )) : (
                        <p className="text-sm text-muted-foreground">Nenhuma nota interna registrada ainda.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/95 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/95">
                  <CardHeader>
                    <CardTitle className="text-base">Histórico administrativo</CardTitle>
                    <CardDescription>Mudanças feitas pela equipe nessa conta.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedUserDetail.admin_history.length ? selectedUserDetail.admin_history.map((event, index) => (
                      <div key={`${event.event_name}-${event.occurred_at}-${index}`} className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <Badge
                              variant="outline"
                              className="block w-fit max-w-full whitespace-normal break-words border-border/60 bg-background/80 px-2.5 py-1 text-left leading-relaxed text-foreground dark:border-zinc-800/80 dark:bg-zinc-950/45"
                            >
                              {event.event_name}
                            </Badge>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {event.actor_email || (event.actor_user_id ? `Usuário #${event.actor_user_id}` : "Equipe interna")}
                            </p>
                          </div>
                          <span className="shrink-0 text-right text-xs text-muted-foreground">{formatDateTime(event.occurred_at)}</span>
                        </div>
                        {event.summary ? (
                          <p className="mt-2 break-words text-xs text-muted-foreground">{event.summary}</p>
                        ) : null}
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground">Nenhuma ação administrativa registrada ainda.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="border-border/70 bg-card/95 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/95">
                  <CardHeader>
                    <CardTitle className="text-base">Documentos recentes</CardTitle>
                    <CardDescription>Últimos decks e processamento dessa conta.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedUserDetail.recent_documents.length ? selectedUserDetail.recent_documents.map((document) => (
                      <div key={document.id} className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{document.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {formatDateTime(document.created_at)} • {document.total_flashcards} flashcards
                            </p>
                          </div>
                          <Badge variant="outline" className="border-border/60 bg-background/80 dark:border-zinc-800/80 dark:bg-zinc-950/45">
                            {document.status}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {document.has_quiz ? "Possui quiz gerado" : "Sem quiz gerado"}
                        </p>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground">Nenhum documento encontrado para este usuário.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/95 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/95">
                  <CardHeader>
                    <CardTitle className="text-base">Eventos recentes</CardTitle>
                    <CardDescription>Últimos sinais gravados pelo tracking do produto.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedUserDetail.recent_events.length ? selectedUserDetail.recent_events.map((event, index) => (
                      <div key={`${event.event_name}-${event.occurred_at}-${index}`} className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <Badge
                              variant="outline"
                              className="block w-fit max-w-full whitespace-normal break-words border-border/60 bg-background/80 px-2.5 py-1 text-left leading-relaxed text-foreground dark:border-zinc-800/80 dark:bg-zinc-950/45"
                            >
                              {event.event_name}
                            </Badge>
                          </div>
                          <span className="shrink-0 text-right text-xs text-muted-foreground">{formatDateTime(event.occurred_at)}</span>
                        </div>
                        <p className="mt-2 break-words text-xs text-muted-foreground">
                          {event.document_id ? `Documento #${event.document_id}` : "Sem documento"} • {event.quiz_id ? `Quiz #${event.quiz_id}` : "Sem quiz"}
                        </p>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground">Nenhum evento recente para este usuário.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <SheetFooter className="border-t border-border/60 bg-background/95 dark:border-zinc-800/80">
            <Button variant="outline" onClick={() => setIsUserSheetOpen(false)}>
              Fechar
            </Button>
            <Button onClick={saveAdminFlags} disabled={isUserDetailLoading || isSavingUserAdmin || invalidSelfAdminChange || !selectedUserDetail}>
              {isSavingUserAdmin ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar alterações
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
