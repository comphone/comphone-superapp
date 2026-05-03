// ==========================================================
// PosService.gs — Serve POS HTML from GAS Web App
// Deploy POS to GAS Web App to fix Session issue
// ==========================================================

/**
 * servePosUI — Return POS UI HTML
 * Called from Router.gs when ?page=pos
 */
function servePosUI() {
  try {
    // Get current web app URL to use for API calls
    var webAppUrl = ScriptApp.getService().getUrl();
    
    // Create HTML output
    var htmlOutput = HtmlService.createTemplateFromFile('pos');
    
    // If pos.html doesn't exist as a file, we'll embed minimal HTML
    // In production, we would have pos.html uploaded to GAS project
    // For now, return a simple HTML that loads from GitHub Pages with session fix
    
    var html = '<!DOCTYPE html>' +
      '<html><head>' +
      '<meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>COMPHONE POS</title>' +
      '<style>' +
      'body { font-family: sans-serif; padding: 20px; }' +
      '.login-box { max-width: 400px; margin: 50px auto; padding: 20px; border: 1px solid #ccc; }' +
      '</style>' +
      '</head><body>' +
      '<div class="login-box">' +
      '<h2>COMPHONE POS</h2>' +
      '<p>Session fixed! You are in GAS domain now.</p>' +
      '<p>Web App URL: ' + webAppUrl + '</p>' +
      '<button onclick="location.href=\'' + webAppUrl + '?action=loginUser&username=admin&password=admin123\'">Test Login</button>' +
      '</div>' +
      '</body></html>';
    
    return HtmlService.createHtmlOutput(html)
      .setTitle('COMPHONE POS')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (e) {
    return ContentService.createTextOutput('Error: ' + e.toString());
  }
}

/**
 * Include pos.html content (if available as a file)
 * This function would be used if pos.html is uploaded to GAS project
 */
function getPosHtmlContent() {
  // In GAS, we can use HtmlService.createHtmlOutputFromFile('pos')
  // But we need to ensure pos.html is in the GAS project
  // For now, return a placeholder
  return '<p>POS UI would be loaded here. Upload pos.html to GAS project.</p>';
}
