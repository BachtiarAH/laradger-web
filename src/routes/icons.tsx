import { createFileRoute } from "@tanstack/react-router"
import * as React from "react"
import {
  LayoutDashboard,
  Wallet,
  NotebookPen,
  PiggyBank,
  Tags,
  History,
  Building2,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Search,
  Plus,
  Trash2,
  Check,
  Settings,
  Bell,
  Home,
  FileText,
  Calendar,
  BarChart3,
  PieChart,
  CreditCard,
  Coins,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  Edit,
  Save,
  Download,
  Upload,
  Copy,
  Share2,
  Filter,
  SearchX,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react"

export const Route = createFileRoute("/icons")({
  component: IconsPage,
})

const ICONS = [
  { name: "LayoutDashboard", label: "Dashboard", Comp: LayoutDashboard },
  { name: "Wallet", label: "Wallet", Comp: Wallet },
  { name: "NotebookPen", label: "Notebook Pen", Comp: NotebookPen },
  { name: "PiggyBank", label: "Piggy Bank", Comp: PiggyBank },
  { name: "Tags", label: "Tags", Comp: Tags },
  { name: "History", label: "History", Comp: History },
  { name: "Building2", label: "Building 2", Comp: Building2 },
  { name: "User", label: "User", Comp: User },
  { name: "LogOut", label: "Log Out", Comp: LogOut },
  { name: "Menu", label: "Menu", Comp: Menu },
  { name: "X", label: "X", Comp: X },
  { name: "ChevronDown", label: "Chevron Down", Comp: ChevronDown },
  { name: "Search", label: "Search", Comp: Search },
  { name: "Plus", label: "Plus", Comp: Plus },
  { name: "Trash2", label: "Trash", Comp: Trash2 },
  { name: "Check", label: "Check", Comp: Check },
  { name: "Settings", label: "Settings", Comp: Settings },
  { name: "Bell", label: "Bell", Comp: Bell },
  { name: "Home", label: "Home", Comp: Home },
  { name: "FileText", label: "File Text", Comp: FileText },
  { name: "Calendar", label: "Calendar", Comp: Calendar },
  { name: "BarChart3", label: "Bar Chart", Comp: BarChart3 },
  { name: "PieChart", label: "Pie Chart", Comp: PieChart },
  { name: "CreditCard", label: "Credit Card", Comp: CreditCard },
  { name: "Coins", label: "Coins", Comp: Coins },
  { name: "TrendingUp", label: "Trending Up", Comp: TrendingUp },
  { name: "TrendingDown", label: "Trending Down", Comp: TrendingDown },
  { name: "ArrowUpRight", label: "Arrow Up Right", Comp: ArrowUpRight },
  { name: "ArrowDownRight", label: "Arrow Down Right", Comp: ArrowDownRight },
  { name: "Eye", label: "Eye", Comp: Eye },
  { name: "EyeOff", label: "Eye Off", Comp: EyeOff },
  { name: "Edit", label: "Edit", Comp: Edit },
  { name: "Save", label: "Save", Comp: Save },
  { name: "Download", label: "Download", Comp: Download },
  { name: "Upload", label: "Upload", Comp: Upload },
  { name: "Copy", label: "Copy", Comp: Copy },
  { name: "Share2", label: "Share", Comp: Share2 },
  { name: "Filter", label: "Filter", Comp: Filter },
  { name: "SearchX", label: "Search X", Comp: SearchX },
  { name: "AlertCircle", label: "Alert", Comp: AlertCircle },
  { name: "Info", label: "Info", Comp: Info },
  { name: "CheckCircle2", label: "Check Circle", Comp: CheckCircle2 },
  { name: "XCircle", label: "X Circle", Comp: XCircle },
] as const

function IconsPage() {
  const [query, setQuery] = React.useState("")
  const [copied, setCopied] = React.useState<string | null>(null)

  const filtered = ICONS.filter(
    (i) => i.name.toLowerCase().includes(query.toLowerCase()) || i.label.toLowerCase().includes(query.toLowerCase())
  )

  const handleCopy = async (name: string) => {
    await navigator.clipboard.writeText(`import { ${name} } from "lucide-react"\n\n<${name} className="size-5" />`)
    setCopied(name)
    setTimeout(() => setCopied(null), 1200)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Icons</h1>
        <p className="text-sm text-muted-foreground">
          Lucide React — <code className="rounded bg-muted px-1 py-0.5 text-xs">lucide-react</code> sudah terpasang. Klik copy untuk pakai.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search size={16} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons..."
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} icons</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {filtered.map(({ name, label, Comp }) => (
          <div key={name} className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 text-center shadow-sm transition hover:shadow-md">
            <div className="flex size-14 items-center justify-center rounded-lg bg-muted text-foreground">
              <Comp size={28} />
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-medium">{label}</div>
              <div className="font-mono text-[11px] text-muted-foreground">{name}</div>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Comp size={16} />
              <Comp size={20} className="text-foreground" />
              <Comp size={24} className="text-primary" />
            </div>
            <button
              onClick={() => handleCopy(name)}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
            >
              {copied === name ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              {copied === name ? "Copied!" : "Copy"}
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No icons found for "{query}"</p>}

      <div className="rounded-lg border border-dashed p-4">
        <h2 className="text-sm font-semibold">Usage</h2>
        <pre className="mt-2 overflow-x-auto rounded bg-muted p-3 text-xs">{`import { Wallet, LayoutDashboard } from "lucide-react"

<Wallet className="size-5" />
<LayoutDashboard size={24} /> // or size prop
<Trash2 className="size-4 text-destructive" />`}</pre>
      </div>
    </div>
  )
}
