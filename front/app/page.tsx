"use client"

import { useState, useRef } from "react"
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
  const [activeTab, setActiveTab] = useState("home")
  const [currentCard, setCurrentCard] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isFlipping, setIsFlipping] = useState(false)
  const [studyProgress, setStudyProgress] = useState(65)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const flipAudioRef = useRef<HTMLAudioElement | null>(null)

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
              <p className="text-sm font-medium text-sidebar-foreground truncate">Usuário</p>
              <p className="text-xs text-muted-foreground">Fazer login</p>
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
                  <Card className="border-card-border">
                    <CardHeader className="p-4 lg:p-6">
                      <CardTitle className="text-base lg:text-lg">Inserir Texto</CardTitle>
                      <CardDescription className="text-sm">
                        Cole ou digite o conteúdo que você quer transformar em flashcards
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 lg:p-6 pt-0">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-sm font-medium">
                          Título do Conjunto
                        </Label>
                        <Input
                          id="title"
                          placeholder="Ex: Biologia - Fotossíntese"
                          className="text-sm lg:text-base border-input bg-background focus:border-lime-accent dark:focus:border-primary focus:ring-lime-accent/20 dark:focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="content" className="text-sm font-medium">
                          Conteúdo
                        </Label>
                        <Textarea
                          id="content"
                          placeholder="Cole aqui o texto que você quer transformar em flashcards..."
                          className="min-h-[150px] lg:min-h-[200px] text-sm lg:text-base border-input bg-background focus:border-lime-accent dark:focus:border-primary focus:ring-lime-accent/20 dark:focus:ring-primary/20"
                        />
                      </div>
                      <Button className="w-full bg-lime-accent hover:bg-lime-accent/90 text-lime-accent-foreground dark:bg-primary dark:hover:bg-primary/90 dark:text-primary-foreground border border-lime-accent/30 dark:border-primary/30 shadow-sm hover:shadow-md transition-all">
                        <Brain className="w-4 h-4 mr-2" />
                        Gerar Flashcards
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="pdf" className="space-y-4">
                  <Card className="border-card-border">
                    <CardHeader className="p-4 lg:p-6">
                      <CardTitle className="text-base lg:text-lg">Upload de PDF</CardTitle>
                      <CardDescription className="text-sm">
                        Envie um arquivo PDF para extrair o conteúdo automaticamente
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 lg:p-6 pt-0">
                      <div className="border-2 border-dashed border-lime-accent/30 dark:border-primary/30 rounded-lg p-6 lg:p-8 text-center bg-lime-accent/5 dark:bg-primary/5 hover:bg-lime-accent/10 dark:hover:bg-primary/10 transition-colors">
                        <Upload className="w-8 h-8 lg:w-12 lg:h-12 text-lime-accent dark:text-primary mx-auto mb-4" />
                        <p className="text-sm lg:text-base text-foreground mb-2">
                          Arraste e solte seu PDF aqui ou clique para selecionar
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-lime-accent/50 dark:border-primary/50 text-lime-accent dark:text-primary hover:bg-lime-accent/10 dark:hover:bg-primary/10 bg-transparent"
                        >
                          Selecionar Arquivo
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pdf-title" className="text-sm font-medium">
                          Título do Conjunto
                        </Label>
                        <Input
                          id="pdf-title"
                          placeholder="Ex: Matemática - Cálculo I"
                          className="text-sm lg:text-base border-input bg-background focus:border-lime-accent dark:focus:border-primary focus:ring-lime-accent/20 dark:focus:ring-primary/20"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="image" className="space-y-4">
                  <Card className="border-card-border">
                    <CardHeader className="p-4 lg:p-6">
                      <CardTitle className="text-base lg:text-lg">Upload de Imagem</CardTitle>
                      <CardDescription className="text-sm">
                        Envie uma imagem para extrair texto e gerar flashcards
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 lg:p-6 pt-0">
                      <div className="border-2 border-dashed border-lime-accent/30 dark:border-primary/30 rounded-lg p-6 lg:p-8 text-center bg-lime-accent/5 dark:bg-primary/5 hover:bg-lime-accent/10 dark:hover:bg-primary/10 transition-colors">
                        <ImageIcon className="w-8 h-8 lg:w-12 lg:h-12 text-lime-accent dark:text-primary mx-auto mb-4" />
                        <p className="text-sm lg:text-base text-foreground mb-2">
                          Arraste e solte sua imagem aqui ou clique para selecionar
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-lime-accent/50 dark:border-primary/50 text-lime-accent dark:text-primary hover:bg-lime-accent/10 dark:hover:bg-primary/10 bg-transparent"
                        >
                          Selecionar Imagem
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="image-title" className="text-sm font-medium">
                          Título do Conjunto
                        </Label>
                        <Input
                          id="image-title"
                          placeholder="Ex: História - Segunda Guerra"
                          className="text-sm lg:text-base border-input bg-background focus:border-lime-accent dark:focus:border-primary focus:ring-lime-accent/20 dark:focus:ring-primary/20"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        {activeTab === "study" && (
          <div className="flex-1 p-4 lg:p-8 overflow-auto">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Study Header */}
              <div className="text-center space-y-4">
                <h2 className="text-xl lg:text-2xl font-bold text-foreground">Modo Estudo</h2>
                <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-4 text-xs lg:text-sm text-muted-foreground">
                  <span>
                    Card {currentCard + 1} de {flashcards.length}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs border-lime-accent/30 dark:border-primary/30 text-lime-accent dark:text-primary"
                  >
                    {flashcards[currentCard]?.subject}
                  </Badge>
                  <Badge
                    variant={flashcards[currentCard]?.difficulty === "Fácil" ? "default" : "secondary"}
                    className="text-xs text-lime-accent-foreground dark:bg-primary/20 dark:text-primary-foreground border-lime-accent/30 dark:border-primary/30"
                  >
                    {flashcards[currentCard]?.difficulty}
                  </Badge>
                </div>
                <Progress
                  value={((currentCard + 1) / flashcards.length) * 100}
                  className="w-full max-w-md mx-auto [&>div]:bg-lime-accent dark:[&>div]:bg-primary"
                />
              </div>

              <div className="perspective-1000">
                <Card
                  className={`min-h-[250px] lg:min-h-[300px] cursor-pointer transition-transform duration-600 transform-style-preserve-3d border-card-border hover:border-lime-accent/50 dark:hover:border-primary/50 shadow-lg hover:shadow-xl ${
                    isFlipping ? "rotate-y-180" : ""
                  }`}
                  onClick={handleCardFlip}
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isFlipping ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  <CardContent className="flex items-center justify-center p-6 lg:p-8 h-full">
                    <div className="text-center space-y-4">
                      {!showAnswer ? (
                        <>
                          <div className="text-xs lg:text-sm text-lime-accent dark:text-primary font-medium mb-4">
                            PERGUNTA
                          </div>
                          <p className="text-base lg:text-lg font-medium text-balance px-2 text-foreground">
                            {flashcards[currentCard]?.question}
                          </p>
                          <p className="text-xs lg:text-sm text-muted-foreground mt-8">Clique para ver a resposta</p>
                        </>
                      ) : (
                        <>
                          <div className="text-xs lg:text-sm text-lime-accent dark:text-primary font-medium mb-4">
                            RESPOSTA
                          </div>
                          <p className="text-base lg:text-lg text-balance px-2 text-foreground">
                            {flashcards[currentCard]?.answer}
                          </p>
                          <p className="text-xs lg:text-sm text-muted-foreground mt-8">Clique para ver a pergunta</p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={handlePrevCard}
                    disabled={currentCard === 0}
                    size="sm"
                    className="border-lime-accent/50 dark:border-primary/50 dark:text-primary hover:bg-lime-accent/10 dark:hover:bg-primary/10 text-black bg-lime-accent"
                  >
                    <RotateCcw className="w-4 h-4 mr-1 lg:mr-2" />
                    <span className="hidden sm:inline">Anterior</span>
                  </Button>

                  <Button
                    onClick={handleNextCard}
                    disabled={currentCard === flashcards.length - 1}
                    size="sm"
                    className="bg-lime-accent hover:bg-lime-accent/90 text-lime-accent-foreground dark:bg-primary dark:hover:bg-primary/90 dark:text-primary-foreground border border-lime-accent/30 dark:border-primary/30"
                  >
                    <span className="hidden sm:inline">Próximo</span>
                    <Play className="w-4 h-4 ml-1 lg:ml-2" />
                  </Button>
                </div>

                {showAnswer && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950 bg-transparent"
                    >
                      <X className="w-4 h-4 mr-1 lg:mr-2" />
                      <span className="hidden sm:inline">Difícil</span>
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-green-500 hover:bg-green-600 text-white border border-green-400 dark:bg-green-600 dark:hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-1 lg:mr-2" />
                      <span className="hidden sm:inline">Fácil</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card
                    key={i}
                    className="cursor-pointer hover:shadow-lg transition-shadow border-card-border hover:border-lime-accent/50 dark:hover:border-primary/50"
                  >
                    <CardHeader className="p-4 lg:p-6">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm lg:text-base">Conjunto {i}</CardTitle>
                        <Badge
                          variant="default"
                          className="text-xs text-black dark:bg-primary dark:text-primary-foreground border-lime-accent/30 dark:border-primary/30 bg-lime-accent"
                        >
                          {Math.floor(Math.random() * 20) + 5} cards
                        </Badge>
                      </div>
                      <CardDescription className="text-xs lg:text-sm">
                        Criado há {i} dia{i > 1 ? "s" : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 lg:p-6 pt-0">
                      <div className="space-y-3">
                        <Progress
                          value={Math.floor(Math.random() * 100)}
                          className="[&>div]:bg-lime-accent dark:[&>div]:bg-primary"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs lg:text-sm text-muted-foreground">
                            Progresso: {Math.floor(Math.random() * 100)}%
                          </span>
                          <Button
                            size="sm"
                            onClick={() => setActiveTab("study")}
                            className="bg-lime-accent hover:bg-lime-accent/90 text-black dark:bg-primary dark:hover:bg-primary/90 dark:text-primary-foreground border border-lime-accent/30 dark:border-primary/30 shadow-sm hover:shadow-md transition-all"
                          >
                            <Play className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                            <span className="hidden sm:inline">Estudar</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
