import { LayoutDashboard, FileText, History, Box } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-full hidden md:flex flex-col shrink-0 z-20 shadow-sm">
      <div className="px-6 py-6 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-700 rounded-lg text-white flex items-center justify-center font-bold text-xl shadow-md">
          <Box className="w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Bucle</h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 bg-blue-50 text-blue-700 rounded-lg font-medium transition-colors">
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
          <FileText className="w-5 h-5" />
          Documentos
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
          <History className="w-5 h-5" />
          Historial
        </a>
      </nav>
    </aside>
  );
}
