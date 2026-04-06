# -*- coding: utf-8 -*-
"""Fix dashboard - write Index.html from parts"""
import os
d = os.path.join(os.path.dirname(__file__),'Shop_vnext','src','Index.html')
f = open(d,'w',encoding='utf-8')
f.write('<!DOCTYPE html>\n<html lang="th">\n<head>\n')
f.write('<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n')
f.write('<title>Comphone Dashboard V314</title>\n')
f.write('<script src="https://cdn.tailwindcss.com"><\/script>\n')
f.write('<script>\ntailwind.config={theme:{extend:{colors:{brand:{DEFAULT:"#1DB446",dark:"#18933a",light:"#E8F5E9"}}}}};\n<\/script>\n')
f.write('<style>')
f.write("@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800;900&display=swap');\n")
f.write("body{font-family:'Noto Sans Thai',-apple-system,sans-serif}\n")
f.write(".card-hover{transition:all .2s ease}.card-hover:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(0,0,0,.1)}\n")
f.write(".fade-in{animation:fadeIn .3s ease-out}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}\n")
f.write(".slide-up{animation:slideUp .3s ease-out}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}\n")
f.write(".scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}\n")
f.write(".line-clamp-2{-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;display:-webkit-box}\n")
f.write("@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}\n")
f.write(".skeleton{animation:pulse 1.5s ease-in-out infinite;background:#e5e7eb;border-radius:16px}\n")
f.write('.skeleton-tile{height:72px}\n.skeleton-bar{height:16px;border-radius:8px}\n.skeleton-bar-sm{height:12px;border-radius:6px;width:60%}\n')
f.write('<\/style></head>\n')
f.write('<body class="bg-gray-50 text-gray-800 min-h-screen pb-20 pt-16">\n')

# Header
f.write('<header class="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-brand to-brand-dark text-white shadow-lg">\n')
f.write('<div class="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">\n')
f.write('<div class="flex items-center gap-2"><span class="text-2xl">\U0001F4F1;</span>\n')
f.write('<h1 class="text-lg font-extrabold tracking-tight">Comphone Dashboard</h1></div>\n')
f.write('<div id="clock" class="text-xs font-medium opacity-90 bg-white/20 px-3 py-1 rounded-full">...</div></div></header>\n')

# Nav
f.write('<nav class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">\n')
f.write('<div class="max-w-3xl mx-auto flex justify-around py-1">\n')
f.write('<button id="tabDashboard" class="flex flex-col items-center px-4 py-2 text-xs transition-all text-brand font-bold" onclick="go(\'pageDashboard\')"><span class="text-xl mb-0.5">\U0001F4CA;</span><span>&#x0E2A;&#x0E23;&#x0E38;&#x0E1B;</span></button>\n')
f.write('<button id="tabJobs" class="flex flex-col items-center px-4 py-2 text-xs transition-all text-gray-400 font-semibold" onclick="go(\'pageJobs\')"><span class="text-xl mb-0.5">\U0001F4CB;</span><span>&#x0E07;&#x0E32;&#x0E19;</span></button>\n')
f.write('<button id="tabStock" class="flex flex-col items-center px-4 py-2 text-xs transition-all text-gray-400 font-semibold" onclick="go(\'pageStock\')"><span class="text-xl mb-0.5">\U0001F4E6;</span><span>&#x0E2A;&#x0E15;&#x0E47;&#x0E2D;&#x0E01;</span></button>\n')
f.write('</div></nav>\n')

# Main pages
f.write('<main class="max-w-3xl mx-auto px-4 pt-4">\n')
f.write('<section id="pageDashboard" class="page active fade-in">\n')
# Skeleton
f.write('<div class="bg-gradient-to-r from-brand-light to-emerald-100 rounded-2xl p-5 mb-4 border border-brand/20"><div class="flex items-center gap-3"><div class="w-12 h-12 bg-brand/30 rounded-xl skeleton"></div><div><div class="skeleton skeleton-bar mb-1" style="width:120px"></div><div class="skeleton skeleton-bar-sm"></div></div></div></div>\n')
f.write('<div class="grid grid-cols-2 gap-3 mb-4">')
for i in range(4):
    f.write('<div class="skeleton skeleton-tile"></div>')
f.write('</div><div class="skeleton skeleton-tile" style="height:120px"></div>\n')
f.write('</section>\n')

# Jobs page
f.write('<section id="pageJobs" class="page hidden fade-in">\n')
f.write('<div class="sticky top-16 z-30 bg-gray-50 py-3 -mx-4 px-4">\n')
f.write('<div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">\U0001F50D;</span>\n')
f.write('<input type="text" id="searchInput" placeholder="\u0E04\u0E49\u0E19\u0E2B\u0E32 JobID, \u0E0A\u0E37\u0E48\u0E2D" class="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm focus:border-brand focus:outline-none transition-colors shadow-sm"></div>\n')
f.write('<div class="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">\n')
f.write('<button class="filter-btn px-4 py-1.5 bg-brand text-white rounded-full text-xs font-bold ring-2 ring-brand" data-filter="all">\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14</button>\n')
f.write('<button class="filter-btn px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold" data-filter="\u0E23\u0E2D\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23;">\u23F3; \u0E23\u0E2D;</button>\n')
f.write('<button class="filter-btn px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold" data-filter="InProgress">\U0001F504; \u0E17\u0E33;</button>\n')
f.write('<button class="filter-btn px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold" data-filter="Completed">\u2705; \u0E40\u0E2A\u0E23\u0E47\u0E08;</button>\n')
f.write('</div></div>\n<div id="jobCards" class="space-y-3 pb-4"></div></section>\n')

# Stock page
f.write('<section id="pageStock" class="page hidden fade-in"><div class="skeleton skeleton-tile mb-3"></div>\n')
for i in range(5):
    f.write('<div class="skeleton" style="height:60px;margin-bottom:8px"></div>\n')
f.write('</section>\n')

# Form page
f.write('<section id="pageForm" class="page hidden fade-in">\n')
f.write('<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">\n')
f.write('<h2 id="formTitle" class="text-lg font-extrabold text-brand mb-4"></h2>\n')
f.write('<div id="formBody" class="space-y-4"></div></div></section></main>\n')

# FAB
f.write('<button id="fabBtn" class="fixed bottom-20 right-5 w-14 h-14 bg-gradient-to-br from-brand to-brand-dark text-white rounded-full shadow-lg shadow-brand/30 flex items-center justify-center text-2xl font-bold z-40 hover:scale-105 active:scale-95 transition-transform" onclick="openNewJob()">+</button>\n')

# Alert modal
f.write('<div id="alertModal" class="fixed inset-0 z-[60] bg-black/50 hidden items-center justify-center p-4" onclick="if(event.target===this)this.classList.add(\'hidden\')">\n')
f.write('<div class="bg-white rounded-2xl p-6 w-full max-w-sm slide-up text-center">\n')
f.write('<div id="alertIcon" class="text-4xl mb-3"></div>\n')
f.write('<h3 id="alertTitle" class="text-lg font-bold mb-2"></h3>\n')
f.write('<p id="alertMsg" class="text-sm text-gray-500 leading-relaxed mb-5 whitespace-pre-line"></p>\n')
f.write('<button onclick="document.getElementById(\'alertModal\').classList.add(\'hidden\')" class="w-full py-3 bg-brand text-white rounded-xl font-bold text-sm hover:bg-brand-dark transition-colors">\u0E15\u0E01\u0E25\u0E07;</button></div></div>\n')

# Status modal
f.write('<div id="statusModal" class="fixed inset-0 z-[60] bg-black/50 hidden items-end justify-center" onclick="if(event.target===this)this.classList.add(\'hidden\')">\n')
f.write('<div class="bg-white rounded-t-2xl p-5 w-full max-w-md slide-up">\n')
f.write('<div class="flex justify-between items-center mb-3">\n')
f.write('<h3 id="statusTitle" class="text-lg font-bold"></h3>\n')
f.write('<button onclick="document.getElementById(\'statusModal\').classList.add(\'hidden\')" class="text-2xl text-gray-400 hover:text-gray-600">&times;</button></div>\n')
f.write('<p id="statusSubtitle" class="text-sm text-gray-500 mb-4"></p>\n')
f.write('<div id="statusOptions" class="grid grid-cols-2 gap-2 mb-4"></div>\n')
f.write('<div class="mb-4"><label class="text-xs font-bold text-gray-600 mb-1 block">\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38;</label>\n')
f.write('<input type="text" id="statusNote" placeholder="\u0E40\u0E1E\u0E34\u0E48\u0E21;..." class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-brand focus:outline-none"></div>\n')
f.write('<button id="statusSave" class="w-full py-3 bg-brand text-white rounded-xl font-bold text-sm hover:bg-brand-dark transition-colors disabled:opacity-50" onclick="saveStatus()">\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01;</button></div></div>\n')

# Error bar
f.write('<div id="errorBar" class="hidden fixed top-16 left-0 right-0 z-[80] bg-red-500 text-white text-center py-2 text-sm font-bold"></div>\n')

# Loading
f.write('<div id="loadingOverlay" class="fixed inset-0 z-[70] bg-white/80 hidden items-center justify-center">\n')
f.write('<div class="text-center"><div class="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>\n')
f.write('<p class="text-sm font-semibold text-gray-500">\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14;...</p></div></div>\n')

f.write('<script>')
f.close()
print(f"Part 1 done: {os.path.getsize(d)} bytes")
