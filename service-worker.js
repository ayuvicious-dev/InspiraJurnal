// Integrida Service Worker
// Caching dasar untuk shell aplikasi agar dapat dibuka ulang saat offline
// (data laporan keuangan tetap membutuhkan koneksi ke Firebase).

// v2: seluruh CSS & JS aplikasi sudah digabung ke dalam index.html,
// jadi app shell yang perlu di-cache jauh lebih sederhana.
// v3: pembaruan index.html.
// v4: strategi diubah menjadi network-first khusus untuk halaman HTML
//     (navigasi), supaya pembaruan index.html langsung terlihat tanpa
//     perlu menaikkan versi CACHE_NAME setiap kali. Aset statis lain
//     (manifest, ikon) tetap cache-first agar tetap cepat & bisa offline.
// v5: index.html diperbarui (fitur logo perusahaan) — cache lama tetap
//     tergantikan otomatis lewat strategi network-first di atas, tapi
//     versi dinaikkan sebagai penanda revisi.
// v6: index.html diperbarui (baris Ekuitas "Pendapatan Periode Ini" &
//     "Pendapatan s.d. Tahun Lalu" pada Neraca, supaya Total Aset
//     balance dengan Total Kewajiban + Total Ekuitas).
// v7: index.html diperbarui (ringkasan Total Aktiva vs Total Pasiva +
//     indikator Balance/Belum Balance pada tampilan Neraca).
// v8: index.html diperbarui (susunan baris Laba Rugi di Detail
//     Perusahaan disamakan urutannya dengan Pratinjau Impor: Pendapatan
//     → HPP → Laba Kotor → Beban Operasional → Laba Operasional →
//     Pendapatan Lainnya → Beban Lainnya → Beban Pajak → Laba Bersih).
// v9: index.html diperbarui (ringkasan Total Aktiva/Pasiva & indikator
//     Balance dihapus dari Pratinjau Impor Buku Besar — pratinjau belum
//     memasukkan Pendapatan Periode Ini/s.d. Tahun Lalu sehingga selalu
//     tampak "Belum Balance"; indikator tetap ada di Neraca pada fitur
//     Detail Perusahaan yang sudah memasukkan kedua komponen tersebut).
// v10: index.html diperbarui (jenis impor "Neraca" & "Laba Rugi"
//      dihapus dari halaman Impor Data — keduanya sudah otomatis
//      diturunkan dari impor Buku Besar. Jenis impor yang tersisa:
//      Arus Kas & Buku Besar).
// v11: index.html diperbarui — impor Buku Besar kini juga menurunkan
//      Laporan Arus Kas Metode Langsung secara otomatis dari transaksi
//      akun Kas & Setara Kas (dikelompokkan ke Aktivitas Operasi/
//      Investasi/Pendanaan berdasarkan kata kunci pada Keterangan),
//      ditampilkan di Pratinjau Impor & Detail Perusahaan.
// v12: index.html diperbarui (baris Kas Bersih dari Aktivitas Operasi/
//      Investasi/Pendanaan & Kas & Setara Kas Akhir Periode pada Arus
//      Kas kini diberi highlight hijau seperti subtotal pada Neraca,
//      berlaku di Detail Perusahaan maupun Pratinjau Impor Buku Besar).
// v13: index.html diperbarui — impor Buku Besar kini juga menurunkan
//      Laporan Perubahan Modal secara otomatis (mutasi akun Ekuitas
//      direkonsiliasi dengan Setoran Modal Pemilik & Penarikan Modal
//      Pemilik/Dividen dari Arus Kas, ditambah Laba Bersih periode
//      berjalan), ditampilkan di Pratinjau Impor & Detail Perusahaan.
// v14: index.html diperbarui — di Detail Perusahaan, kartu Arus Kas &
//      Perubahan Modal kini sejajar berdampingan (grid 2 kolom, sama
//      seperti Neraca & Laba Rugi), bukan lagi ditumpuk penuh lebar.
// v15: index.html diperbarui — jenis impor manual "Arus Kas" dihapus
//      dari halaman Impor Data (Neraca, Laba Rugi, Arus Kas, & Perubahan
//      Modal semuanya sudah diturunkan otomatis dari impor Buku Besar).
//      Jenis impor yang tersisa hanya Buku Besar; langkah "Pilih Jenis
//      Data" pada Impor Data ikut dihapus karena tidak relevan lagi.
// v16: index.html diperbarui — tampilan menu Perusahaan (tab "Tabel")
//      diganti jadi grid kartu ala folder (3 kartu per baris) yang cuma
//      menampilkan logo & nama perusahaan; kode, klasifikasi, induk
//      perusahaan, jumlah periode tersimpan, dan tombol hapus perusahaan
//      dipindahkan ke kartu "Informasi Bisnis" pada halaman Detail
//      Perusahaan (terbuka saat kartu grid diklik).
// v17: index.html diperbarui — kop/judul laporan (nama perusahaan, nama
//      laporan, "Per .../Untuk Periode ...", "(dalam IDR)") ditambahkan
//      di atas tabel Neraca, Laba Rugi, Arus Kas, dan Perubahan Modal
//      pada halaman Detail Perusahaan.
// v18: index.html diperbarui — kop/judul laporan (Neraca, Laba Rugi,
//      Arus Kas, Perubahan Modal) diratakan ke tengah (rata tengah),
//      bukan rata kiri.
// v19: index.html diperbarui — kop laporan Laba Rugi, Arus Kas, &
//      Perubahan Modal kini menampilkan rentang tanggal periode
//      (mis. "01/08/2026 - 31/08/2026"), dihitung otomatis dari
//      year/periodType/periodIndex, menggantikan baris "Untuk Periode
//      ...". Kop Neraca tidak berubah (tetap "Per [label periode]").
// v20: index.html diperbarui — tabel Riwayat Impor (Detail Perusahaan)
//      kini punya kolom "Verifikasi": checkbox per periode yang saat
//      dicentang menandai laporan periode itu "Terverifikasi" (field
//      `verified` pada dokumen statement) dan menampilkan badge hijau
//      "✓ Terverifikasi" di sebelah nama periode.
// v21: index.html diperbarui — perbaikan bug: hasil impor Buku Besar
//      (bukuBesar, Neraca, Laba Rugi, Arus Kas, Perubahan Modal) kini
//      disimpan dalam SATU kali write Firestore (DB.saveStatementSections)
//      alih-alih 5 write terpisah berurutan, supaya tidak ada lagi
//      kondisi "tersimpan sebagian" (mis. Buku Besar tersimpan tapi
//      4 laporan turunannya tidak) saat terjadi gangguan koneksi di
//      tengah proses simpan. confirmImport() juga kini menampilkan
//      pesan error yang jelas via toast jika penyimpanan gagal, alih-
//      alih gagal diam-diam.
// v22: index.html diperbarui — perbaikan bug lanjutan: rincian mentah
//      Buku Besar (per transaksi) ternyata bisa melebihi batas ukuran
//      1 dokumen Firestore (1.048.576 byte) untuk perusahaan dengan
//      banyak transaksi (mis. impor tahunan), menyebabkan penyimpanan
//      gagal dengan pesan "...exceeds the maximum allowed size...".
//      Sekarang Buku Besar disimpan TERPISAH dari dokumen statement, di
//      subcollection `ledgerChunks`, dipecah otomatis jadi beberapa
//      dokumen kecil (dan bila perlu, satu akun dengan transaksi sangat
//      banyak ikut dipecah) — masing-masing jauh di bawah batas
//      tersebut, lalu disatukan kembali otomatis saat dibutuhkan
//      (rincian klik-baris di Detail Perusahaan dimuat sesuai
//      kebutuhan/lazy). Dokumen statement sendiri jadi jauh lebih kecil
//      (hanya berisi Neraca/Laba Rugi/Arus Kas/Perubahan Modal yang
//      memang selalu ringkas), sekaligus mempercepat sinkronisasi
//      realtime lintas perangkat.
// v23: index.html diperbarui — kolom "Verifikasi" (checkbox tandai-valid
//      manual per periode) pada tabel Riwayat Impor (Detail Perusahaan)
//      diganti jadi kolom "Persentase Sinkron": progress bar + persentase
//      otomatis dari checkbox "Sinkron" yang sudah dicentang di baris-baris
//      rincian Neraca, Laba Rugi, Arus Kas, & Perubahan Modal pada kartu di
//      atasnya (bukan lagi status tunggal yang ditandai manual per periode).
// v24: index.html diperbarui — grid kartu Perusahaan (halaman Perusahaan)
//      kini menampilkan progress bar persentase impor per perusahaan:
//      dari periode pertama yang pernah diimpor perusahaan itu sampai
//      periode terakhir yang seharusnya sudah selesai per hari ini (mis.
//      hari ini Agustus -> periode bulanan terakhir yang dicek = Juli),
//      berapa persen periode di rentang itu yang datanya sudah ada. 100%
//      berarti tidak ada periode yang tertunggak/bolong.
// v25: index.html diperbarui — persentase pada progress bar kartu grid
//      Perusahaan (halaman Utama/Perusahaan) diganti dari "kelengkapan
//      periode" menjadi "Persentase Sinkron" yang SAMA PERSIS dengan
//      kolom Persentase Sinkron di tabel Riwayat Impor (Detail
//      Perusahaan): checkbox "Sinkron" yang tercentang pada seluruh
//      baris Neraca/Laba Rugi/Arus Kas/Perubahan Modal, dijumlahkan dari
//      SELURUH periode perusahaan tsb (companySyncProgress(), memakai
//      ulang statementSyncProgress() per periode). Kartu kini menampilkan
//      "Memuat…" sesaat saat rincian Buku Besar sebagian periode masih
//      diambil dari server, lalu otomatis ter-update begitu selesai.
// v26: index.html diperbarui — label persentase pada kartu grid
//      Perusahaan kini menyertakan tahun periode yang dihitung, mis.
//      "1/58 tersinkron (2023–2026)" atau "(2026)" kalau hanya satu
//      tahun, supaya jelas rentang periode mana yang diwakili angka itu
//      (companySyncProgress() kini juga mengembalikan yearFrom/yearTo).
// v27: index.html diperbarui — checkbox "Sinkron" per baris (Neraca,
//      Laba Rugi, Arus Kas, Perubahan Modal) di Detail Perusahaan
//      sebelumnya TIDAK menyembunyikan barisnya sendiri secara otomatis
//      saat dicentang. Sekarang ditambahkan toggle manual "Sembunyikan
//      baris yang sudah sinkron" di atas kartu Laporan Keuangan — saat
//      diaktifkan, baris yang checkbox Sinkron-nya sudah dicentang akan
//      disembunyikan (bisa dinyalakan/dimatikan kapan saja sesuai
//      kebutuhan), tanpa mengubah perilaku checkbox itu sendiri.
// v28: index.html diperbarui — toggle manual "Sembunyikan baris yang
//      sudah sinkron" dari v27 DIHAPUS (bukan itu yang dimaksud). Baris
//      Neraca/Laba Rugi/Arus Kas/Perubahan Modal kini kembali seperti
//      semula: mencentang "Sinkron" tidak menyembunyikan barisnya sama
//      sekali — baris tetap tampil apa adanya di dalam kategorinya
//      (mis. "Kas Setara Kas"), dan mekanisme "sembunyikan manual" yang
//      dimaksud memang sudah ada secara alami lewat collapse/expand
//      kategori (klik judul kategori seperti "Kas Setara Kas" untuk
//      menutup/membuka daftar akun di dalamnya).
// v29: index.html diperbarui — perbaikan akar masalah baris "hilang"
//      saat checkbox "Sinkron" dicentang: setiap perubahan syncFlags
//      tersimpan ke server, listener realtime (watchStatements) langsung
//      memicu render ulang SELURUH Detail Perusahaan, dan render ulang
//      itu mengembalikan semua panel kategori (<details>, mis. "Kas
//      Setara Kas") ke keadaan tertutup (bawaan HTML) — sehingga
//      kategori yang baru saja dibuka pengguna terlihat langsung
//      tertutup/"hilang" lagi walau baris di dalamnya sebenarnya tidak
//      pernah disembunyikan. Sekarang paintCompanyDetail() mengingat
//      kategori mana saja yang sedang terbuka sebelum render ulang
//      (lewat atribut data-details-key baru pada tiap <details>) dan
//      membuka kembali otomatis setelah HTML baru terpasang.
// v30: index.html diperbarui — perbaikan STRUKTURAL pada cara Laporan
//      Arus Kas Metode Langsung diturunkan dari Buku Besar. Sebelumnya
//      (v11-v29) kategori Arus Kas (Operasi/Investasi/Pendanaan) ditebak
//      dari KATA KUNCI pada kolom Keterangan transaksi akun Kas & Setara
//      Kas (mis. kata "peralatan" -> dianggap Investasi) — pendekatan ini
//      bisa salah tebak (mis. kata yang mirip tapi beda makna akuntansi)
//      sehingga hasilnya bisa beda dari Laporan Arus Kas asli software
//      akuntansi sumber Buku Besar. Sekarang Arus Kas dihitung dari
//      MUTASI (Saldo Akhir - Saldo Awal) tiap akun SELAIN Kas & Setara
//      Kas, dengan tanda sesuai posisi normalnya (Aset & Beban dibalik
//      tandanya, Kewajiban/Ekuitas/Pendapatan dipakai apa adanya) —
//      memakai identitas akuntansi dasar (Total Debit = Total Kredit)
//      yang membuat hasilnya SELALU balance persis tanpa sisa, dan cocok
//      1:1 dengan Laporan Arus Kas asli software akuntansi sumber Buku
//      Besar (diverifikasi manual). Tidak ada perubahan pada format file
//      Buku Besar yang diimpor — data yang sudah ada (Saldo Awal & Saldo
//      Akhir per akun) sudah cukup.
// v31: index.html diperbarui — HANYA menaikkan versi build (ditandai
//      "Build v31" di sidebar) untuk memudahkan verifikasi bahwa
//      browser sudah memuat kode terbaru, bukan versi lama yang masih
//      ter-cache. TIDAK ADA perubahan logika arus kas: skema mutasi
//      Saldo Awal→Saldo Akhir per akun dari v30 sudah diverifikasi
//      cocok 1:1 dengan Laporan Arus Kas asli software akuntansi
//      (termasuk kasus akun "Hutang PT. Kamil Tria Niaga" yang berisi
//      transaksi berketerangan "Pembuatan merk mesin" — akun ini tetap
//      dihitung sebagai Kewajiban Jangka Pendek/Aktivitas Operasi,
//      bukan Aset Tetap/Investasi, karena klasifikasinya berdasarkan
//      kode+nama AKUN, bukan kata kunci pada Keterangan transaksi).
//      Jika hasil di aplikasi masih menunjukkan "Pembelian Aset Tetap"
//      untuk transaksi ini setelah update ke v31, itu tandanya browser
//      masih memuat versi lama — cek label "Build v31" di sidebar untuk
//      memastikan versi sudah ter-update.
// v32: index.html diperbarui — menambahkan fitur Light Mode / Dark Mode
//      (toggle "Mode Gelap"/"Mode Terang" di sidebar, preferensi
//      tersimpan di localStorage, mengikuti preferensi sistem jika belum
//      pernah diatur). Warna sidebar kini ikut menyesuaikan tema: navy
//      brand di light mode (seperti sebelumnya), dan nuansa gelap yang
//      senada dengan latar aplikasi di dark mode — bukan lagi warna
//      navy terang yang sama persis di kedua mode.
// v33: index.html diperbarui — tombol toggle tema dipindah dari sidebar
//      ke topbar (kini ikon bundar di sebelah kiri badge "Tersinkron"),
//      dan warna sidebar di LIGHT MODE diubah dari navy gelap menjadi
//      putih/terang senada dengan latar aplikasi (teks & ikon jadi gelap,
//      item aktif memakai tint teal muda), sementara sidebar di DARK MODE
//      tetap gelap senada dengan latar gelap seperti pada v32.
// v34: index.html diperbarui — sidebar kini bisa dibuka di layar sempit
//      (mis. mode "split view" di tablet/HP). Sebelumnya CSS drawer
//      sidebar untuk layar <=900px sudah ada tapi TIDAK ADA tombol untuk
//      membukanya, sehingga sidebar sama sekali tidak terlihat/tidak
//      terjangkau. Sekarang ditambahkan: tombol hamburger (☰) di topbar
//      (kiri judul halaman, hanya tampil di layar sempit), sidebar
//      tampil sebagai drawer di atas konten saat tombol diklik, beserta
//      backdrop gelap yang bisa diklik untuk menutup, dan drawer otomatis
//      tertutup begitu satu menu navigasi dipilih.
// v35: index.html diperbarui — perbaikan bug tombol hamburger (menu
//      sidebar mobile) dari v34 yang TIDAK MUNCUL sama sekali. Penyebab:
//      aturan CSS dasar ".menu-toggle-btn{display:none;...}" tertulis
//      SETELAH aturan "@media(max-width:900px){.menu-toggle-btn{display:
//      flex;}}" di dalam stylesheet — karena spesifisitas kedua aturan
//      sama, urutan penulisan yang menentukan pemenang, sehingga aturan
//      dasar (belakangan) selalu menimpa aturan responsif (duluan),
//      membuat tombol selalu tersembunyi walau layar sempit/mode split.
//      Sekarang urutannya dibalik (aturan dasar duluan, override
//      responsif belakangan) sehingga tombol benar-benar tampil di
//      layar <=900px seperti seharusnya.
// v36: index.html diperbarui — tampilan "Pending Reminder" (menu Kalender)
//      diubah dari daftar kartu menjadi tabel (memakai .table-wrap/<table>
//      yang sama dengan tabel lain di aplikasi), dengan pengingat berlabel
//      Prioritas dikelompokkan di baris atas dan pengingat Standar di baris
//      bawah, masing-masing didahului baris judul grup. Tampilan daftar
//      pengingat per-tanggal (bukan Pending) tidak berubah, tetap kartu.
// v37: index.html diperbarui — kalender (menu Kalender) kini membedakan
//      warna latar sel tanggal: Sabtu memakai hijau pastel (--success-light),
//      sementara Minggu, cuti bersama, & hari libur nasional (daftar SKB 3
//      Menteri 2026 baru ditambahkan sebagai ID_HOLIDAYS_2026, perlu
//      diperbarui manual tiap tahun) memakai merah pastel (--danger-light);
//      hari libur juga menampilkan nama liburnya lewat tooltip saat kursor
//      diarahkan ke sel tanggal. Selain itu, posisi nomor tanggal dalam sel
//      dipindah dari tengah kotak ke bagian atas-tengah kotak.
// v38: index.html diperbarui — checkbox "Pending" pada modal "Tambah
//      Pengingat" sekarang SELALU default tidak tercentang (sebelumnya
//      otomatis tercentang kalau tombol "+" diklik saat sedang berada di
//      tab Pending Reminder), karena tidak semua pengingat baru dimaksudkan
//      masuk Pending Reminder — pengguna tetap bisa mencentangnya manual
//      bila memang perlu.
// v39: index.html diperbarui — baris nama hari (SEN/SEL/RAB/.../MIN) di
//      atas grid Kalender sekarang position:sticky (menempel tepat di
//      bawah topbar, top:62px, dengan latar belakang solid) supaya tetap
//      terlihat saat halaman di-scroll ke bawah — sebelumnya baris ini
//      ikut tergulung ke atas layar sehingga sulit tahu tanggal yang
//      sedang dilihat jatuh pada hari apa.
// v40: index.html diperbarui — sel tanggal bulan sebelumnya/berikutnya
//      (pengisi awal/akhir grid Kalender) tidak lagi menampilkan nomor
//      tanggalnya sama sekali (sebelumnya nomor tetap tampil, hanya
//      dibuat transparan/pudar lewat opacity). Kotak sel & warna latar
//      (termasuk hijau/merah pastel Sabtu/Minggu/libur) tetap tampil
//      seperti biasa, hanya angkanya yang dihilangkan.
// v41: index.html diperbarui — sel tanggal bulan sebelumnya/berikutnya
//      (pengisi awal/akhir grid Kalender) kini juga tidak lagi punya
//      latar belakang sama sekali (transparan), baik latar abu-abu
//      normal maupun hijau/merah pastel Sabtu/Minggu/libur — sebelumnya
//      (v40) hanya nomor tanggalnya yang dihilangkan tapi latar
//      belakangnya masih tampak pudar (opacity). Border kotak tetap ada.
// v42: index.html diperbarui — modal "Tambah Pengingat"/"Edit Pengingat"
//      kini punya kolom baru "Urutan" (angka, opsional) di sebelah kolom
//      Judul. Angka ini dipakai sebagai urutan tampil pengingat pada
//      rincian jadwal per-tanggal (remindersForDate()): pengingat dengan
//      angka Urutan lebih kecil tampil lebih dulu (yang belum diisi tetap
//      diurutkan berdasarkan jam seperti sebelumnya, dan selalu tampil
//      setelah yang sudah diberi Urutan). Field baru `order` disimpan di
//      dokumen reminder Firestore (null bila kosong).
// v43: index.html diperbarui — posisi kolom "Urutan" & "Judul" pada modal
//      Tambah/Edit Pengingat ditukar: Urutan sekarang di sebelah KIRI,
//      Judul di sebelah kanan (sebelumnya Judul di kiri, Urutan di kanan),
//      keduanya tetap dalam satu deret. Kolom Judul juga diberi
//      min-width:0 supaya tidak lagi berpotensi meluber/membuat baris
//      pecah pada layar sempit.
// v44: index.html diperbarui — perbaikan bug tampilan dari v43: kolom
//      Urutan & Judul pada modal Pengingat masih tampil bertumpuk
//      vertikal (bukan sejajar satu baris) karena div pembungkusnya
//      memakai class "field" yang sudah punya aturan CSS
//      "flex-direction:column", sementara inline style baris tersebut
//      hanya menambahkan "display:flex" tanpa mengganti arahnya —
//      sehingga aturan class tetap menang. Sekarang inline style
//      menambahkan "flex-direction:row" secara eksplisit supaya kedua
//      kolom benar-benar sejajar dalam satu baris.
// v45: index.html diperbarui — perbaikan bug tampilan lanjutan: setelah
//      v44 kolom Urutan & Judul sudah sejajar satu baris, tapi kotak
//      input Judul sendiri masih pendek/tidak melebar penuh, karena input
//      itu adalah anak block biasa dari div pembungkusnya (bukan flex
//      item langsung) sehingga tidak ikut stretch otomatis seperti input
//      pada field lain. Sekarang input Judul diberi width:100% eksplisit
//      supaya melebar penuh mengikuti lebar kolomnya.
// v46: index.html diperbarui — pilihan Ulangi pada Pengingat kini punya
//      opsi baru "Hari Tertentu": saat dipilih, muncul checkbox 7 hari
//      (Sen–Min) untuk memilih hari-hari mana pengingat itu berulang
//      (mis. hanya Senin/Rabu/Jumat — secara efektif ini juga berfungsi
//      sebagai "kecuali hari X" karena hari yang tidak dicentang otomatis
//      dikecualikan). Field baru `customDays` (array angka, konvensi
//      Date.getDay(): 0=Minggu...6=Sabtu) disimpan di dokumen reminder;
//      occursOnDate() & label repeat pada daftar pengingat (mis. "↻ Sen,
//      Rab, Jum") sudah menyesuaikan.
// v47: index.html diperbarui — modal Tambah/Edit Pengingat kini punya
//      checkbox "s.d. tgl lain" di sebelah field Tanggal; saat dicentang,
//      muncul field "s.d. Tanggal" untuk menetapkan rentang tanggal (mis.
//      tgl 1 s.d. tgl 3). Field ini bisa dikombinasikan dengan Ulangi
//      (Harian/Mingguan/Bulanan/Tidak berulang) dan dengan filter opsional
//      "Hanya muncul di hari berikut" (checkbox hari, memakai ulang UI
//      "Hari Tertentu") — contoh: rentang tgl 1-3, diulangi Bulanan,
//      difilter Senin-Jumat, sehingga kalau tgl 1-3 jatuh di Sabtu/Minggu
//      pengingatnya otomatis tidak muncul di hari itu. Field baru `endDate`
//      (string tanggal atau kosong) disimpan di dokumen reminder Firestore;
//      occursOnDate() & repeatDisplayLabel() sudah menyesuaikan untuk
//      menangani rentang tanggal ini pada semua jenis Ulangi.
// v48: index.html diperbarui — tampilan semua input tanggal (Tanggal
//      Berdiri di Info Bisnis, serta Tanggal & "s.d. Tanggal" pada modal
//      Pengingat) sekarang SELALU berformat dd/mm/yyyy, apapun locale
//      browser/OS pengguna (native <input type="date"> sebelumnya ikut
//      locale browser, bisa tampil mm/dd/yyyy di sebagian perangkat).
//      Trik: teks bawaan input disembunyikan lalu ditumpuk teks overlay
//      dd/mm/yyyy (enhanceDateInputs()/formatDateDisplayDDMMYYYY()) —
//      value tersimpan & date picker native tidak berubah sama sekali.
// v49: index.html diperbarui — formatDateID() (dipakai untuk menampilkan
//      Tanggal Berdiri perusahaan di kartu Perusahaan/Detail Perusahaan)
//      diubah dari format tanggal dieja pakai nama bulan (mis. "9
//      Februari 2026") menjadi angka dd/mm/yyyy (mis. "09/02/2026"),
//      supaya seragam dengan format dd/mm/yyyy yang sejak v48 dipakai di
//      seluruh input tanggal & kop laporan keuangan aplikasi ini.
// v50: index.html diperbarui — repeat "Hari Tertentu" pada Ulangi diganti
//      jadi "Bulanan, Hari Tertentu" dan perilakunya diubah total: yang
//      tadinya berulang TIAP MINGGU di hari yang dicentang (tanpa peduli
//      tanggal), sekarang berulang TIAP BULAN pada tanggal yang sama
//      dengan field Tanggal (mengikuti penyesuaian akhir bulan seperti
//      repeat "Bulanan" biasa) DAN hanya benar-benar muncul kalau tanggal
//      itu jatuh di salah satu hari yang dicentang — kalau tidak jatuh di
//      hari tsb pada suatu bulan, pengingat dilewati bulan itu (bukan
//      digeser ke tanggal lain). Opsi "s.d. tgl lain" (rentang tanggal)
//      disembunyikan otomatis saat repeat ini dipilih karena tidak
//      relevan. occursOnDate(), repeatDisplayLabel(), & REPEAT_LABELS
//      sudah disesuaikan; data pengingat lama dengan repeat "custom"
//      otomatis mengikuti perilaku baru ini (tidak ada migrasi data).
// v58: index.html diperbarui — perbaikan bug: pengingat ber-tag
//      "Analisis" (jadwal otomatis, lihat fitur "Reminder Analisis")
//      sebelumnya tidak pernah muncul di grid kalender utama karena
//      remindersForDate()/occursOnDate() tidak tahu soal mekanisme
//      penjadwalan Analisis (reminder.date-nya memang dikosongkan).
//      Sekarang remindersForDate() juga mencocokkan tanggal hasil
//      analysisSlotsForMonth() untuk reminder ber-tag Analisis, jadi
//      ikut tampil di sel tanggal yang bersangkutan seperti pengingat
//      biasa.
// v59: index.html diperbarui — fitur nomor urutan manual ("Urutan")
//      pada pengingat kalender dihapus, diganti drag & drop: tarik-geser
//      pengingat ke atas/bawah di dalam sel tanggal yang sama untuk
//      mengubah urutannya (pola sama seperti drag & drop kartu
//      Perusahaan). Input "Urutan" pada modal Tambah/Edit Pengingat juga
//      dihapus karena sudah digantikan drag ini. Ditambahkan
//      DB.reorderReminders() (batch write field `order`).
// v60: index.html diperbarui — perbaikan perilaku drag & drop urutan
//      pengingat kalender (fitur v59): urutan hasil drag sekarang
//      disimpan PER TANGGAL (reminder.orderOverrides.<dateKeyStr>),
//      bukan menimpa field `order` global dokumen. Efeknya, menggeser
//      urutan pengingat berulang di satu tanggal tidak lagi ikut
//      mengubah urutannya di tanggal-tanggal kemunculan lain.
//      DB.reorderReminders() diganti DB.reorderRemindersForDate().
// v61: index.html diperbarui — tombol bulat merah kecil ditambahkan di
//      pojok kanan atas tiap sel tanggal kalender yang punya pengingat.
//      Diklik akan menyalin ringkasan pengingat tanggal itu ke clipboard
//      sebagai teks "Daily Report" siap-tempel (judul bernomor, dan
//      keterangan multi-baris/bullet ditaruh apa adanya di bawah judul —
//      lihat dailyReportText()).
// v62: index.html diperbarui — perbaikan format "Daily Report" (fitur
//      v61): baris bernomor sekarang JUDUL PENGINGAT TIDAK IKUT
//      DITULIS, langsung berisi keterangan (deskripsi) pengingat itu.
//      Keterangan tetap opsional — kalau kosong, dipakai judul sebagai
//      gantinya supaya baris bernomor tidak kosong.
// v63: index.html diperbarui — tombol copy "Daily Report" (fitur v61)
//      latar bulat merahnya dihapus, sekarang cuma ikon copy polos
//      berwarna merah tanpa background/bayangan.
// v64: index.html diperbarui — fitur "Unduh Agenda PDF" (exportCalendarAgendaPDF)
//      ditulis ulang total: sebelumnya PDF berupa daftar teks memanjang
//      satu blok per tanggal, sekarang digambar sebagai GRID KALENDER 7
//      kolom (Sen–Min, landscape A4) sama persis strukturnya seperti grid
//      kalender di menu Kalender aplikasi — termasuk warna latar sel
//      Sabtu/Minggu-libur nasional/Libur-Cuti-Sakit, sel bulan
//      sebelum/sesudah diredupkan, bingkai teal pada sel hari ini, dan
//      judul tiap pengingat dipotong satu baris dgn "…" (pdfEllipsize())
//      persis seperti CSS .cal-cell-reminder-title. Kalau pengingat dalam
//      1 sel tidak muat, sisanya diringkas "+N lainnya".
// v65: index.html diperbarui — perbaikan tampilan mobile (HP) secara umum:
//      angka besar pada kartu KPI Dashboard (mis. Total Aset, Pendapatan)
//      & angka pada kartu "hero" tren sekarang bisa turun baris
//      (overflow-wrap) alih-alih meluber keluar kartu; padding
//      konten/topbar diperkecil supaya proporsional di layar sempit;
//      kartu "hero" Dashboard (judul + Pendapatan/Laba Bersih) disusun
//      vertikal & simetris di layar <900px alih-alih flex-wrap yang bisa
//      pecah tidak rapi; komposisi donut chart ditumpuk vertikal (bukan
//      berdampingan) di layar sempit; ditambahkan breakpoint khusus HP
//      kecil (<480px) yang memperkecil padding kartu, ukuran angka KPI,
//      dan padding sel tabel supaya tetap proporsional & tidak
//      berantakan.
// v66: index.html diperbarui — mencegah browser mobile (terutama Safari
//      iOS) otomatis zoom in saat sebuah input/select/textarea disentuh:
//      meta viewport ditambah maximum-scale=1.0, user-scalable=no, dan
//      seluruh font-size input form (.field input/select/textarea,
//      input Kepemilikan/Ownership, kolom cari di menu Perbandingan)
//      dinaikkan dari 13-13.5px jadi 16px — di bawah 16px itulah yang
//      memicu auto-zoom bawaan browser saat field difokus/diketik.
// v67: index.html diperbarui — fitur "Reminder Analisis" (modal jadwal di
//      menu Kalender) sekarang menandai pengingat yang GAGAL kebagian
//      tanggal sama sekali bulan berjalan (bukan hilang diam-diam seperti
//      sebelumnya) — biasanya krn tanggal pilihan & seluruh tanggal
//      cadangan bulan itu sudah kejatah hari libur/Libur-Cuti-Sakit, atau
//      keburu dipakai pengingat Analisis lain. analysisSlotsForMonth()
//      sekarang juga mengembalikan unscheduledPriority/unscheduledStandard;
//      ditampilkan sebagai blok "⚠ Tidak terjadwal bulan ini (N)" berlatar
//      merah muda di bawah tabel jadwal tiap tier (Prioritas/Standar),
//      lengkap dgn catatan penyebab & tombol edit/hapus/selesai seperti
//      baris jadwal biasa.
// v68: index.html diperbarui — fitur baru "Ukuran Font" pada menu Setting:
//      segmented control (Kecil/Normal/Besar/Sangat Besar) yang
//      menyimpan preferensi ke localStorage (kunci integrida-font-size)
//      dan menerapkannya lewat CSS `zoom` pada elemen <html> — dipilih
//      krn hampir seluruh ukuran di aplikasi ini pakai satuan px (bukan
//      rem), sehingga `zoom` diperlukan supaya seluruh tata letak ikut
//      menskala, bukan cuma font-size root. Diterapkan sedini mungkin
//      lewat script anti-FOUC kecil di <head> supaya tidak ada
//      "lompatan" ukuran sesaat setelah halaman dimuat.
// v69: index.html diperbarui — perbaikan fitur "Ukuran Font" (v68) di HP:
//      sebelumnya nilai zoom dipasang langsung ke seluruh <html>, yang
//      menyebabkan elemen position:fixed (sidebar, bottom-nav mobile,
//      tombol FAB, overlay modal, toast) ikut ter-zoom dan di sebagian
//      browser mobile (terutama WebKit/Safari) salah dihitung
//      posisinya relatif ke viewport asli — tampak seperti halaman
//      auto-zoom-in & sebagian fitur/tombol terpotong saat dibuka.
//      Sekarang nilai zoom dipasang sbg CSS custom property --app-zoom
//      pada <html>, tapi HANYA dipakai (lewat var()) pada aturan
//      `.main` (topbar + konten tiap halaman, termasuk Dashboard) &
//      `.modal` (isi dialog) — elemen fixed di atas tidak lagi ikut
//      ter-zoom sehingga posisinya tetap stabil di semua ukuran layar.
// v70: index.html diperbarui — menghapus teks keterangan/subjudul di
//      bawah judul topbar tiap halaman (mis. "Ringkasan seluruh
//      perusahaan", "Kelola daftar entitas yang dikonsolidasikan",
//      dst.) supaya topbar lebih ringkas, terutama di HP; juga
//      menghapus paragraf keterangan di kartu "Ukuran Font" pada menu
//      Setting.
// v71: index.html diperbarui — logo Integrida diganti dengan logo baru
//      (monogram "C" + grafik batang, warna navy) di 3 tempat: halaman
//      login, bagian atas sidebar, dan layar "Memuat Integrida…" saat
//      pertama dibuka. Logo diproses jadi CSS mask (background putih
//      pada gambar asli dihapus/transparan) & disimpan sbg CSS custom
//      property --logo-mask-image di :root, dipakai lewat class baru
//      .logo-mark — supaya warnanya bisa diatur per konteks dgn
//      background-color CSS biasa, bukan warna tetap dari file gambar:
//      di sidebar & layar loading warnanya ikut var(--sidebar-text-strong)
//      / var(--text) yang otomatis berganti navy (light mode) atau
//      putih/terang (dark mode); di halaman login dikunci ke navy tetap
//      krn kartu login (.auth-card) memang selalu berlatar putih di
//      kedua tema. Sekalian memperbaiki warna teks nama brand pada
//      kartu login yang sebelumnya ikut var(--text) (bisa nyaris tak
//      terlihat di dark mode di atas kartu putih) — dikunci navy juga.
// v72: ikon PWA (icons/icon-192.png & icons/icon-512.png) diganti dengan
//      logo baru (monogram "C" + grafik batang, putih) di atas latar
//      navy solid (#16213A, senada background_color/theme_color di
//      manifest.json) — latar solid (bukan transparan) sengaja dipakai
//      krn kedua ikon ini juga dipakai sbg ikon "maskable" (Android bisa
//      memotongnya jadi lingkaran/bentuk lain), dengan logo diberi
//      padding aman (safe zone) supaya tidak terpotong. Versi cache
//      dinaikkan supaya ikon lama yang sudah ter-cache di HP yang sudah
//      "Add to Home Screen" ikut tergantikan.
// v73: index.html & manifest.json diperbarui — URL file ikon (icon-192.png,
//      icon-512.png) ditambahi query string "?v=2" khusus supaya favicon
//      tab browser (yang di-cache Chrome secara terpisah & sangat
//      keras kepala, tidak ikut ter-refresh walau Service Worker/cache
//      HTML sudah update) dipaksa dianggap sebagai URL baru dan diambil
//      ulang dari server, tanpa perlu pengguna menghapus data situs.
// v74: index.html diperbarui — judul tab browser (<title>) diperpendek
//      jadi cuma "Integrida" (sebelumnya "Integrida — Konsolidasi
//      Laporan Keuangan").
// v75: index.html diperbarui — perbaikan bug status "selesai" pengingat
//      berulang: sebelumnya field `done` adalah status TUNGGAL per
//      dokumen reminder, sehingga mencentang "selesai" pada satu tanggal
//      kemunculan (sel kalender / jadwal Reminder Analisis) ikut
//      menandai SEMUA kemunculan reminder yang sama di tanggal lain
//      sebagai selesai juga. Sekarang status selesai untuk pengingat
//      yang punya tanggal kemunculan (sel kalender & jadwal Reminder
//      Analisis) disimpan PER TANGGAL di map reminder.doneDates.<tgl>
//      (pola sama seperti orderOverrides) — mencentang di satu tanggal
//      TIDAK lagi mengubah status pengingat lain/kemunculan lain. Field
//      `done` lama tetap dipakai apa adanya khusus untuk Pending
//      Reminder (tanpa tanggal) & Reminder Analisis yang bulan ini gagal
//      kebagian tanggal sama sekali, karena keduanya tidak punya satu
//      tanggal kemunculan pasti.
// v76: index.html diperbarui — perbaikan performa Dashboard (terutama
//      terasa lambat di HP): DB.watchAllStatements (dipakai Dashboard &
//      Perbandingan) sebelumnya memanggil callback SETIAP KALI satu
//      perusahaan (dari listener realtime masing-masing) selesai
//      memuat data — saat pertama dibuka, ini memicu Dashboard
//      di-render ulang TOTAL (termasuk destroy & buat ulang 4 chart
//      Chart.js) berkali-kali berturut-turut sesuai jumlah perusahaan,
//      bukan cuma sekali. Sekarang callback di-debounce 150ms, jadi
//      snapshot awal dari seluruh perusahaan digabung dulu lalu
//      Dashboard cuma di-render SEKALI saat pemuatan awal.
// v82: index.html diperbarui — fitur baru "Hapus tanggal ini saja" pada
//     modal Edit Pengingat (ikon kalender-silang di sebelah tombol
//     Hapus): menghapus SATU kemunculan pengingat berulang/Analisis
//     (khusus tanggal/bulan yang sedang dibuka), tanpa menghapus
//     kemunculan tanggal lain (masa lalu maupun ke depan) ataupun
//     dokumen pengingatnya. Beda dgn tombol "Hapus" (hapus seluruhnya)
//     dan "Hentikan Pengulangan" (hentikan mulai tanggal berikutnya,
//     tanggal ini sendiri tetap muncul). Bisa dibatalkan (tombol
//     berubah jadi "munculkan lagi") kalau sudah pernah dihapus.
//     Disimpan di field baru skipDates (non-Analisis, per tanggal asal)
//     & analisisSkipMonths (Analisis, per bulan) — pastikan Firestore
//     Rules koleksi `reminders` tidak membatasi nama field tertentu.
// v81: index.html diperbarui — perbaikan error "Gagal menyimpan: The
//     client has already been terminated." yang kadang muncul di HP
//     (koneksi Firestore mati krn aplikasi lama di-background): terdeteksi
//     otomatis di seluruh aplikasi, pengguna dikasih pesan yang jelas &
//     halaman dimuat ulang otomatis supaya bisa lanjut memakai aplikasi.
// v80: index.html diperbarui — perbaikan "Memuat..." yang kadang macet
//     di HP: listener data halaman aktif dipasang ulang otomatis saat
//     aplikasi kembali dibuka setelah lama di-background (visibilitychange),
//     tombol "Muat ulang data" tak lagi menumpuk listener lama, menu
//     Setting > Upgrade Aplikasi tak lagi tampil "Memuat..." ulang tiap
//     kembali ke menu itu (pakai cache sesi), dan ditambahkan watchdog
//     8 detik dgn tombol "Coba lagi" kalau listener tetap tidak membalas.
// v79: index.html diperbarui — teks "Memuat Integrida…" pada layar
//     loading awal dihapus, hanya menyisakan logo.
// v78: index.html diperbarui — Keterangan (opsional) pengingat berulang
//     kini bisa diisi berbeda per tanggal kemunculan (descriptionOverrides),
//     tidak lagi selalu memakai satu keterangan yang sama utk semua
//     kemunculan; mengedit keterangan di satu tanggal tidak lagi
//     memengaruhi keterangan di tanggal lain.
// v77: index.html diperbarui — perbaikan bug tampilan Dashboard (&
//      halaman lain) terpotong di sisi kanan pada HP saat "Ukuran
//      Font" (menu Setting) di-set selain "Normal" (Kecil/Besar/Sangat
//      Besar). Penyebab: CSS `zoom` yang dipakai fitur ini (di-scope ke
//      `.main` & `.modal`) membesarkan/mengecilkan hasil render SETELAH
//      lebarnya dihitung — jadi `.main` lebar-layar-penuh yang di-zoom
//      112%/125% hasil render-nya jadi 12-25% LEBIH LEBAR dari layar,
//      membuat sisi kanan konten (nilai KPI, grafik, dst.) terpotong di
//      luar layar. Sekarang ditambahkan `--app-zoom-factor` (versi
//      angka tanpa satuan dari --app-zoom) dan lebar `.main`/`.modal`
//      dikompensasi via calc(.../var(--app-zoom-factor)) SEBELUM
//      di-zoom, supaya hasil akhir setelah di-zoom pas kembali ke lebar
//      seharusnya, di ukuran zoom berapa pun.
// v84: index.html diperbarui — perbaikan bug kop laporan (pdfDrawHeader) pada
//      export PDF Laporan Lengkap: sebelumnya saat Penempatan Logo di Pengaturan
//      diset "Kiri"/"Kanan", nama usaha/judul laporan/periode ikut menjorok
//      mengikuti posisi logo. Sekarang untuk posisi "Kiri"/"Kanan", logo berdiri
//      sendiri di sisi yang dipilih, sementara nama usaha/judul/periode SELALU
//      rata tengah halaman (berlaku di semua halaman yang memakai pdfDrawHeader:
//      Daftar Isi, Neraca, Laba Rugi, Buku Besar, Jurnal Umum). Posisi "Tengah"
//      (default) tidak berubah — logo & teks tetap digabung sebagai satu blok
//      yang diposisikan di tengah seperti sebelumnya.
const CACHE_NAME = 'integrida-cache-v84';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Jangan cache request ke Firebase / API eksternal - selalu ambil dari jaringan
  if (req.url.includes('googleapis') || req.url.includes('firestore') || req.url.includes('firebase')) {
    return;
  }

  // NETWORK-FIRST untuk navigasi (index.html / rute SPA).
  // Ini memastikan pengguna selalu melihat versi terbaru aplikasi selama
  // online, dan hanya jatuh ke cache lama saat benar-benar offline.
  const isNavigation = req.mode === 'navigate' ||
    (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').includes('text/html'));

  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // CACHE-FIRST untuk aset statis lain (manifest, ikon, dsb.)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        if (response && response.status === 200 && req.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
