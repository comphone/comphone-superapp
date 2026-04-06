$handlerPath = "C:\Users\Server\.openclaw\Shop_vnext\src\handler.js"
$airouterPath = "C:\Users\Server\.openclaw\Shop_vnext\src\AiRouter.js"

# =====================
# Fix AiRouter.js - selectAgentForTask
# =====================
$airouter = Get-Content $airouterPath -Raw -Encoding UTF8

$oldSelect = @"
function selectAgentForTask(message, context) {
  var msg = (message || '').toLowerCase();
  context = context || {};
  
  // 1. CODE triggers
  var codeTriggers = AGENT_ROLES.CODE.triggers;
  for (var i = 0; i < codeTriggers.length; i++) {
    if (msg.indexOf(codeTriggers[i].toLowerCase()) >= 0) {
      console.log('[Agent Router] Selected: CODE');
      return 'CODE';
    }
  }
  
  // 2. VISION (มีร