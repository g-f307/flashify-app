"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CircleDot,
  CopyPlus,
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
  AcquisitionSummary,
  AnalyticsFilters,
  AnalyticsOverview,
  AnalyticsUserRow,
  apiClient,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FilterState = {
  days: string;
  provider: string;
  lifecycle_stage: string;
  include_internal: string;
  utm_source: string;
  utm_campaign: string;
};

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

const LIFECYCLE_LABELS: Record<string, string> = {
  registered: "Registrado",
  created_deck: "Criou deck",
  studied: "Estudou",
  quiz_completed: "Quiz concluído",
  activated: "Ativado",
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

const formatCompact = (value: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);

const buildFilters = (filters: FilterState): AnalyticsFilters => ({
  days: Number(filters.days),
  provider: filters.provider === "all" ? undefined : (filters.provider as "local" | "google"),
  lifecycle_stage: filters.lifecycle_stage === "all" ? undefined : filters.lifecycle_stage,
  include_internal: filters.include_internal === "yes",
  utm_source: filters.utm_source === "all" ? undefined : filters.utm_source,
  utm_campaign: filters.utm_campaign === "all" ? undefined : filters.utm_campaign,
});

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
  });
  const [overview, setOverview] = useState<AnalyticsOverview>(DEFAULT_OVERVIEW);
  const [acquisition, setAcquisition] = useState<AcquisitionSummary>(DEFAULT_ACQUISITION);
  const [users, setUsers] = useState<AnalyticsUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

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
      apiClient.getAnalyticsUsers({ ...apiFilters, limit: 50 }),
    ])
      .then(([overviewResponse, acquisitionResponse, usersResponse]) => {
        if (cancelled) return;
        setOverview(overviewResponse);
        setAcquisition(acquisitionResponse);
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

  const activationRate = overview.total_users > 0
    ? Math.round((overview.activated_users_7d / overview.total_users) * 100)
    : 0;

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

      <section className="grid gap-3 rounded-3xl border border-border/60 bg-card/70 p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/70 lg:grid-cols-6">
        <div className="flex items-center justify-between gap-2 px-2 pb-2 lg:col-span-6">
          <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Filtros estratégicos</p>
          </div>
          <div className="flex items-center gap-2">
            {filters.include_internal === "no" ? (
              <Badge variant="outline" className="border-[#facc15]/30 bg-[#facc15]/12 text-[#6a5600] dark:text-[#ffe27c]">
                Contas internas ocultas
              </Badge>
            ) : null}
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
          <TabsTrigger value="users" className="px-4 py-2">Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
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

        <TabsContent value="users" className="space-y-4">
      <Card className="border-border/70 bg-card/95 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/95">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-xl">Usuários e estágio de funil</CardTitle>
            <CardDescription>
              Amostra operacional dos usuários mais recentes com aquisição, milestones e sinais de uso.
            </CardDescription>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-xs uppercase tracking-[0.16em] text-muted-foreground dark:border-zinc-800/80 dark:bg-zinc-950/40">
            {filteredUsers.length} registros no recorte atual
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, email, origem ou campanha"
                className="border-border/60 bg-background pl-9"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CopyPlus className="h-3.5 w-3.5" />
              Busca local sobre a amostra carregada
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 dark:border-zinc-800/80">
                <TableHead className="pl-3">Usuário</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Estágio</TableHead>
                <TableHead>Métricas</TableHead>
                <TableHead>Ativação</TableHead>
                <TableHead className="pr-3">Último login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((entry) => (
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
                      {LIFECYCLE_LABELS[entry.lifecycle_stage || "registered"] || entry.lifecycle_stage || "Registrado"}
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
                  <TableCell className="pr-3 text-sm text-muted-foreground">
                    {formatDateTime(entry.last_login_at)}
                  </TableCell>
                </TableRow>
              ))}
              {!filteredUsers.length ? (
                <TableRow className="border-border/50 dark:border-zinc-800/70">
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado para os filtros e busca atuais.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
