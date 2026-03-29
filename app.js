/* ===== GTEC LearnHub — App Logic ===== */

(function () {
  'use strict';

  // ─── Auth Guard ───
  const auth = JSON.parse(localStorage.getItem('gtec_auth') || 'null');
  if (!auth) {
    window.location.href = 'index.html';
    return;
  }

  // ─── PDF.js Config ───
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const DEFAULT_SUBJECTS = [
    { name: 'Mathematics', icon: 'calculator', cssClass: 'math', desc: 'Algebra, Calculus, Geometry & more' },
    { name: 'Science', icon: 'flask-conical', cssClass: 'science', desc: 'Biology, Chemistry & Lab Notes' },
    { name: 'English', icon: 'pen-tool', cssClass: 'english', desc: 'Grammar, Literature & Writing' },
    { name: 'History', icon: 'landmark', cssClass: 'history', desc: 'World History, Civics & Events' },
    { name: 'Computer Science', icon: 'monitor', cssClass: 'cs', desc: 'Programming, DSA & Web Dev' },
    { name: 'Physics', icon: 'atom', cssClass: 'physics', desc: 'Mechanics, Optics & Thermodynamics' }
  ];
  let SUBJECTS = JSON.parse(localStorage.getItem('gtec_subjects')) || DEFAULT_SUBJECTS;
  
  function saveSubjects() {
    localStorage.setItem('gtec_subjects', JSON.stringify(SUBJECTS));
  }

  let currentSubject = null;
  let currentView = 'dashboard';
  let isAdmin = false;
  let pdfDoc = null;
  let pdfPageNum = 1;
  let pdfScale = 1.5;
  let downloadCount = parseInt(localStorage.getItem('gtec_downloads') || '0');
  let chatCount = parseInt(localStorage.getItem('gtec_chats') || '0');

  // ─── Storage Helpers ───
  function getNotes() {
    return JSON.parse(localStorage.getItem('gtec_notes') || '[]');
  }

  function saveNotes(notes) {
    localStorage.setItem('gtec_notes', JSON.stringify(notes));
  }

  function getPdfTexts() {
    return JSON.parse(localStorage.getItem('gtec_pdf_texts') || '{}');
  }

  function savePdfText(noteId, text) {
    const texts = getPdfTexts();
    texts[noteId] = text;
    localStorage.setItem('gtec_pdf_texts', JSON.stringify(texts));
  }

  // ─── DOM Refs ───
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const sidebar = $('#sidebar');
  const sidebarOverlay = $('#sidebarOverlay');
  const menuToggle = $('#menuToggle');
  const headerTitle = $('#headerTitle');
  const headerSubtitle = $('#headerSubtitle');
  const contentArea = $('#contentArea');
  const dashboardView = $('#dashboardView');
  const subjectNotesView = $('#subjectNotesView');
  const subjectsGrid = $('#subjectsGrid');
  const notesList = $('#notesList');
  const notesEmpty = $('#notesEmpty');
  const subjectTitle = $('#subjectTitle');
  const searchInput = $('#searchInput');
  const uploadModal = $('#uploadModal');
  const uploadZone = $('#uploadZone');
  const fileInput = $('#fileInput');
  const uploadFileInfo = $('#uploadFileInfo');
  const uploadFileName = $('#uploadFileName');
  const uploadSubject = $('#uploadSubject');
  const uploadTitle = $('#uploadTitle');
  const uploadSubmit = $('#uploadSubmit');
  const pdfViewer = $('#pdfViewer');
  const pdfCanvas = $('#pdfCanvas');
  const pdfPageInfo = $('#pdfPageInfo');
  const pdfViewerTitle = $('#pdfViewerTitle');
  const chatFab = $('#chatFab');
  const chatWindow = $('#chatWindow');
  const chatBody = $('#chatBody');
  const chatInput = $('#chatInput');
  const typingIndicator = $('#typingIndicator');
  const toast = $('#toast');

  // Subjects dynamic DOM refs
  const sidebarSubjectsList = $('#sidebarSubjectsList');
  const navAddSubject = $('#navAddSubject');
  const subjectModal = $('#subjectModal');
  const subjectModalClose = $('#subjectModalClose');
  const subjectNameInput = $('#subjectNameInput');
  const subjectDescInput = $('#subjectDescInput');
  const subjectIconInput = $('#subjectIconInput');
  const subjectCancel = $('#subjectCancel');
  const subjectSubmit = $('#subjectSubmit');
  const taskSubjectInput = $('#taskSubjectInput');
  const deleteSubjectBtn = $('#deleteSubjectBtn');

  // ─── Initialize ───
  function init() {
    isAdmin = auth.role === 'Administrator' || auth.role === 'Teacher';
    setUserInfo();
    applyRoleRestrictions();
    renderSidebarSubjects();
    renderSubjects();
    updateStats();
    setupNavigation();
    setupUpload();
    setupPdfViewer();
    setupChatbot();
    setupSearch();
    setupMobile();
    setupTaskScheduler();
    setupNotifications();
    setupSubjectModal();
    setupDeleteSubject();

    // Welcome chatbot message
    addBotMessage(
      "👋 Hi there! I'm **LearnBot**, your AI study assistant. I can help you with questions about your uploaded notes and this portal. Try asking me something!"
    );

    // Check overdue tasks and generate notifications
    checkOverdueTasks();
  }

  // ─── User Info ───
  function setUserInfo() {
    const initials = auth.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    $('#userAvatar').textContent = initials;
    $('#userName').textContent = auth.name;
    $('#userRole').textContent = auth.role;
  }

  function applyRoleRestrictions() {
    if (!isAdmin) {
      // Hide upload features
      const btnUploadOpen = $('#btnUploadOpen');
      const btnUploadEmpty = $('#btnUploadEmpty');
      if (btnUploadOpen) btnUploadOpen.style.display = 'none';
      if (btnUploadEmpty) btnUploadEmpty.style.display = 'none';
      
      // Hide subject management
      if (navAddSubject) navAddSubject.style.display = 'none';
    }
  }

  // ─── Stats ───
  function updateStats() {
    const notes = getNotes();
    $('#statTotalNotes').textContent = notes.length;
    $('#statDownloads').textContent = downloadCount;
    $('#statChats').textContent = chatCount;
    $('#totalNotesBadge').textContent = notes.length;
  }

  // ─── Subjects Grid ───
  function renderSubjects() {
    const notes = getNotes();
    subjectsGrid.innerHTML = SUBJECTS.map(s => {
      const count = notes.filter(n => n.subject === s.name).length;
      return `
        <div class="subject-card" data-subject="${s.name}">
          <div class="card-icon ${s.cssClass}"><i data-lucide="${s.icon}"></i></div>
          <h4>${s.name}</h4>
          <p class="card-meta">${s.desc}</p>
          <div class="card-footer">
            <span class="note-count"><i data-lucide="file-text" style="width:14px;height:14px;display:inline;"></i> ${count} note${count !== 1 ? 's' : ''}</span>
            <span class="card-action"><i data-lucide="arrow-right" style="width:16px;height:16px;"></i></span>
          </div>
        </div>
      `;
    }).join('');

    // Click handlers
    subjectsGrid.querySelectorAll('.subject-card').forEach(card => {
      card.addEventListener('click', () => {
        openSubject(card.dataset.subject);
      });
    });
    refreshIcons();
  }

  // ─── Dynamic Subjects Management ───
  function renderSidebarSubjects() {
    // 1. Sidebar Nav
    sidebarSubjectsList.innerHTML = SUBJECTS.map(s => `
      <div class="nav-item" data-view="subject" data-subject="${escapeHtml(s.name)}" id="navSubj_${s.name.replace(/\s+/g,'')}">
        <span class="nav-icon"><i data-lucide="${s.icon}"></i></span>
        ${escapeHtml(s.name)}
      </div>
    `).join('');

    sidebarSubjectsList.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        openSubject(item.dataset.subject);
      });
    });

    // 2. Upload Modal Dropdown
    uploadSubject.innerHTML = '<option value="">Select a subject</option>' + 
      SUBJECTS.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');

    // 3. Task Scheduler Dropdown
    if (taskSubjectInput) {
      taskSubjectInput.innerHTML = '<option value="">General</option>' + 
        SUBJECTS.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');
    }

    refreshIcons();
  }

  function setupSubjectModal() {
    navAddSubject.addEventListener('click', () => {
      subjectModal.classList.add('active');
    });

    subjectModalClose.addEventListener('click', closeSubjectModal);
    subjectCancel.addEventListener('click', closeSubjectModal);

    subjectNameInput.addEventListener('input', validateSubject);

    subjectSubmit.addEventListener('click', () => {
      const name = subjectNameInput.value.trim();
      if (!name) return;

      const newSubject = {
        name: name,
        icon: subjectIconInput.value,
        cssClass: 'blue', // default styling
        desc: subjectDescInput.value.trim() || 'Custom Subject'
      };

      SUBJECTS.push(newSubject);
      saveSubjects();
      renderSidebarSubjects();
      renderSubjects();
      updateStats();
      closeSubjectModal();
      showToast('Subject added!', 'success');
      
      // Navigate to the newly created subject
      openSubject(name);
    });
  }

  function validateSubject() {
    subjectSubmit.disabled = subjectNameInput.value.trim().length === 0;
  }

  function closeSubjectModal() {
    subjectModal.classList.remove('active');
    subjectNameInput.value = '';
    subjectDescInput.value = '';
    subjectIconInput.value = 'book';
    validateSubject();
  }

  function setupDeleteSubject() {
    if (!deleteSubjectBtn) return;
    deleteSubjectBtn.addEventListener('click', () => {
      if (!currentSubject) return;
      if (!confirm(`Are you sure you want to delete the subject "${currentSubject}" and ALL its notes? This cannot be undone.`)) return;

      // 1. Remove subject from array
      SUBJECTS = SUBJECTS.filter(s => s.name !== currentSubject);
      saveSubjects();

      // 2. Remove associated notes
      let notes = getNotes();
      const notesToDelete = notes.filter(n => n.subject === currentSubject);
      notes = notes.filter(n => n.subject !== currentSubject);
      saveNotes(notes);

      // 3. Clean up extracted PDF text to free localStorage config size
      const texts = getPdfTexts();
      notesToDelete.forEach(n => delete texts[n.id]);
      localStorage.setItem('gtec_pdf_texts', JSON.stringify(texts));

      // 4. Update UI
      renderSidebarSubjects();
      renderSubjects();
      updateStats();
      showToast(`Subject "${currentSubject}" deleted.`, 'success');
      showDashboard();
    });
  }

  // ─── Navigation ───
  function setupNavigation() {
    $$('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        if (view === 'dashboard') {
          showDashboard();
        } else if (view === 'all-notes') {
          openSubject(null); // all notes
        } else if (view === 'subject') {
          openSubject(item.dataset.subject);
        } else if (view === 'tasks') {
          showTaskScheduler();
        }
      });
    });

    $('#backToDashboard').addEventListener('click', showDashboard);
    $('#logoutBtn').addEventListener('click', logout);
    $('#headerLogout').addEventListener('click', logout);
  }

  function setActiveNav(itemId) {
    $$('.nav-item').forEach(n => n.classList.remove('active'));
    if (itemId) {
      const el = $(`#${itemId}`);
      if (el) el.classList.add('active');
    }
  }

  function showDashboard() {
    currentView = 'dashboard';
    currentSubject = null;
    dashboardView.style.display = '';
    subjectNotesView.style.display = 'none';
    hideTaskScheduler();
    headerTitle.textContent = 'Dashboard';
    headerSubtitle.textContent = 'Welcome back! Here\'s your learning overview.';
    setActiveNav('navDashboard');
    renderSubjects();
    updateStats();
    closeSidebar();
  }

  function openSubject(subject) {
    currentView = 'subject';
    currentSubject = subject;
    dashboardView.style.display = 'none';
    subjectNotesView.style.display = '';
    hideTaskScheduler();

    if (subject) {
      subjectTitle.textContent = subject;
      headerTitle.textContent = subject;
      headerSubtitle.textContent = `Manage notes for ${subject}`;
      uploadSubject.value = subject;

      // Highlight correct nav
      setActiveNav(`navSubj_${subject.replace(/\s+/g,'')}`);
      if (deleteSubjectBtn) deleteSubjectBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    } else {
      subjectTitle.textContent = 'All Notes';
      headerTitle.textContent = 'All Notes';
      headerSubtitle.textContent = 'View all uploaded notes across subjects';
      uploadSubject.value = '';
      setActiveNav('navAllNotes');
      if (deleteSubjectBtn) deleteSubjectBtn.style.display = 'none';
    }

    renderNotes();
    closeSidebar();
  }

  // ─── Render Notes ───
  function renderNotes(filterText) {
    let notes = getNotes();

    if (currentSubject) {
      notes = notes.filter(n => n.subject === currentSubject);
    }

    if (filterText) {
      const q = filterText.toLowerCase();
      notes = notes.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.subject.toLowerCase().includes(q)
      );
    }

    if (notes.length === 0) {
      notesList.innerHTML = '';
      notesEmpty.style.display = '';
    } else {
      notesEmpty.style.display = 'none';
      notesList.innerHTML = notes.map(n => `
        <li class="note-item" data-id="${n.id}">
          <div class="note-thumbnail" id="thumb_${n.id}">
            <div class="thumb-placeholder"><i data-lucide="file-text"></i></div>
          </div>
          <div class="note-info">
            <div class="note-name">${escapeHtml(n.title)}</div>
            <div class="note-meta">${n.subject} • ${formatSize(n.size)} • ${formatDate(n.date)}</div>
          </div>
          <div class="note-actions">
            <button class="view-btn" title="View PDF" data-id="${n.id}"><i data-lucide="eye"></i></button>
            <button class="dl-btn" title="Download" data-id="${n.id}"><i data-lucide="download"></i></button>
            ${isAdmin ? `<button class="delete-btn" title="Delete" data-id="${n.id}"><i data-lucide="trash-2"></i></button>` : ''}
          </div>
        </li>
      `).join('');

      // Event listeners
      notesList.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          viewPdf(btn.dataset.id);
        });
      });

      notesList.querySelectorAll('.dl-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          downloadNote(btn.dataset.id);
        });
      });

      notesList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteNote(btn.dataset.id);
        });
      });

      // Click on note item to view
      notesList.querySelectorAll('.note-item').forEach(item => {
        item.addEventListener('click', () => viewPdf(item.dataset.id));
      });

      refreshIcons();

      // Generate PDF thumbnails
      notes.forEach(n => generateThumbnail(n));
    }
  }

  // ─── Upload ───
  let selectedFile = null;

  function setupUpload() {
    const openModal = () => {
      uploadModal.classList.add('active');
      if (currentSubject) uploadSubject.value = currentSubject;
    };

    $('#btnUploadOpen').addEventListener('click', openModal);
    $('#btnUploadEmpty').addEventListener('click', openModal);
    $('#modalClose').addEventListener('click', closeUploadModal);
    $('#uploadCancel').addEventListener('click', closeUploadModal);

    uploadModal.addEventListener('click', (e) => {
      if (e.target === uploadModal) closeUploadModal();
    });

    // Drag & Drop
    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'application/pdf') {
        handleFileSelect(file);
      } else {
        showToast('Please upload a PDF file only.', 'error');
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) handleFileSelect(fileInput.files[0]);
    });

    $('#fileRemove').addEventListener('click', () => {
      selectedFile = null;
      uploadFileInfo.classList.remove('show');
      uploadZone.style.display = '';
      validateUpload();
    });

    uploadSubject.addEventListener('change', validateUpload);

    uploadSubmit.addEventListener('click', submitUpload);
  }

  function handleFileSelect(file) {
    if (file.size > 10 * 1024 * 1024) {
      showToast('File too large. Max 10MB allowed.', 'error');
      return;
    }
    selectedFile = file;
    uploadFileName.textContent = file.name;
    uploadFileInfo.classList.add('show');
    uploadZone.style.display = 'none';
    if (!uploadTitle.value) {
      uploadTitle.value = file.name.replace('.pdf', '');
    }
    validateUpload();
  }

  function validateUpload() {
    uploadSubmit.disabled = !(selectedFile && uploadSubject.value);
  }

  function submitUpload() {
    if (!selectedFile || !uploadSubject.value) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const base64Data = e.target.result;
      const noteId = 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

      const note = {
        id: noteId,
        title: uploadTitle.value || selectedFile.name.replace('.pdf', ''),
        subject: uploadSubject.value,
        fileName: selectedFile.name,
        size: selectedFile.size,
        date: new Date().toISOString(),
        data: base64Data
      };

      const notes = getNotes();
      notes.unshift(note);
      saveNotes(notes);

      // Extract text for chatbot
      extractPdfText(base64Data, noteId);

      closeUploadModal();
      renderNotes();
      renderSubjects();
      updateStats();
      showToast('Note uploaded successfully!', 'success');
    };
    reader.readAsDataURL(selectedFile);
  }

  function closeUploadModal() {
    uploadModal.classList.remove('active');
    selectedFile = null;
    uploadFileInfo.classList.remove('show');
    uploadZone.style.display = '';
    uploadTitle.value = '';
    fileInput.value = '';
    validateUpload();
  }

  // ─── Extract PDF text for chatbot ───
  async function extractPdfText(dataUrl, noteId) {
    try {
      const loadingTask = pdfjsLib.getDocument(dataUrl);
      const pdf = await loadingTask.promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const strings = textContent.items.map(item => item.str);
        fullText += strings.join(' ') + '\n';
      }
      savePdfText(noteId, fullText);
    } catch (err) {
      console.warn('Could not extract PDF text:', err);
    }
  }

  // ─── PDF Viewer ───
  function setupPdfViewer() {
    $('#pdfClose').addEventListener('click', closePdfViewer);
    $('#pdfPrevPage').addEventListener('click', () => changePdfPage(-1));
    $('#pdfNextPage').addEventListener('click', () => changePdfPage(1));

    $('#pdfZoomIn').addEventListener('click', () => {
      pdfScale = Math.min(pdfScale + 0.25, 3);
      renderPdfPage(pdfPageNum);
    });

    $('#pdfZoomOut').addEventListener('click', () => {
      pdfScale = Math.max(pdfScale - 0.25, 0.5);
      renderPdfPage(pdfPageNum);
    });

    $('#pdfDownload').addEventListener('click', () => {
      if (pdfViewer._noteId) downloadNote(pdfViewer._noteId);
    });
  }

  async function viewPdf(noteId) {
    const notes = getNotes();
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    pdfViewerTitle.textContent = note.title;
    pdfViewer._noteId = noteId;
    pdfViewer.classList.add('active');
    document.body.style.overflow = 'hidden';

    try {
      const loadingTask = pdfjsLib.getDocument(note.data);
      pdfDoc = await loadingTask.promise;
      pdfPageNum = 1;
      pdfScale = 1.5;
      updatePdfPageInfo();
      renderPdfPage(pdfPageNum);
    } catch (err) {
      showToast('Failed to load PDF.', 'error');
      console.error(err);
    }
  }

  function renderPdfPage(num) {
    if (!pdfDoc) return;
    pdfDoc.getPage(num).then(page => {
      const viewport = page.getViewport({ scale: pdfScale });
      const canvas = pdfCanvas;
      const ctx = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      page.render({ canvasContext: ctx, viewport: viewport });
      updatePdfPageInfo();
    });
  }

  function changePdfPage(delta) {
    if (!pdfDoc) return;
    const newPage = pdfPageNum + delta;
    if (newPage >= 1 && newPage <= pdfDoc.numPages) {
      pdfPageNum = newPage;
      renderPdfPage(pdfPageNum);
    }
  }

  function updatePdfPageInfo() {
    if (!pdfDoc) return;
    pdfPageInfo.textContent = `Page ${pdfPageNum} of ${pdfDoc.numPages}`;
    $('#pdfPrevPage').disabled = pdfPageNum <= 1;
    $('#pdfNextPage').disabled = pdfPageNum >= pdfDoc.numPages;
  }

  function closePdfViewer() {
    pdfViewer.classList.remove('active');
    document.body.style.overflow = '';
    pdfDoc = null;
  }

  // ─── Download ───
  function downloadNote(noteId) {
    const notes = getNotes();
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const link = document.createElement('a');
    link.href = note.data;
    link.download = note.fileName || note.title + '.pdf';
    link.click();

    downloadCount++;
    localStorage.setItem('gtec_downloads', downloadCount.toString());
    updateStats();
    showToast('Download started!', 'success');
  }

  // ─── Delete ───
  function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) return;
    let notes = getNotes();
    notes = notes.filter(n => n.id !== noteId);
    saveNotes(notes);

    // Also remove text
    const texts = getPdfTexts();
    delete texts[noteId];
    localStorage.setItem('gtec_pdf_texts', JSON.stringify(texts));

    renderNotes();
    renderSubjects();
    updateStats();
    showToast('Note deleted.', 'success');
  }

  // ─── Search ───
  function setupSearch() {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim();
      if (currentView === 'subject') {
        renderNotes(q);
      } else if (q.length > 0) {
        // Switch to all notes view to show search results
        openSubject(null);
        renderNotes(q);
      }
    });
  }

  // ─── Mobile Sidebar ───
  function setupMobile() {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      sidebarOverlay.classList.toggle('active');
    });

    sidebarOverlay.addEventListener('click', closeSidebar);
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
  }

  // ─── Logout ───
  function logout() {
    localStorage.removeItem('gtec_auth');
    window.location.href = 'index.html';
  }

  // ─── Chatbot ───
  function setupChatbot() {
    chatFab.addEventListener('click', () => {
      chatWindow.classList.toggle('open');
      if (chatWindow.classList.contains('open')) {
        chatInput.focus();
      }
    });

    document.addEventListener('click', (e) => {
      if (chatWindow.classList.contains('open') && !chatWindow.contains(e.target) && !chatFab.contains(e.target)) {
        chatWindow.classList.remove('open');
      }
    });

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    $('#chatSend').addEventListener('click', sendMessage);

    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 80) + 'px';
    });
  }

  function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    addUserMessage(text);
    chatInput.value = '';
    chatInput.style.height = 'auto';

    chatCount++;
    localStorage.setItem('gtec_chats', chatCount.toString());
    updateStats();

    // Show typing
    typingIndicator.classList.add('show');
    chatBody.scrollTop = chatBody.scrollHeight;

    // Simulate thinking delay
    setTimeout(() => {
      typingIndicator.classList.remove('show');
      const response = generateBotResponse(text);
      addBotMessage(response);
    }, 800 + Math.random() * 800);
  }

  function addUserMessage(text) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgEl = document.createElement('div');
    msgEl.classList.add('chat-message', 'user');
    msgEl.innerHTML = `
      <div class="msg-avatar"><i data-lucide="user" style="width:14px;height:14px;"></i></div>
      <div>
        <div class="msg-bubble">${escapeHtml(text)}</div>
        <span class="msg-time">${timeStr}</span>
      </div>
    `;
    chatBody.appendChild(msgEl);
    chatBody.scrollTop = chatBody.scrollHeight;
    refreshIcons();
  }

  function addBotMessage(text) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgEl = document.createElement('div');
    msgEl.classList.add('chat-message', 'bot');
    msgEl.innerHTML = `
      <div class="msg-avatar"><i data-lucide="bot" style="width:14px;height:14px;"></i></div>
      <div>
        <div class="msg-bubble">${formatBotText(text)}</div>
        <span class="msg-time">${timeStr}</span>
      </div>
    `;
    chatBody.appendChild(msgEl);
    chatBody.scrollTop = chatBody.scrollHeight;
    refreshIcons();
  }

  // ─── Chatbot AI Logic ───
  function generateBotResponse(query) {
    const q = query.toLowerCase().trim();

    // 1. Portal/Site info questions
    if (matchesAny(q, ['what is this', 'about this', 'what does this', 'what can you do', 'help', 'how to use'])) {
      return "🎓 **GTEC LearnHub** is your E-Learning portal! Here's what you can do:\n\n" +
        "• **Browse Subjects** — Click any subject card to see its notes\n" +
        "• **Upload PDFs** — Click the Upload button to add notes\n" +
        "• **View PDFs** — Click on any note to preview it in the built-in viewer\n" +
        "• **Download** — Use the download button to save PDFs locally\n" +
        "• **Ask me questions** — I can answer based on your uploaded notes!\n\n" +
        "Try uploading a PDF and then ask me about its content! 📚";
    }

    if (matchesAny(q, ['how to upload', 'upload notes', 'upload pdf', 'add notes', 'add pdf'])) {
      return "📤 **To upload a note:**\n\n" +
        "1. Navigate to a subject or click **Upload Note**\n" +
        "2. Drag & drop your PDF file or click to browse\n" +
        "3. Select the subject category\n" +
        "4. Add a title (optional)\n" +
        "5. Click **Upload Note**\n\n" +
        "Your PDF will be stored and I'll be able to answer questions about it! 🎯";
    }

    if (matchesAny(q, ['how to download', 'download notes', 'download pdf', 'save pdf'])) {
      return "📥 **To download a note:**\n\n" +
        "1. Open any subject's notes list\n" +
        "2. Click the **📥 Download** button on a note\n" +
        "3. Or open the PDF viewer and click **📥 Download** in the top bar\n\n" +
        "The file will be saved to your device! 💾";
    }

    if (matchesAny(q, ['how to view', 'view pdf', 'open pdf', 'preview', 'read pdf'])) {
      return "👁️ **To view a PDF:**\n\n" +
        "1. Go to any subject's notes\n" +
        "2. Click on a note or the **👁 View** button\n" +
        "3. Use the page navigation (◀ ▶) to browse pages\n" +
        "4. Use **Zoom In/Out** to resize\n" +
        "5. Click **✕ Close** when done\n\n" +
        "Happy reading! 📖";
    }

    if (matchesAny(q, ['what subjects', 'which subjects', 'list subjects', 'available subjects', 'categories'])) {
      return "📁 **Available Subjects:**\n\n" +
        "• 📐 Mathematics\n• 🔬 Science\n• 📝 English\n• 🏛️ History\n• 💻 Computer Science\n• ⚛️ Physics\n\n" +
        "Click any subject in the sidebar or dashboard to browse its notes!";
    }

    if (matchesAny(q, ['how many notes', 'total notes', 'note count', 'notes uploaded'])) {
      const notes = getNotes();
      const breakdown = SUBJECTS.map(s => {
        const count = notes.filter(n => n.subject === s.name).length;
        return `• ${s.icon} ${s.name}: **${count}** notes`;
      }).join('\n');
      return `📊 **Notes Overview:**\n\nTotal: **${notes.length}** notes uploaded\n\n${breakdown}`;
    }

    if (matchesAny(q, ['hello', 'hi', 'hey', 'good morning', 'good evening', 'good afternoon'])) {
      const greetings = [
        `👋 Hello, ${auth.name}! How can I help you today?`,
        `Hey there! 😊 Ready to learn something new?`,
        `Hi! I'm here to help you with your studies. Ask me anything!`
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    if (matchesAny(q, ['thank', 'thanks', 'thank you', 'thx'])) {
      return "You're welcome! 😊 Feel free to ask if you need anything else. Happy learning! 🎓";
    }

    if (matchesAny(q, ['bye', 'goodbye', 'see you', 'see ya'])) {
      return "Goodbye! 👋 Come back anytime you need help with your studies. Happy learning! 📚";
    }

    // 2. Search through uploaded PDF texts
    const pdfTexts = getPdfTexts();
    const notes = getNotes();
    const textEntries = Object.entries(pdfTexts);

    if (textEntries.length > 0) {
      const results = searchPdfContent(q, textEntries, notes);
      if (results.length > 0) {
        let response = "📄 Based on your uploaded notes, here's what I found:\n\n";
        results.forEach((r, i) => {
          response += `**From "${r.noteTitle}" (${r.subject}):**\n`;
          response += `"...${r.snippet}..."\n\n`;
        });
        response += "💡 *Want more details? Open the PDF to read the full content!*";
        return response;
      }
    }

    // 3. General knowledge fallback responses
    const knowledgeBase = {
      'mathematics|math|algebra|calculus|geometry|trigonometry': 
        "📐 **Mathematics** is a vast subject! Here are some key topics:\n\n" +
        "• **Algebra** — Equations, polynomials, functions\n" +
        "• **Calculus** — Derivatives, integrals, limits\n" +
        "• **Geometry** — Shapes, theorems, spatial reasoning\n" +
        "• **Trigonometry** — Sine, cosine, tangent\n\n" +
        "Upload related notes and I can help answer specific questions! 🔢",

      'science|biology|chemistry|lab': 
        "🔬 **Science** covers many fascinating areas:\n\n" +
        "• **Biology** — Cells, genetics, ecosystems\n" +
        "• **Chemistry** — Elements, reactions, compounds\n" +
        "• **Lab Work** — Experiments, observations, reports\n\n" +
        "Upload your science notes to get specific answers! 🧪",

      'english|grammar|literature|writing|essay': 
        "📝 **English** encompasses:\n\n" +
        "• **Grammar** — Parts of speech, sentence structure\n" +
        "• **Literature** — Poetry, prose, drama analysis\n" +
        "• **Writing** — Essays, reports, creative writing\n\n" +
        "Need help with a specific topic? Upload your notes! ✍️",

      'history|world history|ancient|civilization|war':
        "🏛️ **History** is a window to the past:\n\n" +
        "• **Ancient Civilizations** — Egypt, Rome, Greece\n" +
        "• **Medieval Period** — Feudalism, crusades\n" +
        "• **Modern History** — World Wars, civil rights\n\n" +
        "Upload history notes for detailed help! 📜",

      'computer|programming|coding|algorithm|data structure|web|python|java|javascript':
        "💻 **Computer Science** key areas:\n\n" +
        "• **Programming** — Python, Java, JavaScript, C++\n" +
        "• **Data Structures** — Arrays, trees, graphs, hash maps\n" +
        "• **Algorithms** — Sorting, searching, dynamic programming\n" +
        "• **Web Development** — HTML, CSS, JS, React\n\n" +
        "Upload your CS notes and ask away! 🖥️",

      'physics|mechanics|optics|thermodynamics|electricity|force|energy':
        "⚛️ **Physics** fundamental concepts:\n\n" +
        "• **Mechanics** — Forces, motion, Newton's laws\n" +
        "• **Optics** — Light, reflection, refraction\n" +
        "• **Thermodynamics** — Heat, energy, entropy\n" +
        "• **Electricity** — Current, voltage, circuits\n\n" +
        "Upload your physics notes for specific help! ⚡"
    };

    for (const [keywords, response] of Object.entries(knowledgeBase)) {
      const keywordList = keywords.split('|');
      if (keywordList.some(kw => q.includes(kw))) {
        return response;
      }
    }

    // 4. Default fallback
    if (textEntries.length === 0) {
      return "🤔 I don't have any notes to reference yet. **Upload some PDFs** and I'll be able to answer questions about their content!\n\n" +
        "In the meantime, you can ask me:\n" +
        "• How to use this portal\n" +
        "• About available subjects\n" +
        "• How to upload/view/download notes";
    }

    return "🤔 I couldn't find a specific answer to that in your uploaded notes. Try:\n\n" +
      "• Rephrasing your question with different keywords\n" +
      "• Uploading relevant PDFs for me to learn from\n" +
      "• Asking about portal features (upload, view, download)\n\n" +
      "I'm here to help! 💡";
  }

  // ─── PDF Content Search ───
  function searchPdfContent(query, textEntries, notes) {
    const words = query.split(/\s+/).filter(w => w.length > 2);
    const results = [];

    for (const [noteId, text] of textEntries) {
      if (!text || text.length < 10) continue;
      const note = notes.find(n => n.id === noteId);
      if (!note) continue;

      const lowerText = text.toLowerCase();
      let bestScore = 0;
      let bestIndex = -1;

      // Score sentences by keyword matches
      const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 20);
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].toLowerCase();
        let score = 0;
        for (const word of words) {
          if (sentence.includes(word)) score++;
        }
        // Bonus for exact phrase
        if (sentence.includes(query.toLowerCase())) score += 3;

        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }

      if (bestScore >= 1 && bestIndex >= 0) {
        let snippet = sentences[bestIndex].trim();
        if (snippet.length > 200) snippet = snippet.substring(0, 200);
        results.push({
          noteTitle: note.title,
          subject: note.subject,
          snippet: snippet,
          score: bestScore
        });
      }
    }

    // Sort by score descending, return top 3
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 3);
  }

  function matchesAny(query, patterns) {
    return patterns.some(p => query.includes(p));
  }

  function formatBotText(text) {
    // Basic markdown-like formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  // ─── Utilities ───
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function formatDate(isoStr) {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function showToast(message, type = 'success') {
    toast.textContent = (type === 'success' ? '✓ ' : '⚠ ') + message;
    toast.className = 'toast show ' + type;
    setTimeout(() => { toast.className = 'toast'; }, 3000);
  }

  // ─── UTILS: Icons & Thumbnails ───
  function refreshIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  async function generateThumbnail(note) {
    if (!note || !note.data) return;
    try {
      const container = document.getElementById(`thumb_${note.id}`);
      if (!container) return;
      
      const loadingTask = pdfjsLib.getDocument(note.data);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      
      const scale = 0.5; // Small scale for thumbnail
      const viewport = page.getViewport({ scale: scale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      container.innerHTML = '';
      container.appendChild(canvas);
    } catch (err) {
      console.warn('Could not generate PDF thumbnail:', err);
    }
  }


  // ─── TASK SCHEDULER ───
  const taskSchedulerView = $('#taskSchedulerView');
  const taskList = $('#taskList');
  const tasksEmpty = $('#tasksEmpty');
  const taskModal = $('#taskModal');
  let currentTaskFilter = 'all';

  function getTasks() {
    return JSON.parse(localStorage.getItem('gtec_tasks') || '[]');
  }

  function saveTasks(tasks) {
    localStorage.setItem('gtec_tasks', JSON.stringify(tasks));
    updateTaskBadge();
  }

  function updateTaskBadge() {
    const tasks = getTasks();
    const pending = tasks.filter(t => !t.completed).length;
    const badge = $('#taskBadge');
    if (pending > 0) {
      badge.textContent = pending;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  function showTaskScheduler() {
    currentView = 'tasks';
    dashboardView.style.display = 'none';
    subjectNotesView.style.display = 'none';
    taskSchedulerView.classList.add('active');
    headerTitle.textContent = 'Task Scheduler';
    headerSubtitle.textContent = ' ';
    setActiveNav('navTasks');
    renderTasks();
    closeSidebar();
  }

  function hideTaskScheduler() {
    taskSchedulerView.classList.remove('active');
  }

  function setupTaskScheduler() {
    updateTaskBadge();

    // Add task button
    $('#btnAddTask').addEventListener('click', () => {
      taskModal.classList.add('active');
      // Set default due date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      $('#taskDueInput').value = tomorrow.toISOString().split('T')[0];
    });

    $('#taskModalClose').addEventListener('click', closeTaskModal);
    $('#taskCancel').addEventListener('click', closeTaskModal);
    taskModal.addEventListener('click', (e) => {
      if (e.target === taskModal) closeTaskModal();
    });

    $('#taskSubmit').addEventListener('click', submitTask);

    // Filters
    $$('#taskFilters .task-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#taskFilters .task-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTaskFilter = btn.dataset.filter;
        renderTasks();
      });
    });
  }

  function closeTaskModal() {
    taskModal.classList.remove('active');
    $('#taskTitleInput').value = '';
    $('#taskDescInput').value = '';
    $('#taskSubjectInput').value = '';
    $('#taskPriorityInput').value = 'medium';
    $('#taskDueInput').value = '';
  }

  function submitTask() {
    const title = $('#taskTitleInput').value.trim();
    if (!title) {
      showToast('Please enter a task title.', 'error');
      return;
    }

    const task = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: title,
      description: $('#taskDescInput').value.trim(),
      subject: $('#taskSubjectInput').value,
      priority: $('#taskPriorityInput').value,
      dueDate: $('#taskDueInput').value,
      completed: false,
      createdAt: new Date().toISOString()
    };

    const tasks = getTasks();
    tasks.unshift(task);
    saveTasks(tasks);

    // Add notification
    addNotification({
      type: 'task-notif',
      icon: 'clipboard-list', // Lucide icon name
      text: `New task created: "${task.title}"` + (task.dueDate ? ` — due ${formatDate(task.dueDate)}` : ''),
      time: new Date().toISOString()
    });

    closeTaskModal();
    renderTasks();
    showToast('Task added successfully!', 'success');
  }

  function renderTasks() {
    let tasks = getTasks();

    // Apply filter
    if (currentTaskFilter === 'pending') {
      tasks = tasks.filter(t => !t.completed);
    } else if (currentTaskFilter === 'completed') {
      tasks = tasks.filter(t => t.completed);
    } else if (currentTaskFilter === 'high' || currentTaskFilter === 'medium' || currentTaskFilter === 'low') {
      tasks = tasks.filter(t => t.priority === currentTaskFilter);
    }

    if (tasks.length === 0) {
      taskList.innerHTML = '';
      tasksEmpty.style.display = '';
    } else {
      tasksEmpty.style.display = 'none';
      taskList.innerHTML = tasks.map(t => {
        const isOverdue = t.dueDate && !t.completed && new Date(t.dueDate) < new Date();
        return `
          <li class="task-item ${t.completed ? 'completed' : ''}" data-id="${t.id}">
            <button class="task-check" data-id="${t.id}" title="${t.completed ? 'Mark incomplete' : 'Mark complete'}">${t.completed ? '<i data-lucide="check" style="width:12px;height:12px;"></i>' : ''}</button>
            <div class="task-content">
              <div class="task-title">${escapeHtml(t.title)}</div>
              <div class="task-details">
                <span class="task-priority ${t.priority}">${t.priority}</span>
                ${t.subject ? `<span><i data-lucide="folder" style="width:12px;height:12px;display:inline;vertical-align:-2px;"></i> ${t.subject}</span>` : ''}
                ${t.dueDate ? `<span class="task-due ${isOverdue ? 'overdue' : ''}"><i data-lucide="calendar" style="width:12px;height:12px;display:inline;vertical-align:-2px;"></i> ${formatDate(t.dueDate)}${isOverdue ? ' (Overdue!)' : ''}</span>` : ''}
              </div>
            </div>
            <div class="task-actions-col">
              <button class="task-delete-btn" data-id="${t.id}" title="Delete"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
            </div>
          </li>
        `;
      }).join('');

      // Event listeners for check/delete
      taskList.querySelectorAll('.task-check').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleTask(btn.dataset.id);
        });
      });

      taskList.querySelectorAll('.task-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteTask(btn.dataset.id);
        });
      });
    }
  }

  function toggleTask(taskId) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    saveTasks(tasks);

    if (task.completed) {
      addNotification({
        type: 'task-notif',
        icon: 'check-circle',
        text: `Task completed: "${task.title}"`,
        time: new Date().toISOString()
      });
      showToast('Task completed! 🎉', 'success');
    }

    renderTasks();
    updateStats();
  }

  function deleteTask(taskId) {
    if (!confirm('Delete this task?')) return;
    let tasks = getTasks();
    tasks = tasks.filter(t => t.id !== taskId);
    saveTasks(tasks);
    renderTasks();
    showToast('Task deleted.', 'success');
  }

  function checkOverdueTasks() {
    const tasks = getTasks();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const overdueCheck = localStorage.getItem('gtec_overdue_check') || '';
    const today = now.toISOString().split('T')[0];
    if (overdueCheck === today) return; // Only check once per day

    const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < now);
    overdueTasks.forEach(t => {
      addNotification({
        type: 'overdue-notif',
        icon: 'alert-triangle',
        text: `Overdue task: "${t.title}" was due ${formatDate(t.dueDate)}`,
        time: new Date().toISOString()
      });
    });

    localStorage.setItem('gtec_overdue_check', today);
  }


  // ─── NOTIFICATIONS ───
  const notifPanel = $('#notifPanel');
  const notifPanelBody = $('#notifPanelBody');
  const notifCount = $('#notifCount');
  const notifDot = $('#notifDot');

  function getNotifications() {
    return JSON.parse(localStorage.getItem('gtec_notifications') || '[]');
  }

  function saveNotifications(notifs) {
    localStorage.setItem('gtec_notifications', JSON.stringify(notifs));
    updateNotifBadge();
  }

  function addNotification(notif) {
    const notifs = getNotifications();
    notif.id = 'notif_' + Date.now();
    notifs.unshift(notif);
    // Keep max 50
    if (notifs.length > 50) notifs.length = 50;
    saveNotifications(notifs);
    renderNotifications();
  }

  function updateNotifBadge() {
    const notifs = getNotifications();
    if (notifs.length > 0) {
      notifCount.textContent = notifs.length;
      notifCount.classList.add('show');
      notifDot.style.display = '';
    } else {
      notifCount.classList.remove('show');
      notifDot.style.display = 'none';
    }
  }

  function renderNotifications() {
    const notifs = getNotifications();
    const emptyEl = $('#notifEmpty');

    if (notifs.length === 0) {
      notifPanelBody.innerHTML = '<div class="notif-empty">No notifications yet</div>';
    } else {
      notifPanelBody.innerHTML = notifs.map(n => `
        <div class="notif-item" data-id="${n.id}">
          <div class="notif-icon ${n.type}"><i data-lucide="${n.icon || 'bell'}"></i></div>
          <div class="notif-content">
            <div class="notif-text">${n.text}</div>
            <div class="notif-time">${timeAgo(n.time)}</div>
          </div>
        </div>
      `).join('');
    }
    refreshIcons();
  }

  function setupNotifications() {
    updateNotifBadge();
    renderNotifications();

    // Toggle panel
    $('#notifBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      notifPanel.classList.toggle('open');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!notifPanel.contains(e.target) && e.target.id !== 'notifBtn') {
        notifPanel.classList.remove('open');
      }
    });

    // Clear all
    $('#notifClearAll').addEventListener('click', (e) => {
      e.stopPropagation();
      saveNotifications([]);
      renderNotifications();
      showToast('Notifications cleared.', 'success');
    });
  }

  function timeAgo(isoStr) {
    const now = new Date();
    const then = new Date(isoStr);
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return formatDate(isoStr);
  }


  // ─── Boot ───
  init();

})();
