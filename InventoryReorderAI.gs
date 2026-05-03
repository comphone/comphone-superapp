// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a
// InventoryReorderAI.gs — Gemini AI Reorder Suggestions & Notifications
// Extracted from Inventory.gs (Phase 31 Refactoring)
// ============================================================

function geminiReorderSuggestion() {
  var apiKey = getConfig('GEMINI_API_KEY') || getConfig('GOOGLE_AI_API_KEY') || '';
  try {
    _logInfo_('geminiReorderSuggestion', 'Starting reorder analysis', { hasApiKey: !!apiKey });
    var ss = getComphoneSheet();
    var invSheet = findSheetByName(ss, 'DB_INVENTORY');
    var resSheet = findSheetByName(ss, 'DB_RESERVATIONS');
    if (!invSheet) return { error: 'DB_INVENTORY not found' };

    var invAll = invSheet.getDataRange().getValues();

    var hdrs = invAll[0];
    var colMap = { code:0, name:1, qty:2, cost:3 };
    for (var hi = 0; hi < hdrs.length; hi++) {
      var hv = String(hdrs[hi]).toLowerCase().replace(/_/g,'');
      if (hv === 'itemcode' || hv === 'code') colMap.code = hi;
      else if (hv === 'itemname' || hv === 'name') colMap.name = hi;
      else if (hv === 'qty' || hv === 'quantity') colMap.qty = hi;
      else if (hv === 'cost' || hv === 'costprice') colMap.cost = hi;
    }

    var lowItems = [];
    var reservedItems = [];

    for (var i = 1; i < invAll.length; i++) {
      var code = String(invAll[i][colMap.code]);
      var name = String(invAll[i][colMap.name]);
      var qty = Number(invAll[i][colMap.qty] || 0);
      var cost = Number(invAll[i][colMap.cost] || 0);
      var reserved = 0;

      if (resSheet) {
        var resAll = resSheet.getDataRange().getValues();
        for (var j = 1; j < resAll.length; j++) {
          if (String(resAll[j][1]) === code && String(resAll[j][5]) === 'reserved') {
            reserved += Number(resAll[j][3] || 0);
          }
        }
      }

      var effective = qty - reserved;

      if (effective < INVENTORY_ALERT_THRESHOLD) {
        lowItems.push({ code: code, name: name, qty: qty, reserved: reserved, effective: effective, cost: cost });
      }
    }

    if (lowItems.length === 0) {
      return { success: true, message: '\u0e2a\u0e15\u0e47\u0e2d\u0e01\u0e1e\u0e23\u0e49\u0e2d\u0e21\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14\u0e04\u0e23\u0e31\u0e1a \u0e44\u0e21\u0e48\u0e21\u0e35\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e15\u0e49\u0e2d\u0e07\u0e2a\u0e31\u0e48\u0e07\u0e0b\u0e37\u0e49\u0e2d' };
    }

    var reorderText = JSON.stringify(lowItems);

    if (apiKey) {
      return _geminiAnalyzeReorder(apiKey, lowItems);
    }

    var msg = _buildReorderMessage(lowItems);
    sendLineNotify({ message: msg, room: 'PROCUREMENT' });
    return { success: true, message: msg, items: lowItems };
  } catch(e) { _logError_('MEDIUM', 'geminiReorderSuggestion', e); return { error: e.toString() }; }
}

function _geminiAnalyzeReorder(apiKey, lowItems) {
  try {
    var prompt = '\u0e04\u0e38\u0e13\u0e04\u0e37\u0e2d\u0e1c\u0e39\u0e49\u0e0a\u0e48\u0e27\u0e22\u0e08\u0e31\u0e14\u0e0b\u0e37\u0e49\u0e2d\u0e23\u0e49\u0e32\u0e19 Comphone & Electronics \u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32\u0e17\u0e35\u0e48\u0e43\u0e01\u0e25\u0e49\u0e2b\u0e21\u0e14\u0e41\u0e25\u0e30\u0e41\u0e19\u0e30\u0e19\u0e33\u0e01\u0e32\u0e23\u0e2a\u0e31\u0e48\u0e07\u0e0b\u0e37\u0e49\u0e2d\n\n';
    prompt += '\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e17\u0e35\u0e48\u0e43\u0e01\u0e25\u0e49\u0e2b\u0e21\u0e14:\n';
    for (var i = 0; i < lowItems.length; i++) {
      var item = lowItems[i];
      prompt += '- ' + item.name + ' (' + item.code + ') \u0e40\u0e2b\u0e25\u0e37\u0e2d ' + item.effective + ' \u0e0a\u0e34\u0e49\u0e19 (\u0e08\u0e2d\u0e07\u0e2d\u0e22\u0e39\u0e48 ' + item.reserved + ') \u0e23\u0e32\u0e04\u0e32\u0e17\u0e38\u0e19 ' + item.cost + ' \u0e1a\u0e32\u0e17\n';
    }
    prompt += '\n\u0e15\u0e2d\u0e1a JSON \u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19:\n';
    prompt += '{\n  "summary": "\u0e2a\u0e23\u0e38\u0e1b\u0e2a\u0e31\u0e49\u0e19\u0e46 \u0e2a\u0e16\u0e32\u0e19\u0e30\u0e2a\u0e15\u0e47\u0e2d\u0e01",\n  "suggested_orders": [{"code":"\u0e23\u0e2b\u0e31\u0e2a","name":"\u0e0a\u0e37\u0e48\u0e2d","order_qty":\u0e08\u0e33\u0e19\u0e27\u0e19,"est_cost":\u0e23\u0e32\u0e04\u0e32}],\n  "total_est_cost": \u0e23\u0e32\u0e04\u0e32\u0e23\u0e27\u0e21\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14,\n  "priority": "\u0e2a\u0e39\u0e07/\u0e01\u0e25\u0e32\u0e07/\u0e15\u0e48\u0e33"\n}\n';
    prompt += '\n\u0e15\u0e2d\u0e1a JSON \u0e2d\u0e22\u0e48\u0e32\u0e07\u0e40\u0e14\u0e35\u0e22\u0e27 \u0e44\u0e21\u0e48\u0e21\u0e35\u0e02\u0e49\u0e2d\u0e04\u0e27\u0e32\u0e21\u0e2d\u0e37\u0e48\u0e19:';

    var bodyObj = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
    };

    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
    var options = {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify(bodyObj), muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    var result = JSON.parse(response.getContentText());

    if (result.error) return { error: 'Gemini Error: ' + JSON.stringify(result.error) };

    var content = '';
    if (result.candidates && result.candidates[0] && result.candidates[0].content &&
        result.candidates[0].content.parts) {
      content = result.candidates[0].content.parts[0].text || '';
    }

    var jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      var parsed = JSON.parse(jsonMatch[0]);
      parsed.provider = 'gemini-2.0-flash';
      parsed.raw_items = lowItems;

      var msg = '\ud83d\udce6 ' + (parsed.summary || '\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e2a\u0e31\u0e48\u0e07\u0e0b\u0e37\u0e49\u0e2d\u0e41\u0e19\u0e30\u0e19\u0e33') + '\n\n';
      msg += '\ud83d\udd0d Priority: ' + (parsed.priority || '-') + '\n';
      if (parsed.suggested_orders && parsed.suggested_orders.length > 0) {
        msg += '\n\ud83d\uded2 \u0e04\u0e33\u0e2a\u0e31\u0e48\u0e07\u0e0b\u0e37\u0e49\u0e2d\u0e41\u0e19\u0e30\u0e19\u0e33:\n';
        for (var j = 0; j < parsed.suggested_orders.length; j++) {
          var so = parsed.suggested_orders[j];
          msg += '\u2022 ' + so.name + ' (' + so.code + ') \u2014 \u0e2a\u0e31\u0e48\u0e07 ' + so.order_qty + ' \u0e0a\u0e34\u0e49\u0e19 \u2248 ' + (so.est_cost || 0).toLocaleString() + ' \u0e1a\u0e32\u0e17\n';
        }
      }
      if (parsed.total_est_cost) {
        msg += '\n\ud83d\udcb0 \u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13\u0e01\u0e32\u0e23\u0e23\u0e27\u0e21: ' + parsed.total_est_cost.toLocaleString() + ' \u0e1a\u0e32\u0e17';
      }

      sendLineNotify({ message: msg, room: 'PROCUREMENT' });
      sendLineNotify({ message: msg, room: 'EXECUTIVE' });
      return { success: true, ai: parsed, message: msg };
    }

    var msg2 = _buildReorderMessage(lowItems);
    sendLineNotify({ message: msg2, room: 'PROCUREMENT' });
    return { success: true, message: msg2, items: lowItems };
  } catch(e) {
    var m2 = _buildReorderMessage(lowItems);
    sendLineNotify({ message: m2, room: 'PROCUREMENT' });
    return { success: true, message: m2, items: lowItems };
  }
}

function _buildReorderMessage(lowItems) {
  var msg = '\ud83d\udea8 \u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e2a\u0e15\u0e47\u0e2d\u0e01 Comphone\n\n';
  msg += '\u274c \u0e2b\u0e21\u0e14\u0e2a\u0e15\u0e47\u0e2d\u0e01 / \u0e43\u0e01\u0e25\u0e49\u0e2b\u0e21\u0e14:\n';
  for (var i = 0; i < lowItems.length; i++) {
    var item = lowItems[i];
    msg += '  \ud83d\udfe1 ' + item.name + ' (' + item.code + ') \u2014 \u0e40\u0e2b\u0e25\u0e37\u0e2d ' + item.effective + ' \u0e0a\u0e34\u0e49\u0e19';
    if (item.reserved > 0) msg += ' (\u0e08\u0e2d\u0e07 ' + item.reserved + ')';
    msg += '\n';
  }
  msg += '\n\ud83d\uded2 \u0e2a\u0e31\u0e48\u0e07\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e14\u0e48\u0e27\u0e19\u0e04\u0e23\u0e31\u0e1a\u0e04\u0e38\u0e13\u0e42\u0e2b\u0e19\u0e48\u0e07!';
  return msg;
}
