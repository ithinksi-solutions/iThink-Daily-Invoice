import os

path = 'src/pages/AdminDailyPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

target = '''                  <div className="flex items-center gap-1 text-xs font-bold text-slate-300 group-hover:translate-x-1 transition-transform">
                    <span>{t('addNewEntry')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>

              </div>'''

replacement = '''                  <div className="flex items-center gap-1 text-xs font-bold text-slate-300 group-hover:translate-x-1 transition-transform">
                    <span>{t('addNewEntry')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>

                {/* Tile 3: TaskMatrix OS Checklist */}
                <button
                  type="button"
                  onClick={() => onNavigateTab('tasks')}
                  className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-950 to-cyan-950/20 border border-indigo-500/30 hover:border-cyan-400 text-slate-100 transition-all group flex flex-col justify-between gap-3 text-left shadow-lg cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-indigo-500/20 text-cyan-300 flex items-center justify-center font-bold">
                      ⚡
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-500/30">
                      TaskMatrix OS
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors">
                      Manage Operator Tasks
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      View assigned field tasks, dispatch pickup/delivery duties to operators, or review completions.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
                    <span>Open TaskMatrix</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>

              </div>'''

text_norm = text.replace('\r\n', '\n')
target_norm = target.replace('\r\n', '\n')

if target_norm in text_norm:
    new_text = text_norm.replace(target_norm, replacement.replace('\r\n', '\n'), 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("SUCCESS: Added TaskMatrix tile to empty state")
else:
    print("ERROR: Target string not found in file")
