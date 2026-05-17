/**
 * Simon Ives | Strategic Briefing Backend
 *
 * This script acts as a bespoke, serverless API for the Simons-Website-Project.
 * It receives JSON data via POST, appends it to a Google Sheet, and returns
 * a clean JSON response to the static frontend.
 *
 * Architecture: Google Apps Script (Headless API)
 */

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(10000); // 10 second timeout
    
    // Parse the incoming JSON payload
    const data = JSON.parse(e.postData.contents);
    
    // Append the data to the spreadsheet
    // Columns: Timestamp, Name, Email, Headcount, Technology, Challenge
    sheet.appendRow([
      new Date(),
      data.name,
      data.email,
      data.headcount,
      data.technology,
      data.request
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "success", "message": "Parameters received." }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "error", "error": err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } finally {
    lock.releaseLock();
  }
}

// Enable CORS for the fetch request
function doGet(e) {
  return ContentService
    .createTextOutput("System Active.")
    .setMimeType(ContentService.MimeType.TEXT);
}
