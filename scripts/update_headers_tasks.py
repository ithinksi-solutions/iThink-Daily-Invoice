import os

# 1. Update AdminUsersPage.tsx header
path_users = 'src/pages/AdminUsersPage.tsx'
with open(path_users, 'r', encoding='utf-8') as f:
    text_users = f.read().replace('\r\n', '\n')

target_users_header = '''            <button
              type="button"
              onClick={() => onNavigateTab('users')}
              className="px-2.5 py-1 text-xs font-bold rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Operators</span>
            </button>
          </div>'''

replacement_users_header = '''            <button
              type="button"
              onClick={() => onNavigateTab('users')}
              className="px-2.5 py-1 text-xs font-bold rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Operators</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('tasks')}
              className="px-2.5 py-1 text-xs font-bold rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 transition-colors flex items-center gap-1 ml-1 cursor-pointer"
            >
              <span className="text-cyan-400">⚡</span>
              <span>TaskMatrix</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('tasks')}
            className="md:hidden px-2 py-0.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-cyan-300 hover:text-white text-xs font-black flex items-center gap-1 shadow-sm cursor-pointer shrink-0"
            title="Launch TaskMatrix OS"
          >
            <span className="text-cyan-400">⚡</span>
            <span>Tasks</span>
          </button>'''

if target_users_header in text_users:
    with open(path_users, 'w', encoding='utf-8') as f:
        f.write(text_users.replace(target_users_header, replacement_users_header, 1))
    print("SUCCESS: Added TaskMatrix to AdminUsersPage header")
else:
    print("ERROR: Target header not found in AdminUsersPage")

# 2. Update AdminToolsPage.tsx header
path_tools = 'src/pages/AdminToolsPage.tsx'
with open(path_tools, 'r', encoding='utf-8') as f:
    text_tools = f.read().replace('\r\n', '\n')

target_tools_header = '''            <button
              type="button"
              onClick={() => onNavigateTab('users')}
              className="px-2.5 py-1 text-xs font-medium rounded-md text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t('userManagement')}</span>
            </button>
          </div>'''

replacement_tools_header = '''            <button
              type="button"
              onClick={() => onNavigateTab('users')}
              className="px-2.5 py-1 text-xs font-medium rounded-md text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t('userManagement')}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('tasks')}
              className="px-2.5 py-1 text-xs font-bold rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 transition-colors flex items-center gap-1 ml-1 cursor-pointer"
            >
              <span className="text-cyan-400">⚡</span>
              <span>TaskMatrix</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('tasks')}
            className="md:hidden px-2 py-0.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-cyan-300 hover:text-white text-xs font-black flex items-center gap-1 shadow-sm cursor-pointer shrink-0"
            title="Launch TaskMatrix OS"
          >
            <span className="text-cyan-400">⚡</span>
            <span>Tasks</span>
          </button>'''

if target_tools_header in text_tools:
    with open(path_tools, 'w', encoding='utf-8') as f:
        f.write(text_tools.replace(target_tools_header, replacement_tools_header, 1))
    print("SUCCESS: Added TaskMatrix to AdminToolsPage header")
else:
    print("ERROR: Target header not found in AdminToolsPage")
