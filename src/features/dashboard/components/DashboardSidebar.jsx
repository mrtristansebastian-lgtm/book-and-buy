import { ShieldCheck } from 'lucide-react';
import { BuildABookingBrand } from '../../../components/BuildABookingBrand';
import { ProButton } from '../../../components/ProButton';

export const DashboardSidebar = ({
  activeTab,
  accessLoading,
  isGuestWorkspace,
  navItems,
  sidebarCollapsed,
  user,
  workspaceChoices,
  workspaceOwnerId,
  workspaceRole,
  onAuth,
  onLanding,
  onNavigateTab,
  onSignOut,
  onWorkspaceChange
}) => (
  <div className={`dashboard-sidebar hidden md:flex transition-all duration-700 ease-in-out bg-white border-r border-neutral-100 flex-col relative z-50 shadow-sm ${sidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-80 p-8'}`}>
    {!sidebarCollapsed && (
      <>
        <div className="flex items-center mb-8 px-2 cursor-pointer group" onClick={onLanding}>
          <BuildABookingBrand className="w-[190px] h-auto transition-transform duration-300 group-hover:scale-[1.02]" variant="dark" />
        </div>
        {user && (
          <div className="mb-6 rounded-lg border border-neutral-100 bg-neutral-50 p-3">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Workspace</span>
              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${workspaceRole === 'owner' || workspaceRole === 'guest' ? 'bg-[#39FF14] text-black' : workspaceRole === 'admin' ? 'bg-black text-white' : 'bg-white text-neutral-500 border border-neutral-100'}`}>
                {workspaceRole}
              </span>
            </div>
            <select
              value={workspaceOwnerId}
              onChange={(event) => onWorkspaceChange(event.target.value)}
              className="w-full h-10 rounded-lg bg-white border border-neutral-100 px-3 text-xs font-bold text-black outline-none focus:border-black"
            >
              {workspaceChoices.map(workspace => (
                <option key={workspace.ownerId} value={workspace.ownerId}>
                  {workspace.workspaceName || workspace.ownerEmail || 'Workspace'}
                </option>
              ))}
            </select>
            {accessLoading && <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mt-2">Checking access...</p>}
          </div>
        )}
        {isGuestWorkspace && (
          <div className="mb-6 rounded-lg border border-neutral-100 bg-neutral-50 p-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Guest Mode</p>
            <p className="text-sm font-bold text-black mb-3">Browse every tool with local demo edits.</p>
            <button onClick={() => onAuth('signup', 'owner')} className="h-10 w-full rounded-lg bg-[#39FF14] text-black text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-95 transition-all">
              <ShieldCheck size={14}/> Save For Real
            </button>
          </div>
        )}
        <nav className="space-y-3 flex-1 overflow-y-auto no-scrollbar pb-10">
          {navItems.map(item => {
            const IconCmp = item.icon;
            return (
              <button key={item.id} data-tour={`nav-${item.id}`} onClick={() => onNavigateTab(item.id)} className={`w-full flex items-center gap-5 px-6 py-5 rounded-lg text-[11px] font-bold transition-all duration-700 ${activeTab === item.id ? 'bg-[#39FF14] text-black shadow-xl shadow-[#39FF14]/20 scale-[1.02]' : 'text-neutral-400 hover:bg-neutral-50 hover:text-black'}`}>
                <IconCmp size={18} strokeWidth={2.5} /> {item.label.toUpperCase()}
                {item.badge && <div className={`ml-auto w-2 h-2 rounded-full animate-pulse ${activeTab === item.id ? 'bg-black' : 'bg-[#39FF14]'}`} />}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto space-y-4 pt-6 border-t border-neutral-100">
          {isGuestWorkspace ? (
            <div className="space-y-2">
              <ProButton onClick={() => onAuth('signin', 'owner')} variant="neon" className="w-full py-4 text-[10px]">Sign In</ProButton>
              <ProButton onClick={onSignOut} variant="outline" className="w-full py-4 text-[10px]">Exit Guest</ProButton>
            </div>
          ) : (
            <ProButton onClick={onSignOut} variant="outline" className="w-full py-4 text-[10px]">Sign Out</ProButton>
          )}
        </div>
      </>
    )}
  </div>
);
