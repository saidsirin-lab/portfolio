/**
 * ALEPHIC LABS — Form Submission Handler (Google Apps Script)
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com and sign in with your contact@alephiclabs.com account
 * 2. Click "New project"
 * 3. Delete the default code and paste this entire file
 * 4. Click the project name ("Untitled project") and rename it to "Alephic Labs Forms"
 * 5. Click "Deploy" → "New deployment"
 * 6. Click the gear icon next to "Select type" → choose "Web app"
 * 7. Set:
 *    - Description: "Form handler"
 *    - Execute as: "Me (contact@alephiclabs.com)"
 *    - Who has access: "Anyone"
 * 8. Click "Deploy"
 * 9. Click "Authorize access" → choose your account → Allow
 * 10. Copy the Web app URL (looks like: https://script.google.com/macros/s/XXXXX/exec)
 * 11. Paste that URL into your website's js/main.js file where it says APPS_SCRIPT_URL
 *
 * That's it! All form submissions will now:
 *   - Send an email to contact@alephiclabs.com
 *   - Log to a Google Sheet called "Alephic Labs - Submissions"
 */

const EMAIL_TO = 'contact@alephiclabs.com';
const SHEET_NAME = 'Alephic Labs - Submissions';

function saveResumeToDrive(base64Data, filename) {
  try {
    const parts    = base64Data.split(',');
    const mimeType = parts[0].split(';')[0].split(':')[1];
    const decoded  = Utilities.newBlob(Utilities.base64Decode(parts[1]), mimeType, filename);

    const folderName = 'Alephic Labs - AI Lab Resumes';
    const folders = DriveApp.getFoldersByName(folderName);
    const folder  = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

    const file = folder.createFile(decoded);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    return 'Error saving resume: ' + err.toString();
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const formType = data._formType || 'unknown';
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

    // Handle resume file upload — convert base64 to a Drive file and store the link
    if (data.resume_file && data.resume_file.indexOf('data:') === 0) {
      const filename = data.resume_filename || 'resume.pdf';
      data.resume_file = saveResumeToDrive(data.resume_file, filename);
    }
    delete data.resume_filename; // clean up helper field

    // Log to Google Sheet
    logToSheet(formType, timestamp, data);

    // Send email notification
    sendEmailNotification(formType, timestamp, data);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', message: 'Submission received' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Alephic Labs form endpoint is active.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function logToSheet(formType, timestamp, data) {
  let ss;
  try {
    const files = DriveApp.getFilesByName(SHEET_NAME);
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create(SHEET_NAME);
    }
  } catch (err) {
    ss = SpreadsheetApp.create(SHEET_NAME);
  }

  // Get or create sheet tab for this form type
  let sheet = ss.getSheetByName(formType);
  if (!sheet) {
    sheet = ss.insertSheet(formType);
    // Add headers based on form type
    const headers = getHeadersForForm(formType, data);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // Build row from data
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(function(header) {
    if (header === 'Timestamp') return timestamp;
    if (header === 'Form Type') return formType;
    const key = headerToKey(header);
    const value = data[key];
    if (Array.isArray(value)) return value.join(', ');
    return value || '';
  });

  sheet.appendRow(row);
}

function getHeadersForForm(formType, data) {
  const headers = ['Timestamp', 'Form Type'];
  const skipKeys = ['_formType'];

  Object.keys(data).forEach(function(key) {
    if (skipKeys.indexOf(key) === -1) {
      headers.push(keyToHeader(key));
    }
  });

  return headers;
}

function keyToHeader(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\b\w/g, function(c) { return c.toUpperCase(); })
    .trim();
}

function headerToKey(header) {
  return header
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function sendEmailNotification(formType, timestamp, data) {
  const formLabels = {
    'agency-application': 'Agency Project Application',
    'growlytics-early-access': 'Growlytics AI Early Access Request',
    'contact': 'Contact Form Message'
  };

  const subject = '[Alephic Labs] New ' + (formLabels[formType] || 'Form Submission');

  let body = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">';
  body += '<div style="background:#0a0a1f;padding:24px 32px;border-radius:12px 12px 0 0;">';
  body += '<h1 style="color:#00d4ff;margin:0;font-size:20px;">Alephic Labs</h1>';
  body += '</div>';
  body += '<div style="background:#f8fafc;padding:32px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px;">';
  body += '<h2 style="color:#1e293b;margin:0 0 8px;">' + (formLabels[formType] || 'New Submission') + '</h2>';
  body += '<p style="color:#64748b;margin:0 0 24px;font-size:14px;">Received: ' + timestamp + '</p>';

  const skipKeys = ['_formType'];
  Object.keys(data).forEach(function(key) {
    if (skipKeys.indexOf(key) === -1) {
      const value = Array.isArray(data[key]) ? data[key].join(', ') : data[key];
      if (value) {
        body += '<div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #e2e8f0;">';
        body += '<div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">' + keyToHeader(key) + '</div>';
        body += '<div style="font-size:15px;color:#1e293b;">' + escapeHtml(String(value)) + '</div>';
        body += '</div>';
      }
    }
  });

  body += '</div></div>';

  GmailApp.sendEmail(EMAIL_TO, subject, 'New form submission from Alephic Labs website. View in HTML-enabled email client.', {
    htmlBody: body,
    name: 'Alephic Labs Website'
  });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
