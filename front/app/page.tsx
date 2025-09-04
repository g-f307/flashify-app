"use client"

import { useState, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { LoginForm } from "@/components/auth/login-form"
import { FileUpload } from "@/components/upload/file-upload"
import { TextInput } from "@/components/upload/text-input"
import { DocumentList } from "@/components/documents/document-list"
import { FlashcardStudy } from "@/components/study/flashcard-study"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Upload,
  ImageIcon,
  FileText,
  Brain,
  Play,
  RotateCcw,
  Check,
  X,
  Plus,
  Settings,
  User,
  Home,
  Library,
  TrendingUp,
  Menu,
} from "lucide-react"

export default function FlashifyApp() {
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState("home")
  const [currentCard, setCurrentCard] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isFlipping, setIsFlipping] = useState(false)
  const [studyProgress, setStudyProgress] = useState(65)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [studyingDocument, setStudyingDocument] = useState<any>(null)

  const flipAudioRef = useRef<HTMLAudioElement | null>(null)

  // Show loading spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <p>Carregando...</p>
        </div>
      </div>
    )
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-full max-w-md p-4">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Flashify</h1>
            <p className="text-muted-foreground">Acelere seu aprendizado</p>
          </div>
          <LoginForm />
        </div>
      </div>
    )
  }

  // Sample flashcards data
  const flashcards = [
    {
      id: 1,
      question: "O que é fotossíntese?",
      answer: "Processo pelo qual as plantas convertem luz solar, água e dióxido de carbono em glicose e oxigênio.",
      difficulty: "Fácil",
      subject: "Biologia",
    },
    {
      id: 2,
      question: "Qual é a fórmula da Lei de Ohm?",
      answer: "V = I × R, onde V é voltagem, I é corrente e R é resistência.",
      difficulty: "Médio",
      subject: "Física",
    },
  ]

  const sidebarItems = [
    { id: "home", label: "Início", icon: Home },
    { id: "library", label: "Biblioteca", icon: Library },
    { id: "create", label: "Criar", icon: Plus },
    { id: "progress", label: "Progresso", icon: TrendingUp },
    { id: "settings", label: "Configurações", icon: Settings },
  ]

  const handleCardFlip = () => {
    if (flipAudioRef.current) {
      flipAudioRef.current.currentTime = 0
      flipAudioRef.current.play().catch(() => {
        // Ignora erro se o usuário não interagiu ainda com a página
      })
    }

    setIsFlipping(true)
    setTimeout(() => {
      setShowAnswer(!showAnswer)
      setIsFlipping(false)
    }, 300) // Aumentado para 300ms (metade da duração da animação de 600ms)
  }

  const handleNextCard = () => {
    setCurrentCard((prev) => (prev + 1) % flashcards.length)
    setShowAnswer(false)
    setIsFlipping(false)
  }

  const handlePrevCard = () => {
    setCurrentCard((prev) => (prev - 1 + flashcards.length) % flashcards.length)
    setShowAnswer(false)
    setIsFlipping(false)
  }

  return (
    <div className="flex h-screen bg-background">
      <audio ref={flipAudioRef} preload="auto">
        <source src="/card-flip.mp3" type="audio/mpeg" />
        <source src="/card-flip.wav" type="audio/wav" />
      </audio>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div
        className={`
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 
        w-64 bg-sidebar border-r border-sidebar-border flex flex-col 
        transition-transform duration-300 ease-in-out lg:transition-none
      `}
      >
        {/* Logo */}
        <div className="p-4 lg:p-6 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-sidebar-foreground">Flashify</h1>
            </div>
            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setActiveTab(item.id)
                      setSidebarOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === item.id
                        ? "bg-lime-accent text-lime-accent-foreground dark:bg-primary dark:text-primary-foreground"
                        : "text-sidebar-foreground hover:bg-lime-accent/20 hover:text-lime-accent-foreground dark:hover:bg-primary/20 dark:hover:text-primary-foreground"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        activeTab === item.id
                          ? "text-lime-accent-foreground dark:text-primary-foreground"
                          : "text-sidebar-foreground dark:text-primary hover:text-lime-accent-foreground dark:hover:text-primary-foreground"
                      }`}
                    />
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.username || 'Usuário'}
              </p>
              <button 
                onClick={logout}
                className="text-xs text-muted-foreground hover:text-red-600 transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-background">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-accent rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center mx-auto">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Flashify</span>
          </div>
          {/* Theme Toggle */}
          <ThemeToggle />
        </div>

        {activeTab === "home" && (
          <div className="flex-1 p-4 lg:p-8 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8">
              {/* Header */}
              <div className="text-center space-y-3 lg:space-y-4">
                <h2 className="text-2xl lg:text-3xl font-bold text-foreground">Bem-vindo ao Flashify</h2>
                <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
                  Transforme qualquer conteúdo em flashcards inteligentes e acelere seu aprendizado
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow group border-card-border hover:border-lime-accent/50 dark:hover:border-primary/50"
                  onClick={() => setActiveTab("create")}
                >
                  <CardHeader className="text-center p-4 lg:p-6">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 dark:bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-lime-accent/30 dark:group-hover:bg-primary/20 transition-colors bg-primary">
                      <Upload className="w-5 h-5 lg:w-6 lg:h-6 text-black dark:text-primary" />
                    </div>
                    <CardTitle className="text-base lg:text-lg">Upload PDF</CardTitle>
                    <CardDescription className="text-sm">
                      Envie um arquivo PDF e gere flashcards automaticamente
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow group border-card-border hover:border-lime-accent/50 dark:hover:border-primary/50"
                  onClick={() => setActiveTab("create")}
                >
                  <CardHeader className="text-center p-4 lg:p-6">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 dark:bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-lime-accent/30 dark:group-hover:bg-primary/20 transition-colors bg-primary">
                      <ImageIcon className="w-5 h-5 lg:w-6 lg:h-6 text-black dark:text-primary" />
                    </div>
                    <CardTitle className="text-base lg:text-lg">Upload Imagem</CardTitle>
                    <CardDescription className="text-sm">Extraia texto de imagens e crie flashcards</CardDescription>
                  </CardHeader>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow sm:col-span-2 lg:col-span-1 group border-card-border hover:border-lime-accent/50 dark:hover:border-primary/50"
                  onClick={() => setActiveTab("create")}
                >
                  <CardHeader className="text-center p-4 lg:p-6">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 dark:bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-lime-accent/30 dark:group-hover:bg-primary/20 transition-colors bg-primary">
                      <FileText className="w-5 h-5 lg:w-6 lg:h-6 text-black dark:text-primary" />
                    </div>
                    <CardTitle className="text-base lg:text-lg">Texto Livre</CardTitle>
                    <CardDescription className="text-sm">Digite ou cole texto para gerar flashcards</CardDescription>
                  </CardHeader>
                </Card>
              </div>

              {/* Recent Study Sets */}
              <div className="space-y-4">
                <h3 className="text-lg lg:text-xl font-semibold text-foreground">Conjuntos Recentes</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                  <Card className="border-card-border hover:border-lime-accent/50 dark:hover:border-primary/50 hover:shadow-lg transition-all">
                    <CardHeader className="p-4 lg:p-6">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm lg:text-base">Biologia - Fotossíntese</CardTitle>
                        <Badge
                          variant="default"
                          className="text-xs text-black dark:bg-primary dark:text-primary-foreground border-lime-accent/30 dark:border-primary/30 bg-lime-accent"
                        >
                          12 cards
                        </Badge>
                      </div>
                      <CardDescription className="text-xs lg:text-sm">Criado há 2 dias</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 lg:p-6 pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs lg:text-sm text-muted-foreground">Progresso: 75%</span>
                        <Button
                          size="sm"
                          onClick={() => setActiveTab("study")}
                          className="bg-lime-accent hover:bg-lime-accent/90 text-black dark:bg-primary dark:hover:bg-primary/90 dark:text-primary-foreground border border-lime-accent/30 dark:border-primary/30 shadow-sm hover:shadow-md transition-all"
                        >
                          <Play className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                          <span className="hidden sm:inline">Estudar</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-card-border hover:border-lime-accent/50 dark:hover:border-primary/50 hover:shadow-lg transition-all">
                    <CardHeader className="p-4 lg:p-6">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm lg:text-base">Física - Eletricidade</CardTitle>
                        <Badge
                          variant="default"
                          className="text-xs text-black dark:bg-primary dark:text-primary-foreground border-lime-accent/30 dark:border-primary/30 bg-lime-accent"
                        >
                          8 cards
                        </Badge>
                      </div>
                      <CardDescription className="text-xs lg:text-sm">Criado há 1 semana</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 lg:p-6 pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs lg:text-sm text-muted-foreground">Progresso: 45%</span>
                        <Button
                          size="sm"
                          onClick={() => setActiveTab("study")}
                          className="bg-lime-accent hover:bg-lime-accent/90 text-black dark:bg-primary dark:hover:bg-primary/90 dark:text-primary-foreground border border-lime-accent/30 dark:border-primary/30"
                        >
                          <Play className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                          <span className="hidden sm:inline">Estudar</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "create" && (
          <div className="flex-1 p-4 lg:p-8 overflow-auto">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl lg:text-2xl font-bold text-foreground">Criar Flashcards</h2>
                <p className="text-sm lg:text-base text-muted-foreground">
                  Escolha como você quer criar seus flashcards
                </p>
              </div>

              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-card border border-card-border">
                  <TabsTrigger
                    value="text"
                    className="text-xs lg:text-sm data-[state=active]:bg-lime-accent data-[state=active]:text-lime-accent-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
                  >
                    Texto
                  </TabsTrigger>
                  <TabsTrigger
                    value="pdf"
                    className="text-xs lg:text-sm data-[state=active]:bg-lime-accent data-[state=active]:text-lime-accent-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
                  >
                    PDF
                  </TabsTrigger>
                  <TabsTrigger
                    value="image"
                    className="text-xs lg:text-sm data-[state=active]:bg-lime-accent data-[state=active]:text-lime-accent-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
                  >
                    Imagem
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4">
                  <TextInput onSuccess={() => setActiveTab("library")} />
                </TabsContent>

                <TabsContent value="pdf" className="space-y-4">
                  <FileUpload onSuccess={() => setActiveTab("library")} />
                </TabsContent>

                <TabsContent value="image" className="space-y-4">
                  <FileUpload onSuccess={() => setActiveTab("library")} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        {activeTab === "study" && (
          <div className="flex-1 p-4 lg:p-8 overflow-auto">
            {studyingDocument ? (
              <FlashcardStudy 
                documentId={studyingDocument.id}
                onBack={() => setStudyingDocument(null)}
              />
            ) : (
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-xl lg:text-2xl font-bold text-foreground">Modo Estudo</h2>
                  <p className="text-sm lg:text-base text-muted-foreground">
                    Selecione um conjunto de flashcards para começar a estudar
                  </p>
                </div>
                <DocumentList 
                  onStudyDocument={(doc) => setStudyingDocument(doc)}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "library" && (
          <div className="flex-1 p-4 lg:p-8 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-xl lg:text-2xl font-bold text-foreground">Minha Biblioteca</h2>
                <Button
                  onClick={() => setActiveTab("create")}
                  size="sm"
                  className="bg-lime-accent hover:bg-lime-accent/90 text-lime-accent-foreground dark:bg-primary dark:hover:bg-primary/90 dark:text-primary-foreground border border-lime-accent/30 dark:border-primary/30"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Conjunto
                </Button>
              </div>

              <DocumentList 
                onStudyDocument={(doc) => {
                  setStudyingDocument(doc)
                  setActiveTab("study")
                }}
              />
            </div>
          </div>
        )}

        {activeTab === "progress" && (
          <div className="flex-1 p-4 lg:p-8 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-xl lg:text-2xl font-bold text-foreground">Seu Progresso</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                <Card className="border-card-border hover:border-lime-accent/50 dark:hover:border-primary/50 hover:shadow-lg transition-all">
                  <CardHeader className="p-4 lg:p-6">
                    <CardTitle className="text-sm lg:text-base">Cards Estudados</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 lg:p-6 pt-0">
                    <div className="text-2xl lg:text-3xl font-bold text-lime-accent dark:text-primary">247</div>
                    <p className="text-xs lg:text-sm text-muted-foreground">Esta semana</p>
                  </CardContent>
                </Card>

                <Card className="border-card-border hover:border-lime-accent/50 dark:hover:border-primary/50 hover:shadow-lg transition-all">
                  <CardHeader className="p-4 lg:p-6">
                    <CardTitle className="text-sm lg:text-base">Sequência</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 lg:p-6 pt-0">
                    <div className="text-2xl lg:text-3xl font-bold text-lime-accent dark:text-primary">12</div>
                    <p className="text-xs lg:text-sm text-muted-foreground">Dias consecutivos</p>
                  </CardContent>
                </Card>

                <Card className="sm:col-span-2 lg:col-span-1 border-card-border hover:border-lime-accent/50 dark:hover:border-primary/50 hover:shadow-lg transition-all">
                  <CardHeader className="p-4 lg:p-6">
                    <CardTitle className="text-sm lg:text-base">Precisão</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 lg:p-6 pt-0">
                    <div className="text-2xl lg:text-3xl font-bold text-lime-accent dark:text-primary">87%</div>
                    <p className="text-xs lg:text-sm text-muted-foreground">Média geral</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-card-border">
                <CardHeader className="p-4 lg:p-6">
                  <CardTitle className="text-base lg:text-lg">Atividade Semanal</CardTitle>
                </CardHeader>
                <CardContent className="p-4 lg:p-6 pt-0">
                  <div className="h-48 lg:h-64 flex items-center justify-center text-muted-foreground text-sm lg:text-base border border-lime-accent/20 dark:border-primary/20 rounded-lg bg-lime-accent/5 dark:bg-primary/5">
                    Gráfico de atividade semanal
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="flex-1 p-4 lg:p-8 overflow-auto">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-xl lg:text-2xl font-bold text-foreground">Configurações</h2>

              <Card className="border-card-border">
                <CardHeader className="p-4 lg:p-6">
                  <CardTitle className="text-base lg:text-lg">Conta</CardTitle>
                  <CardDescription className="text-sm">Gerencie suas informações de conta</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 lg:p-6 pt-0">
                  <Button className="w-full bg-lime-accent hover:bg-lime-accent/90 text-black dark:bg-primary dark:hover:bg-primary/90 dark:text-primary-foreground border border-lime-accent/30 dark:border-primary/30 shadow-sm hover:shadow-md transition-all">
                    Fazer Login com Google
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-card-border">
                <CardHeader className="p-4 lg:p-6">
                  <CardTitle className="text-base lg:text-lg">Preferências de Estudo</CardTitle>
                  <CardDescription className="text-sm">Personalize sua experiência de aprendizado</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 lg:p-6 pt-0">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Cards por sessão</Label>
                    <Input
                      type="number"
                      defaultValue="20"
                      className="w-full p-2 border border-input rounded-md bg-background text-sm lg:text-base focus:border-lime-accent dark:focus:border-primary focus:ring-lime-accent/20 dark:focus:ring-primary/20 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Dificuldade padrão</Label>
                    <select className="w-full p-2 border border-input rounded-md bg-background text-sm lg:text-base focus:border-lime-accent dark:focus:border-primary focus:ring-lime-accent/20 dark:focus:ring-primary/20 focus:outline-none">
                      <option>Fácil</option>
                      <option>Médio</option>
                      <option>Difícil</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
