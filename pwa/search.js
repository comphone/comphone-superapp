/**
 * Smart Search for COMPHONE Dashboard
 * Version: v5.18.1-dashboard
 * Features: Search jobs, customers, inventory; history; filters; keyboard navigation
 */

// Search history (max 10)
let searchHistory = JSON.parse(localStorage.getItem('comphone_search_history') || '[]');

// Mock data for demonstration (replace with actual API calls)
const MOCK_JOBS = [
  { id: 'J0019', title: 'ทดสอบระบบ', type: 'job', icon: 'bi-tools', color: '#3b82f6' },
  { id: 'J0018', title: 'เพิ่มกล้อง 3 จุด', type: 'job', icon: 'bi-camera', color: '#10b981' },
  { id: 'J0017', title: 'ระบบกล้องอเมซอน', type: 'job', icon: 'bi-camera', color: '#ef4444' }
];

const MOCK_CUSTOMERS = [
  { id: 'C001', title: 'รร.ชุมชนบ้านสว่าง', type: 'customer', icon: 'bi-people', color: '#8b5cf6' }
];

const MOCK_INVENTORY = [
  { id: 'P001', title: 'กล้องวงจรปิด', type: 'inventory', icon: 'bi-box', color: '#f59e0b' }
];

// Combine all data sources
function getAllSearchableItems() {
  // In production, fetch from API or use cached data
  return [...MOCK_JOBS, ...MOCK_CUSTOMERS, ...MOCK_INVENTORY];
}

// Handle search input
function handleSearchInput(event) {
  const input = document.getElementById('global-search');
  const query = input.value.trim();
  const suggestionsDiv = document.getElementById('search-suggestions');
  
  if (event.key === 'Escape') {
    suggestionsDiv.style.display = 'none';
    input.blur();
    return;
  }
  
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    navigateSuggestions(event.key);
    return;
  }
  
  if (query.length === 0) {
    showSearchHistory();
    return;
  }
  
  // Filter items
  const items = getAllSearchableItems();
  const filtered = items.filter(item => 
    item.id.toLowerCase().includes(query.toLowerCase()) ||
    item.title.toLowerCase().includes(query.toLowerCase())
  );
  
  // Also include history matches
  const historyMatches = searchHistory.filter(h => 
    h.toLowerCase().includes(query.toLowerCase())
  );
  
  renderSuggestions(filtered, historyMatches, query);
}

// Show search history
function showSearchHistory() {
  const suggestionsDiv = document.getElementById('search-suggestions');
  if (searchHistory.length === 0) {
    suggestionsDiv.style.display = 'none';
    return;
  }
  
  let html = '<div style="padding:8px 12px;font-size:11px;color:#9ca3af;font-weight:600;">ประวัติการค้นหา</div>';
  searchHistory.slice(0, 5).forEach(item => {
    html += `
      <div class="search-suggestion-item" onclick="selectSearchHistory('${item}')">
        <div class="search-suggestion-icon" style="background:#f3f4f6;color:#9ca3af">
          <i class="bi bi-clock-history"></i>
        </div>
        <div class="search-suggestion-text">
          <div class="search-suggestion-title">${item}</div>
        </div>
      </div>
    `;
  });
  
  suggestionsDiv.innerHTML = html;
  suggestionsDiv.style.display = 'block';
}

// Render suggestions
function renderSuggestions(items, historyMatches, query) {
  const suggestionsDiv = document.getElementById('search-suggestions');
  
  if (items.length === 0 && historyMatches.length === 0) {
    suggestionsDiv.innerHTML = `
      <div style="padding:16px;text-align:center;color:#9ca3af;font-size:13px;">
        <i class="bi bi-search" style="font-size:24px;display:block;margin-bottom:8px"></i>
        ไม่พบผลการค้นหา "${query}"
      </div>
    `;
    suggestionsDiv.style.display = 'block';
    return;
  }
  
  let html = '';
  
  // History matches
  if (historyMatches.length > 0) {
    html += '<div style="padding:8px 12px;font-size:11px;color:#9ca3af;font-weight:600;">ประวัติ</div>';
    historyMatches.slice(0, 3).forEach(match => {
      html += `
        <div class="search-suggestion-item" onclick="selectSearchHistory('${match}')">
          <div class="search-suggestion-icon" style="background:#f3f4f6;color:#9ca3af">
            <i class="bi bi-clock-history"></i>
          </div>
          <div class="search-suggestion-text">
            <div class="search-suggestion-title">${match}</div>
          </div>
        </div>
      `;
    });
  }
  
  // Results
  if (items.length > 0) {
    html += '<div style="padding:8px 12px;font-size:11px;color:#9ca3af;font-weight:600;">ผลการค้นหา</div>';
    items.slice(0, 8).forEach(item => {
      html += `
        <div class="search-suggestion-item" onclick="selectSuggestion('${item.type}', '${item.id}')">
          <div class="search-suggestion-icon" style="background:${item.color}20;color:${item.color}">
            <i class="bi ${item.icon}"></i>
          </div>
          <div class="search-suggestion-text">
            <div class="search-suggestion-title">${highlightText(item.title, query)}</div>
            <div class="search-suggestion-sub">${item.id} · ${getTypeLabel(item.type)}</div>
          </div>
        </div>
      `;
    });
  }
  
  suggestionsDiv.innerHTML = html;
  suggestionsDiv.style.display = 'block';
}

// Highlight matching text
function highlightText(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<strong style="color:#3b82f6">$1</strong>');
}

// Get type label
function getTypeLabel(type) {
  const labels = {
    'job': 'งานบริการ',
    'customer': 'ลูกค้า',
    'inventory': 'สต็อก'
  };
  return labels[type] || type;
}

// Select suggestion
function selectSuggestion(type, id) {
  // Add to history
  const input = document.getElementById('global-search');
  const query = input.value.trim();
  if (query && !searchHistory.includes(query)) {
    searchHistory.unshift(query);
    if (searchHistory.length > 10) searchHistory.pop();
    localStorage.setItem('comphone_search_history', JSON.stringify(searchHistory));
  }
  
  // Hide suggestions
  document.getElementById('search-suggestions').style.display = 'none';
  
  // Navigate based on type
  switch(type) {
    case 'job':
      loadSection('jobs');
      // Could open job detail modal
      setTimeout(() => {
        if (typeof viewJob === 'function') viewJob(id);
      }, 500);
      break;
    case 'customer':
      loadSection('crm');
      break;
    case 'inventory':
      loadSection('inventory');
      break;
    default:
      console.log('Unknown type:', type);
  }
  
  input.value = '';
}

// Select from history
function selectSearchHistory(query) {
  const input = document.getElementById('global-search');
  input.value = query;
  handleSearchInput({ key: 'Enter' });
}

// Navigate suggestions with keyboard
function navigateSuggestions(key) {
  const items = document.querySelectorAll('.search-suggestion-item');
  if (items.length === 0) return;
  
  const current = document.querySelector('.search-suggestion-item.selected');
  let nextIndex = 0;
  
  if (current) {
    current.classList.remove('selected');
    const currentIndex = Array.from(items).indexOf(current);
    if (key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % items.length;
    } else {
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    }
  }
  
  items[nextIndex].classList.add('selected');
  items[nextIndex].scrollIntoView({ block: 'nearest' });
}

// Show suggestions on focus
function showSearchSuggestions(query) {
  const input = document.getElementById('global-search');
  if (input.value.trim().length === 0) {
    showSearchHistory();
  } else {
    handleSearchInput({ key: '' });
  }
}

// Close suggestions when clicking outside
document.addEventListener('click', function(event) {
  const searchBar = document.querySelector('.topbar-search');
  const suggestions = document.getElementById('search-suggestions');
  
  if (searchBar && !searchBar.contains(event.target)) {
    suggestions.style.display = 'none';
  }
});

// Initialize search on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSearch);
} else {
  initSearch();
}

function initSearch() {
  const input = document.getElementById('global-search');
  if (input) {
    input.addEventListener('blur', function() {
      // Delay hiding to allow click on suggestion
      setTimeout(() => {
        const suggestions = document.getElementById('search-suggestions');
        if (suggestions && !suggestions.contains(document.activeElement)) {
          suggestions.style.display = 'none';
        }
      }, 200);
    });
  }
}

console.log('[Search] Smart Search module loaded v5.18.0-phase43');
