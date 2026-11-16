import os

path = 'src/pages/AdminDailyPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

target = '          <span className="text-sm font-extrabold tracking-tight text-white uppercase whitespace-nowrap truncate">\n            Daily Invoice\n          </span>'

replacement = '''          <span className="text-sm font-extrabold tracking-tight text-white uppercase whitespace-nowrap truncate">
            Daily Invoice
          </span>

          {/* Quick Tasks Pill for Mobile Header */}
          <button
            type="button"
            onClick={() => onNavigateTab('tasks')}
            className="md:hidden px-2 py-0.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-cyan-300 hover:text-white text-xs font-black flex items-center gap-1 shadow-sm cursor-pointer shrink-0"
            title="Launch TaskMatrix OS"
          >
            <span className="text-cyan-400">⚡</span>
            <span>Tasks</span>
          </button>'''

text_norm = text.replace('\r\n', '\n')
target_norm = target.replace('\r\n', '\n')

if target_norm in text_norm:
    new_text = text_norm.replace(target_norm, replacement.replace('\r\n', '\n'), 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("SUCCESS: Added Tasks button to mobile header")
else:
    print("ERROR: Target string not found in file")
