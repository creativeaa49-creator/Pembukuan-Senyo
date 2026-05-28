/**
 * Google Apps Script for Senyo Job Tracking & Monthly Calculator
 * 
 * PETUNJUK DEPLOY (BACA DENGAN TELITI BRAY!):
 * 1. Buka Google Sheets Anda (atau buat Baru).
 * 2. Klik menu "Ekstensi" > "Apps Script".
 * 3. Hapus semua script bawaan yang ada di editor tersebut.
 * 4. Paste semua kode di bawah ini ke editor.
 * 5. Klik tombol Simpan (ikon Floppy Disk).
 * 6. Klik tombol "Terapkan" > "Penerapan Baru" (Deploy > New deployment).
 * 7. Pilih Jenis Penerapan: "Aplikasi Web" (Web App).
 * 8. Isi deskripsi terserah Anda (contoh: "Senyo DB Webhook v1").
 * 9. Atur "Jalankan sebagai" (Execute as): "Saya" (Me / email Anda).
 * 10. Atur "Yang memiliki akses" (Who has access): "Siapa saja" (Anyone). 
 *     Penting: Bagian "Siapa saja" (Anyone) wajib dipilih agar device Anda bisa menyimpan data tanpa login Google!
 * 11. Klik "Terapkan" (Deploy). Google akan meminta Izin Akses (Authorize Access), berikan izin sepenuhnya.
 * 12. Salin "URL Aplikasi Web" (Web App URL) yang dihasilkan, lalu tempelkan ke kolom URL di aplikasi Senyo.
 */

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    var events = [];
    
    if (lastRow > 1) {
      // Ambil seluruh data dari baris ke-2 hingga baris terakhir dengan lebar 8 Kolom
      var range = sheet.getRange(2, 1, lastRow - 1, 8);
      var values = range.getValues();
      
      for (var i = 0; i < values.length; i++) {
        var row = values[i];
        if (!row[0]) continue; // Lewati jika ID Kerja kosong
        
        // Parsing Tanggal Main dengan sangat kokoh bray! (Mendukung Date object maupun String beraneka format)
        var dateVal = row[1];
        var finalDateStr = "";
        var year = new Date().getFullYear();
        var month = new Date().getMonth() + 1;
        var day = new Date().getDate();

        if (dateVal instanceof Date) {
          year = dateVal.getFullYear();
          month = dateVal.getMonth() + 1;
          day = dateVal.getDate();
          finalDateStr = year + "-" + ("0" + month).slice(-2) + "-" + ("0" + day).slice(-2);
        } else {
          var dateString = String(dateVal || "").trim();
          dateString = dateString.replace(/\//g, "-");
          var parts = dateString.split("-");
          
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              // Format YYYY-MM-DD
              year = parseInt(parts[0]) || year;
              month = parseInt(parts[1]) || month;
              day = parseInt(parts[2]) || day;
            } else if (parts[2].length === 4) {
              // Format DD-MM-YYYY
              day = parseInt(parts[0]) || day;
              month = parseInt(parts[1]) || month;
              year = parseInt(parts[2]) || year;
            } else {
              // Percobaan parsing tanggal standar
              var dObj = new Date(dateString);
              if (dObj && !isNaN(dObj.getTime())) {
                year = dObj.getFullYear();
                month = dObj.getMonth() + 1;
                day = dObj.getDate();
              }
            }
          } else {
            var dObj = new Date(dateString);
            if (dObj && !isNaN(dObj.getTime())) {
              year = dObj.getFullYear();
              month = dObj.getMonth() + 1;
              day = dObj.getDate();
            }
          }
          finalDateStr = year + "-" + ("0" + month).slice(-2) + "-" + ("0" + day).slice(-2);
        }
        
        // Parsing data Team/Kru dari kolom ke-6
        var teamStr = String(row[5] || "");
        var teamArr = [];
        if (teamStr && teamStr !== "Mandiri" && teamStr !== "Mandiri (tidak ada tim)") {
          teamArr = teamStr.split(",").map(function(t) { return t.trim(); });
        }
        
        events.push({
          id: String(row[0] || ""),
          date: finalDateStr,
          day: day,
          month: month,
          year: year,
          eventName: String(row[3] || ""),
          location: String(row[4] || ""),
          team: teamArr,
          notes: String(row[6] || ""),
          status: "Selesai",
          createdAt: new Date().toISOString()
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      events: events
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Membuat Header otomatis bila lembar kerja masih kosong/baru
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "ID Kerja",
        "Tanggal Main",
        "Bulan/Tahun",
        "Nama Event/Pekerjaan",
        "Klien / Perusahaan / Lokasi",
        "Kru/Partner Kerja",
        "Catatan Pekerjaan",
        "Waktu Sinkronisasi (WIB)"
      ]);
      
      // Kasih style warna pink khas Senyo biar tampil estetik bray!
      var headerRange = sheet.getRange(1, 1, 1, 8);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#ec4899"); // Merah Muda/Pink
      headerRange.setFontColor("#ffffff");
      headerRange.setHorizontalAlignment("center");
    }
    
    // Tambah atau perbarui data laporan pekerjaan
    if (data.events && Array.isArray(data.events)) {
      data.events.forEach(function(ev) {
        var idToFind = ev.id;
        var existingRowIndex = -1;
        
        if (sheet.getLastRow() > 1) {
          var ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
          for (var r = 0; r < ids.length; r++) {
            if (String(ids[r][0]) === String(idToFind)) {
              existingRowIndex = r + 2; // Offset baris (Header baris ke-1 + index 0-based ke 1-based)
              break;
            }
          }
        }
        
        var rowData = [
          ev.id,
          ev.date,
          ev.month + "/" + ev.year,
          ev.eventName,
          ev.location || "Pekerjaan Pribadi",
          ev.team && ev.team.length ? ev.team.join(", ") : "Mandiri",
          ev.notes || "",
          new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
        ];
        
        if (existingRowIndex !== -1) {
          // Update baris lama jika ID Kerja sudah terdaftar
          var rowRange = sheet.getRange(existingRowIndex, 1, 1, 8);
          rowRange.setValues([rowData]);
        } else {
          // Tambah baris baru jika ID Kerja belum ada
          sheet.appendRow(rowData);
        }
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: data.events.length + " data sukses disinkronkan ke Google Sheets Cloud!"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
