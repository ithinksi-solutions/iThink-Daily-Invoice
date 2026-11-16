import os

# Update AdminUsersPage.tsx
path_users = 'src/pages/AdminUsersPage.tsx'
with open(path_users, 'r', encoding='utf-8') as f:
    text_users = f.read().replace('\r\n', '\n')

target_users = '''        <button
          type="button"
          onClick={() => onNavigateTab('users')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-blue-400 bg-blue-500/15 border border-blue-500/30 transition-all shadow-sm cursor-pointer"
        >
          <Users className="w-4 h-4 text-blue-400" />
          <span>Operators</span>
        </button>
      </nav>'''

replacement_users = '''        <button
          type="button"
          onClick={() => onNavigateTab('users')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-blue-400 bg-blue-500/15 border border-blue-500/30 transition-all shadow-sm cursor-pointer"
        >
          <Users className="w-4 h-4 text-blue-400" />
          <span>Operators</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('tasks')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-cyan-300 hover:text-white transition-all cursor-pointer"
        >
          <span className="text-cyan-400 text-xs font-black">⚡</span>
          <span>Tasks</span>
        </button>
      </nav>'''

if target_users in text_users:
    with open(path_users, 'w', encoding='utf-8') as f:
        f.write(text_users.replace(target_users, replacement_users, 1))
    print("SUCCESS: Updated AdminUsersPage.tsx bottom nav")
else:
    print("ERROR: Could not find target in AdminUsersPage.tsx")

# Update AdminToolsPage.tsx
path_tools = 'src/pages/AdminToolsPage.tsx'
with open(path_tools, 'r', encoding='utf-8') as f:
    text_tools = f.read().replace('\r\n', '\n')

target_tools = '''        <button
          type="button"
          onClick={() => onNavigateTab('users')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <Users className="w-4 h-4 text-slate-400" />
          <span>{t('userManagement')}</span>
        </button>
      </nav>'''

replacement_tools = '''        <button
          type="button"
          onClick={() => onNavigateTab('users')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <Users className="w-4 h-4 text-slate-400" />
          <span>{t('userManagement')}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('tasks')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-cyan-300 hover:text-white transition-all cursor-pointer"
        >
          <span className="text-cyan-400 text-xs font-black">⚡</span>
          <span>Tasks</span>
        </button>
      </nav>'''

if target_tools in text_tools:
    with open(path_tools, 'w', encoding='utf-8') as f:
        f.write(text_tools.replace(target_tools, replacement_tools, 1))
    print("SUCCESS: Updated AdminToolsPage.tsx bottom nav")
else:
    print("ERROR: Could not find target in AdminToolsPage.tsx")
