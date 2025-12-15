pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

class HSK4ExamApp {
    constructor() {
        this.pdfDoc = null;
        this.answerKeyPdf = null;
        this.currentPage = 1;
        this.answerKeyCurrentPage = 1;
        this.totalPages = 0;
        this.answerKeyTotalPages = 0;
        this.currentExamName = '';
        this.filesUploaded = {
            exam: false,
            audio: false,
            answer: false
        };

        this.examState = {
            currentSection: 'listening',
            currentPart: 1,
            isRunning: false,
            isPaused: false,
            timeRemaining: 0,
            totalTime: 0
        };

        this.examTiming = {
            listening: { part1: 10 * 60, part2: 10 * 60, part3: 10 * 60 },
            reading: { part1: 13 * 60, part2: 13 * 60, part3: 14 * 60 },
            writing: { part1: 15 * 60, part2: 10 * 60 }
        };

        this.userAnswers = {
            listening: {
                part1: new Array(10).fill(null),
                part2: new Array(15).fill(null),
                part3: new Array(20).fill(null)
            },
            reading: {
                part1: new Array(10).fill(''),
                part2: new Array(10).fill(''),
                part3: new Array(20).fill(null)
            },
            writing: {
                part1: new Array(10).fill(''),
                part2: new Array(5).fill('')
            }
        };

        this.manualGrading = {
            listening: {
                part1: new Array(10).fill(null),
                part2: new Array(15).fill(null),
                part3: new Array(20).fill(null)
            },
            reading: {
                part1: new Array(10).fill(null),
                part2: new Array(10).fill(null),
                part3: new Array(20).fill(null)
            },
            writing: {
                part1: new Array(10).fill(null),
                part2: new Array(5).fill(null)
            }
        };

        this.answerKey = null;
        this.timerInterval = null;
        this.history = this.loadHistory();
        this.currentResults = null;
        this.currentGradingSection = 'listening';
        this.isManualGradingActive = false;

        // Main PDF Zoom properties
        this.pdfScale = 1.0; // Current zoom scale (1.0 = 100%)
        this.minScale = 0.3; // Minimum zoom (30%)
        this.maxScale = 5.0; // Maximum zoom (500%)
        this.scaleStep = 0.2; // Zoom step size

        // Answer Key PDF Zoom properties
        this.answerKeyScale = 1.0;
        this.answerKeyMinScale = 0.3;
        this.answerKeyMaxScale = 5.0;
        this.answerKeyScaleStep = 0.2;

        this.init();
        this.showHistoryModalOnStart();
    }

    init() {
        document.getElementById('examPdfInput').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.currentExamName = e.target.files[0].name.replace('.pdf', '').replace(/_/g, ' ').replace(/-/g, ' ');
                this.loadExamPDF(e.target.files[0]);
                this.checkIfTestTakenBefore();
            }
        });

        document.getElementById('audioInput').addEventListener('change', (e) => {
            if (e.target.files[0]) this.loadAudio(e.target.files[0]);
        });

        document.getElementById('answerPdfInput').addEventListener('change', (e) => {
            if (e.target.files[0]) this.loadAnswerKeyPdf(e.target.files[0]);
        });

        this.updateSectionIndicator();
        this.setupKeyboardShortcuts();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl + Plus or Ctrl + = (the same key for plus when shift is not pressed)
            if ((e.ctrlKey && (e.key === '+' || e.key === '='))) {
                e.preventDefault();
                if (document.getElementById('manualGradingContainer').classList.contains('hidden')) {
                    this.zoomIn();
                } else {
                    this.zoomInAnswerKey();
                }
            }
            // Ctrl + Minus
            else if (e.ctrlKey && e.key === '-') {
                e.preventDefault();
                if (document.getElementById('manualGradingContainer').classList.contains('hidden')) {
                    this.zoomOut();
                } else {
                    this.zoomOutAnswerKey();
                }
            }
            // Ctrl + 0 (reset zoom)
            else if (e.ctrlKey && e.key === '0') {
                e.preventDefault();
                if (document.getElementById('manualGradingContainer').classList.contains('hidden')) {
                    this.resetZoom();
                } else {
                    this.resetZoomAnswerKey();
                }
            }
        });

        // Handle mouse wheel zoom on PDF container
        const pdfContainer = document.querySelector('.pdf-container');
        if (pdfContainer) {
            pdfContainer.addEventListener('wheel', (e) => {
                if (e.ctrlKey) {
                    e.preventDefault();
                    if (e.deltaY < 0) {
                        if (document.getElementById('manualGradingContainer').classList.contains('hidden')) {
                            this.zoomIn();
                        } else {
                            this.zoomInAnswerKey();
                        }
                    } else {
                        if (document.getElementById('manualGradingContainer').classList.contains('hidden')) {
                            this.zoomOut();
                        } else {
                            this.zoomOutAnswerKey();
                        }
                    }
                }
            }, { passive: false });
        }
    }

    showHistoryModalOnStart() {
        setTimeout(() => {
            this.showHistory();
        }, 500);
    }

    checkIfTestTakenBefore() {
        if (!this.currentExamName) return;

        const testTaken = this.history.find(item =>
            item.testName.toLowerCase() === this.currentExamName.toLowerCase()
        );

        if (testTaken) {
            const shouldContinue = confirm(
                `You've already taken "${this.currentExamName}" on ${new Date(testTaken.date).toLocaleDateString()}.\n\nYour HSK 4 Score: ${testTaken.hsk4Score}/300\n\nDo you want to retake this test?`
            );

            if (!shouldContinue) {
                document.getElementById('examPdfInput').value = '';
                document.getElementById('examCard').classList.remove('uploaded');
                document.getElementById('examStatus').innerHTML = '';
                this.filesUploaded.exam = false;
                this.currentExamName = '';
                this.checkReadyToStart();
            }
        }
    }

    async loadExamPDF(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            this.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            this.totalPages = this.pdfDoc.numPages;
            this.currentPage = 1;

            this.filesUploaded.exam = true;
            document.getElementById('examStatus').innerHTML = '<div class="upload-status">✅ Loaded successfully</div>';
            document.getElementById('examCard').classList.add('uploaded');
            this.checkReadyToStart();

            document.getElementById('totalPages').textContent = this.totalPages;
            
            // Initial render with fit to page
            await this.fitToPage();
        } catch (error) {
            alert('Error loading PDF: ' + error.message);
        }
    }

    loadAudio(file) {
        const url = URL.createObjectURL(file);
        document.getElementById('audioPlayer').src = url;
        this.filesUploaded.audio = true;
        document.getElementById('audioStatus').innerHTML = '<div class="upload-status">✅ Loaded successfully</div>';
        document.getElementById('audioCard').classList.add('uploaded');
    }

    async loadAnswerKeyPdf(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            this.answerKeyPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            this.answerKeyTotalPages = this.answerKeyPdf.numPages;

            // Try to parse answer key from PDF text
            let fullText = '';
            for (let i = 1; i <= Math.min(this.answerKeyTotalPages, 3); i++) {
                const page = await this.answerKeyPdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }

            this.answerKey = this.parseAnswerKeyText(fullText);

            if (this.answerKey) {
                document.getElementById('answerStatus').innerHTML = '<div class="upload-status">✅ Parsed successfully - Auto-grading enabled</div>';
            } else {
                document.getElementById('answerStatus').innerHTML = '<div class="upload-status" style="color: #ff9800;">✅ Loaded - Use manual grading</div>';
            }

            document.getElementById('answerCard').classList.add('uploaded');
            this.filesUploaded.answer = true;
        } catch (error) {
            alert('Error loading answer key PDF: ' + error.message);
        }
    }

    // ========== MAIN PDF RENDERING FUNCTIONS ==========

    async renderPage(pageNum) {
        if (!this.pdfDoc || pageNum < 1 || pageNum > this.totalPages) return;

        this.currentPage = pageNum;
        document.getElementById('currentPage').textContent = pageNum;

        const page = await this.pdfDoc.getPage(pageNum);
        const container = document.getElementById('pdfViewer');

        // Clear container
        container.innerHTML = '';

        // Get viewport at current scale
        const viewport = page.getViewport({ scale: this.pdfScale });

        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Set canvas dimensions to match viewport
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Set canvas style - NO constraints, let it be natural size
        canvas.style.width = viewport.width + 'px';
        canvas.style.height = viewport.height + 'px';
        canvas.style.display = 'block';
        canvas.style.margin = '0';
        canvas.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';

        // Render PDF
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        // Add to container
        container.appendChild(canvas);
        
        // Show zoom controls and update zoom level
        document.getElementById('pdfControls').style.display = 'flex';
        this.updateZoomDisplay();

        // Reset scroll position to top-left
        const pdfContainer = container.parentElement;
        if (pdfContainer) {
            pdfContainer.scrollTop = 0;
            pdfContainer.scrollLeft = 0;
        }
    }

    // ========== MAIN PDF ZOOM FUNCTIONS ==========

    zoomIn() {
        if (this.pdfScale < this.maxScale) {
            this.pdfScale = Math.min(this.maxScale, this.pdfScale + this.scaleStep);
            this.updateZoomDisplay();
            this.renderPage(this.currentPage);
        }
    }

    zoomOut() {
        if (this.pdfScale > this.minScale) {
            this.pdfScale = Math.max(this.minScale, this.pdfScale - this.scaleStep);
            this.updateZoomDisplay();
            this.renderPage(this.currentPage);
        }
    }

    resetZoom() {
        this.pdfScale = 1.0;
        this.updateZoomDisplay();
        this.renderPage(this.currentPage);
    }

    async fitToWidth() {
        if (!this.pdfDoc || !this.currentPage) return;
        
        const page = await this.pdfDoc.getPage(this.currentPage);
        const container = document.querySelector('.pdf-container');
        const containerWidth = container.clientWidth - 40; // Account for padding
        
        // Get page width at scale 1.0
        const viewport = page.getViewport({ scale: 1.0 });
        const pageWidth = viewport.width;
        
        // Calculate scale to fit width
        this.pdfScale = containerWidth / pageWidth;
        this.updateZoomDisplay();
        this.renderPage(this.currentPage);
    }

    async fitToPage() {
        if (!this.pdfDoc || !this.currentPage) return;
        
        const page = await this.pdfDoc.getPage(this.currentPage);
        const container = document.querySelector('.pdf-container');
        const containerWidth = container.clientWidth - 40;
        const containerHeight = container.clientHeight - 40;
        
        const viewport = page.getViewport({ scale: 1.0 });
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;
        
        // Calculate scale to fit within container
        const scaleWidth = containerWidth / pageWidth;
        const scaleHeight = containerHeight / pageHeight;
        this.pdfScale = Math.min(scaleWidth, scaleHeight);
        
        this.updateZoomDisplay();
        this.renderPage(this.currentPage);
    }

    updateZoomDisplay() {
        const zoomPercent = Math.round(this.pdfScale * 100);
        document.getElementById('zoomLevel').textContent = zoomPercent;
        
        // Add or remove zoomed class based on scale
        const container = document.querySelector('.pdf-container');
        if (this.pdfScale > 1.0) {
            container.classList.add('zoomed');
        } else {
            container.classList.remove('zoomed');
        }
    }

    // ========== ANSWER KEY PDF RENDERING FUNCTIONS ==========

    async renderAnswerKeyPage(pageNum) {
        if (!this.answerKeyPdf || pageNum < 1 || pageNum > this.answerKeyTotalPages) return;

        this.answerKeyCurrentPage = pageNum;
        document.getElementById('answerKeyCurrentPage').textContent = pageNum;

        const page = await this.answerKeyPdf.getPage(pageNum);
        const container = document.getElementById('answerKeyPdfViewer');

        // Clear container
        container.innerHTML = '';

        // Get viewport at current scale
        const viewport = page.getViewport({ scale: this.answerKeyScale });

        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Set canvas style
        canvas.style.width = viewport.width + 'px';
        canvas.style.height = viewport.height + 'px';
        canvas.style.display = 'block';
        canvas.style.margin = '0';
        canvas.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';

        // Render PDF
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        // Add to container
        container.appendChild(canvas);
        
        // Show answer key zoom controls
        document.getElementById('answerKeyZoomControls').style.display = 'flex';
        this.updateAnswerKeyZoomDisplay();

        // Reset scroll position to top-left
        if (container) {
            container.scrollTop = 0;
            container.scrollLeft = 0;
        }
    }

    // ========== ANSWER KEY PDF ZOOM FUNCTIONS ==========

    zoomInAnswerKey() {
        if (this.answerKeyScale < this.answerKeyMaxScale) {
            this.answerKeyScale = Math.min(this.answerKeyMaxScale, this.answerKeyScale + this.answerKeyScaleStep);
            this.updateAnswerKeyZoomDisplay();
            this.renderAnswerKeyPage(this.answerKeyCurrentPage);
        }
    }

    zoomOutAnswerKey() {
        if (this.answerKeyScale > this.answerKeyMinScale) {
            this.answerKeyScale = Math.max(this.answerKeyMinScale, this.answerKeyScale - this.answerKeyScaleStep);
            this.updateAnswerKeyZoomDisplay();
            this.renderAnswerKeyPage(this.answerKeyCurrentPage);
        }
    }

    resetZoomAnswerKey() {
        this.answerKeyScale = 1.0;
        this.updateAnswerKeyZoomDisplay();
        this.renderAnswerKeyPage(this.answerKeyCurrentPage);
    }

    async fitToWidthAnswerKey() {
        if (!this.answerKeyPdf || !this.answerKeyCurrentPage) return;
        
        const page = await this.answerKeyPdf.getPage(this.answerKeyCurrentPage);
        const container = document.querySelector('.pdf-viewer-container');
        const containerWidth = container.clientWidth - 20; // Account for padding
        
        // Get page width at scale 1.0
        const viewport = page.getViewport({ scale: 1.0 });
        const pageWidth = viewport.width;
        
        // Calculate scale to fit width
        this.answerKeyScale = containerWidth / pageWidth;
        this.updateAnswerKeyZoomDisplay();
        this.renderAnswerKeyPage(this.answerKeyCurrentPage);
    }

    async fitToPageAnswerKey() {
        if (!this.answerKeyPdf || !this.answerKeyCurrentPage) return;
        
        const page = await this.answerKeyPdf.getPage(this.answerKeyCurrentPage);
        const container = document.querySelector('.pdf-viewer-container');
        const containerWidth = container.clientWidth - 20;
        const containerHeight = container.clientHeight - 60; // Account for controls
        
        const viewport = page.getViewport({ scale: 1.0 });
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;
        
        // Calculate scale to fit within container
        const scaleWidth = containerWidth / pageWidth;
        const scaleHeight = containerHeight / pageHeight;
        this.answerKeyScale = Math.min(scaleWidth, scaleHeight);
        
        this.updateAnswerKeyZoomDisplay();
        this.renderAnswerKeyPage(this.answerKeyCurrentPage);
    }

    updateAnswerKeyZoomDisplay() {
        const zoomPercent = Math.round(this.answerKeyScale * 100);
        document.getElementById('answerKeyZoomLevel').textContent = zoomPercent;
    }

    parseAnswerKeyText(text) {
        try {
            const answerKey = {
                listening: { part1: [], part2: [], part3: [] },
                reading: { part1: [], part2: [], part3: [] },
                writing: { part1: [], part2: [] }
            };

            text = text.replace(/\s+/g, ' ').trim().toUpperCase();

            // Improved parsing patterns
            // Listening Part 1 (1-10): True/False
            const listeningPart1Regex = /(?:一[、.]?听力.*?第一部分|第一部分)[\s\S]*?(\d+)[\s.]*([对√T]|[错×F])/gi;
            let match;
            while ((match = listeningPart1Regex.exec(text)) !== null) {
                const num = parseInt(match[1]);
                if (num >= 1 && num <= 10) {
                    const answer = match[2].toUpperCase();
                    answerKey.listening.part1[num - 1] = answer.includes('对') || answer.includes('√') || answer === 'T' ? 'true' : 'false';
                }
            }

            // Listening Part 2 & 3 (11-45): A-D
            const listeningABCRegex = /(?:第二[、.]部分|第三[、.]部分|第二部分|第三部分)[\s\S]*?(\d+)[\s.]*([A-D])/gi;
            while ((match = listeningABCRegex.exec(text)) !== null) {
                const num = parseInt(match[1]);
                if (num >= 11 && num <= 25) {
                    answerKey.listening.part2[num - 11] = match[2];
                } else if (num >= 26 && num <= 45) {
                    answerKey.listening.part3[num - 26] = match[2];
                }
            }

            // Reading Part 1 (46-55): A-F
            const readingPart1Regex = /(?:二[、.]?阅读.*?第一部分|第一部分)[\s\S]*?(\d+)[\s.]*([A-F])/gi;
            while ((match = readingPart1Regex.exec(text)) !== null) {
                const num = parseInt(match[1]);
                if (num >= 46 && num <= 55) {
                    answerKey.reading.part1[num - 46] = match[2];
                }
            }

            // Reading Part 2 (56-65): ABC order
            const readingPart2Regex = /(?:第二[、.]部分|第二部分)[\s\S]*?(\d+)[\s.]*([A-C]{3})/gi;
            while ((match = readingPart2Regex.exec(text)) !== null) {
                const num = parseInt(match[1]);
                if (num >= 56 && num <= 65) {
                    answerKey.reading.part2[num - 56] = match[2];
                }
            }

            // Reading Part 3 (66-85): A-D
            const readingPart3Regex = /(?:第三[、.]部分|第三部分)[\s\S]*?(\d+)[\s.]*([A-D])/gi;
            while ((match = readingPart3Regex.exec(text)) !== null) {
                const num = parseInt(match[1]);
                if (num >= 66 && num <= 85) {
                    answerKey.reading.part3[num - 66] = match[2];
                }
            }

            // Check if we got any answers
            const hasAnswers =
                answerKey.listening.part1.filter(x => x).length > 0 ||
                answerKey.listening.part2.filter(x => x).length > 0 ||
                answerKey.listening.part3.filter(x => x).length > 0 ||
                answerKey.reading.part1.filter(x => x).length > 0 ||
                answerKey.reading.part2.filter(x => x).length > 0 ||
                answerKey.reading.part3.filter(x => x).length > 0;

            return hasAnswers ? answerKey : null;
        } catch (error) {
            console.error('Parse error:', error);
            return null;
        }
    }

    checkReadyToStart() {
        if (this.filesUploaded.exam) {
            document.getElementById('beginExamBtn').disabled = false;
        }
    }

    async beginExam() {
        document.getElementById('setupScreen').style.display = 'none';
        document.getElementById('examMode').classList.add('active');
        document.getElementById('historyModal').classList.add('hidden');

        if (this.pdfDoc) {
            // Start with fit to page
            await this.fitToPage();
            document.getElementById('pdfNav').style.display = 'block';
            // Show zoom controls
            document.getElementById('pdfControls').style.display = 'flex';
        }

        if (this.filesUploaded.audio) {
            document.getElementById('audioControls').classList.remove('hidden');
        }

        this.generateAnswerSheet();
    }

    changePage(delta) {
        const newPage = this.currentPage + delta;
        if (newPage >= 1 && newPage <= this.totalPages) {
            this.renderPage(newPage);
        }
    }

    changeAnswerKeyPage(delta) {
        const newPage = this.answerKeyCurrentPage + delta;
        if (newPage >= 1 && newPage <= this.answerKeyTotalPages) {
            this.renderAnswerKeyPage(newPage);
        }
    }

    generateAnswerSheet() {
        let html = '';

        html += `<div class="question-group">
            <h4>👂 Listening (45 questions)</h4>
            <div class="info-box"><strong>Part 1 (1-10):</strong> 对/错 | <strong>Part 2 (11-25):</strong> A/B/C/D | <strong>Part 3 (26-45):</strong> A/B/C/D</div>`;

        for (let i = 1; i <= 10; i++) {
            html += `<div class="question-item">
                <div class="question-label">${i}.</div>
                <div class="option-row">
                    <label><input type="radio" name="l1_${i}" value="true" onchange="app.saveAnswer('listening', 'part1', ${i-1}, this.value)"> 对 (T)</label>
                    <label><input type="radio" name="l1_${i}" value="false" onchange="app.saveAnswer('listening', 'part1', ${i-1}, this.value)"> 错 (F)</label>
                </div>
            </div>`;
        }

        for (let i = 11; i <= 25; i++) {
            html += `<div class="question-item">
                <div class="question-label">${i}.</div>
                <div class="option-row">
                    ${['A', 'B', 'C', 'D'].map(opt =>
                        `<label><input type="radio" name="l2_${i}" value="${opt}" onchange="app.saveAnswer('listening', 'part2', ${i-11}, this.value)"> ${opt}</label>`
                    ).join('')}
                </div>
            </div>`;
        }

        for (let i = 26; i <= 45; i++) {
            html += `<div class="question-item">
                <div class="question-label">${i}.</div>
                <div class="option-row">
                    ${['A', 'B', 'C', 'D'].map(opt =>
                        `<label><input type="radio" name="l3_${i}" value="${opt}" onchange="app.saveAnswer('listening', 'part3', ${i-26}, this.value)"> ${opt}</label>`
                    ).join('')}
                </div>
            </div>`;
        }
        html += `</div>`;

        html += `<div class="question-group">
            <h4>📖 Reading (40 questions)</h4>
            <div class="info-box"><strong>Part 1 (46-55):</strong> A-F | <strong>Part 2 (56-65):</strong> ABC Order | <strong>Part 3 (66-85):</strong> A/B/C/D</div>`;

        for (let i = 46; i <= 55; i++) {
            html += `<div class="question-item">
                <div class="question-label">${i}. Enter letter (A-F):</div>
                <input type="text" maxlength="1" oninput="this.value=this.value.toUpperCase().replace(/[^A-F]/g,'')" onchange="app.saveAnswer('reading', 'part1', ${i-46}, this.value)">
            </div>`;
        }

        for (let i = 56; i <= 65; i++) {
            html += `<div class="question-item">
                <div class="question-label">${i}. Order (e.g., ABC):</div>
                <input type="text" maxlength="3" placeholder="ABC" oninput="this.value=this.value.toUpperCase().replace(/[^A-C]/g,'')" onchange="app.saveAnswer('reading', 'part2', ${i-56}, this.value)">
            </div>`;
        }

        for (let i = 66; i <= 85; i++) {
            html += `<div class="question-item">
                <div class="question-label">${i}.</div>
                <div class="option-row">
                    ${['A', 'B', 'C', 'D'].map(opt =>
                        `<label><input type="radio" name="r3_${i}" value="${opt}" onchange="app.saveAnswer('reading', 'part3', ${i-66}, this.value)"> ${opt}</label>`
                    ).join('')}
                </div>
            </div>`;
        }
        html += `</div>`;

        html += `<div class="question-group">
            <h4>✏️ Writing (15 questions)</h4>
            <div class="info-box"><strong>Part 1 (86-95):</strong> Construct sentences | <strong>Part 2 (96-100):</strong> Picture descriptions</div>`;

        for (let i = 86; i <= 95; i++) {
            html += `<div class="question-item">
                <div class="question-label">${i}. Write sentence:</div>
                <textarea oninput="app.saveAnswer('writing', 'part1', ${i-86}, this.value)" placeholder="Type your sentence..."></textarea>
            </div>`;
        }

        for (let i = 96; i <= 100; i++) {
            html += `<div class="question-item">
                <div class="question-label">${i}. Picture sentence:</div>
                <textarea oninput="app.saveAnswer('writing', 'part2', ${i-96}, this.value)" placeholder="Describe the picture..."></textarea>
            </div>`;
        }
        html += `</div>`;

        document.getElementById('answerContainer').innerHTML = html;
    }

    saveAnswer(section, part, index, value) {
        this.userAnswers[section][part][index] = value;
    }

    startSection() {
        if (this.examState.isRunning) return;

        this.examState.isRunning = true;
        this.examState.isPaused = false;

        const section = this.examState.currentSection;
        const part = this.examState.currentPart;
        const time = this.examTiming[section][`part${part}`];

        this.examState.timeRemaining = time;
        this.examState.totalTime = time;

        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;

        if (section === 'listening') {
            const audio = document.getElementById('audioPlayer');
            if (audio.src) {
                audio.play().catch(() => {
                    alert('Click play button on audio player to start');
                });
            }
        }

        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    }

    updateTimer() {
        if (!this.examState.isRunning || this.examState.isPaused) return;

        if (this.examState.timeRemaining > 0) {
            this.examState.timeRemaining--;
            const mins = Math.floor(this.examState.timeRemaining / 60);
            const secs = this.examState.timeRemaining % 60;
            const timerEl = document.getElementById('timer');
            timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

            if (this.examState.timeRemaining < 60) {
                timerEl.classList.add('warning');
            } else {
                timerEl.classList.remove('warning');
            }
        } else {
            this.endSection();
        }
    }

    pauseTimer() {
        this.examState.isPaused = !this.examState.isPaused;
        const btn = document.getElementById('pauseBtn');
        const audio = document.getElementById('audioPlayer');

        if (this.examState.isPaused) {
            btn.textContent = '▶ Resume';
            audio.pause();
        } else {
            btn.textContent = '⏸ Pause';
            if (this.examState.currentSection === 'listening' && audio.src) {
                audio.play();
            }
        }
    }

    endSection() {
        clearInterval(this.timerInterval);
        document.getElementById('audioPlayer').pause();

        const { currentSection, currentPart } = this.examState;

        if (currentSection === 'listening' && currentPart < 3) {
            this.examState.currentPart++;
        } else if (currentSection === 'listening') {
            this.examState.currentSection = 'reading';
            this.examState.currentPart = 1;
            document.getElementById('audioControls').classList.add('hidden');
            alert('Listening section complete! Moving to Reading section.');
        } else if (currentSection === 'reading' && currentPart < 3) {
            this.examState.currentPart++;
        } else if (currentSection === 'reading') {
            this.examState.currentSection = 'writing';
            this.examState.currentPart = 1;
            alert('Reading section complete! Moving to Writing section.');
        } else if (currentSection === 'writing' && currentPart < 2) {
            this.examState.currentPart++;
        } else {
            alert('Exam complete! Click Submit Exam to see results.');
            this.examState.isRunning = false;
            document.getElementById('startBtn').disabled = true;
            document.getElementById('pauseBtn').disabled = true;
            return;
        }

        this.examState.isRunning = false;
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('startBtn').textContent = '▶ Start Next Section';

        this.updateSectionIndicator();
    }

    updateSectionIndicator() {
        const sections = { listening: 'Listening', reading: 'Reading', writing: 'Writing' };
        const text = `${sections[this.examState.currentSection]} - Part ${this.examState.currentPart}`;
        document.getElementById('currentSection').textContent = text;
    }

    submitExam() {
        if (!confirm('Submit exam and see results?')) return;

        clearInterval(this.timerInterval);
        this.examState.isRunning = false;
        document.getElementById('audioPlayer').pause();

        // Hide exam mode
        document.getElementById('examMode').classList.remove('active');

        // Show results modal
        document.getElementById('resultsModal').classList.remove('hidden');

        // Show manual grading or score entry
        if (this.answerKeyPdf) {
            this.startManualGrading();
        } else {
            this.showManualScoreEntry();
        }
    }

    // ========== MANUAL GRADING FUNCTIONS ==========

    async startManualGrading() {
        this.isManualGradingActive = true;

        // Show manual grading container
        document.getElementById('manualGradingContainer').classList.remove('hidden');
        document.getElementById('manualScoreEntryContainer').classList.add('hidden');
        document.getElementById('resultsContent').innerHTML = '';

        // Render answer key PDF with fit to page
        if (this.answerKeyPdf) {
            await this.fitToPageAnswerKey();
        }

        // Generate grading interface
        this.switchGradingSection('listening');
        this.updateGradingTabs();
    }

    switchGradingSection(section) {
        this.currentGradingSection = section;
        this.updateGradingTabs();
        this.generateGradingInterface();
    }

    updateGradingTabs() {
        const tabs = document.querySelectorAll('.grading-tab');
        tabs.forEach(tab => tab.classList.remove('active'));

        const activeTab = document.querySelector(`.grading-tab:nth-child(${this.currentGradingSection === 'listening' ? 1 : this.currentGradingSection === 'reading' ? 2 : 3})`);
        if (activeTab) activeTab.classList.add('active');
    }

    generateGradingInterface() {
        const section = this.currentGradingSection;
        const userAnswers = this.userAnswers[section];
        const grading = this.manualGrading[section];
        const answerKey = this.answerKey ? this.answerKey[section] : null;

        let html = '';

        if (section === 'listening') {
            html += `<h4 style="margin-bottom: 15px;">Listening Section</h4>`;

            // Part 1
            html += `<div style="margin-bottom: 20px;">
                <h5 style="margin-bottom: 10px; color: #6e6e73;">Part 1 (Questions 1-10) - True/False</h5>`;

            for (let i = 0; i < 10; i++) {
                const qNum = i + 1;
                const userAns = userAnswers.part1[i];
                const isCorrect = grading.part1[i] === true;
                const isIncorrect = grading.part1[i] === false;
                const correctAnswer = answerKey ? answerKey.part1[i] : null;

                let statusClass = 'pending';
                if (isCorrect) statusClass = 'correct';
                if (isIncorrect) statusClass = 'incorrect';

                html += `<div class="grading-question-item ${statusClass}">
                    <div class="grading-question-label">Question ${qNum}</div>
                    <div class="grading-question-content">
                        <div class="user-answer-display">
                            <strong>Your answer:</strong> ${userAns === 'true' ? '对 (True)' : userAns === 'false' ? '错 (False)' : 'No answer'}
                        </div>
                        ${correctAnswer ? `<div class="correct-answer-display">
                            <strong>Correct:</strong> ${correctAnswer === 'true' ? '对 (True)' : '错 (False)'}
                        </div>` : ''}
                        <div class="grading-buttons">
                            <div class="mark-correct ${isCorrect ? 'active' : ''}" onclick="app.markQuestionCorrect('listening', 'part1', ${i})">✓</div>
                            <div class="mark-incorrect ${isIncorrect ? 'active' : ''}" onclick="app.markQuestionIncorrect('listening', 'part1', ${i})">✗</div>
                        </div>
                    </div>
                </div>`;
            }
            html += `</div>`;

            // Part 2
            html += `<div style="margin-bottom: 20px;">
                <h5 style="margin-bottom: 10px; color: #6e6e73;">Part 2 (Questions 11-25) - Multiple Choice</h5>`;

            for (let i = 0; i < 15; i++) {
                const qNum = i + 11;
                const userAns = userAnswers.part2[i];
                const isCorrect = grading.part2[i] === true;
                const isIncorrect = grading.part2[i] === false;
                const correctAnswer = answerKey ? answerKey.part2[i] : null;

                let statusClass = 'pending';
                if (isCorrect) statusClass = 'correct';
                if (isIncorrect) statusClass = 'incorrect';

                html += `<div class="grading-question-item ${statusClass}">
                    <div class="grading-question-label">Question ${qNum}</div>
                    <div class="grading-question-content">
                        <div class="user-answer-display">
                            <strong>Your answer:</strong> ${userAns || 'No answer'}
                        </div>
                        ${correctAnswer ? `<div class="correct-answer-display">
                            <strong>Correct:</strong> ${correctAnswer}
                        </div>` : ''}
                        <div class="grading-buttons">
                            <div class="mark-correct ${isCorrect ? 'active' : ''}" onclick="app.markQuestionCorrect('listening', 'part2', ${i})">✓</div>
                            <div class="mark-incorrect ${isIncorrect ? 'active' : ''}" onclick="app.markQuestionIncorrect('listening', 'part2', ${i})">✗</div>
                        </div>
                    </div>
                </div>`;
            }
            html += `</div>`;

            // Part 3
            html += `<div>
                <h5 style="margin-bottom: 10px; color: #6e6e73;">Part 3 (Questions 26-45) - Multiple Choice</h5>`;

            for (let i = 0; i < 20; i++) {
                const qNum = i + 26;
                const userAns = userAnswers.part3[i];
                const isCorrect = grading.part3[i] === true;
                const isIncorrect = grading.part3[i] === false;
                const correctAnswer = answerKey ? answerKey.part3[i] : null;

                let statusClass = 'pending';
                if (isCorrect) statusClass = 'correct';
                if (isIncorrect) statusClass = 'incorrect';

                html += `<div class="grading-question-item ${statusClass}">
                    <div class="grading-question-label">Question ${qNum}</div>
                    <div class="grading-question-content">
                        <div class="user-answer-display">
                            <strong>Your answer:</strong> ${userAns || 'No answer'}
                        </div>
                        ${correctAnswer ? `<div class="correct-answer-display">
                            <strong>Correct:</strong> ${correctAnswer}
                        </div>` : ''}
                        <div class="grading-buttons">
                            <div class="mark-correct ${isCorrect ? 'active' : ''}" onclick="app.markQuestionCorrect('listening', 'part3', ${i})">✓</div>
                            <div class="mark-incorrect ${isIncorrect ? 'active' : ''}" onclick="app.markQuestionIncorrect('listening', 'part3', ${i})">✗</div>
                        </div>
                    </div>
                </div>`;
            }
            html += `</div>`;
        }

        if (section === 'reading') {
            html += `<h4 style="margin-bottom: 15px;">Reading Section</h4>`;

            // Similar structure for reading parts
            const readingParts = [
                { name: 'Part 1 (46-55) - Matching', key: 'part1', start: 46, count: 10 },
                { name: 'Part 2 (56-65) - Ordering', key: 'part2', start: 56, count: 10 },
                { name: 'Part 3 (66-85) - Multiple Choice', key: 'part3', start: 66, count: 20 }
            ];

            readingParts.forEach(part => {
                html += `<div style="margin-bottom: ${part.key === 'part3' ? '0' : '20px'};">
                    <h5 style="margin-bottom: 10px; color: #6e6e73;">${part.name}</h5>`;

                for (let i = 0; i < part.count; i++) {
                    const qNum = part.start + i;
                    const userAns = userAnswers[part.key][i];
                    const isCorrect = grading[part.key][i] === true;
                    const isIncorrect = grading[part.key][i] === false;
                    const correctAnswer = answerKey ? answerKey[part.key][i] : null;

                    let statusClass = 'pending';
                    if (isCorrect) statusClass = 'correct';
                    if (isIncorrect) statusClass = 'incorrect';

                    html += `<div class="grading-question-item ${statusClass}">
                        <div class="grading-question-label">Question ${qNum}</div>
                        <div class="grading-question-content">
                            <div class="user-answer-display">
                                <strong>Your answer:</strong> ${userAns || 'No answer'}
                            </div>
                            ${correctAnswer ? `<div class="correct-answer-display">
                                <strong>Correct:</strong> ${correctAnswer}
                            </div>` : ''}
                            <div class="grading-buttons">
                                <div class="mark-correct ${isCorrect ? 'active' : ''}" onclick="app.markQuestionCorrect('reading', '${part.key}', ${i})">✓</div>
                                <div class="mark-incorrect ${isIncorrect ? 'active' : ''}" onclick="app.markQuestionIncorrect('reading', '${part.key}', ${i})">✗</div>
                            </div>
                        </div>
                    </div>`;
                }
                html += `</div>`;
            });
        }

        if (section === 'writing') {
            html += `<h4 style="margin-bottom: 15px;">Writing Section</h4>`;

            // Part 1
            html += `<div style="margin-bottom: 20px;">
                <h5 style="margin-bottom: 10px; color: #6e6e73;">Part 1 (86-95) - Sentence Construction</h5>`;

            for (let i = 0; i < 10; i++) {
                const qNum = i + 86;
                const userAns = userAnswers.part1[i];
                const isCorrect = grading.part1[i] === true;
                const isIncorrect = grading.part1[i] === false;
                const correctAnswer = answerKey ? answerKey.part1[i] : null;

                let statusClass = 'pending';
                if (isCorrect) statusClass = 'correct';
                if (isIncorrect) statusClass = 'incorrect';

                html += `<div class="grading-question-item ${statusClass}">
                    <div class="grading-question-label">Question ${qNum}</div>
                    <div class="grading-question-content">
                        <div class="user-answer-display">
                            <strong>Your answer:</strong><br>
                            ${userAns || 'No answer'}
                        </div>
                        ${correctAnswer ? `<div class="correct-answer-display">
                            <strong>Sample answer:</strong><br>
                            ${correctAnswer}
                        </div>` : ''}
                        <div class="grading-buttons">
                            <div class="mark-correct ${isCorrect ? 'active' : ''}" onclick="app.markQuestionCorrect('writing', 'part1', ${i})">✓</div>
                            <div class="mark-incorrect ${isIncorrect ? 'active' : ''}" onclick="app.markQuestionIncorrect('writing', 'part1', ${i})">✗</div>
                        </div>
                    </div>
                </div>`;
            }
            html += `</div>`;

            // Part 2
            html += `<div>
                <h5 style="margin-bottom: 10px; color: #6e6e73;">Part 2 (96-100) - Picture Description</h5>`;

            for (let i = 0; i < 5; i++) {
                const qNum = i + 96;
                const userAns = userAnswers.part2[i];
                const isCorrect = grading.part2[i] === true;
                const isIncorrect = grading.part2[i] === false;
                const correctAnswer = answerKey ? answerKey.part2[i] : null;

                let statusClass = 'pending';
                if (isCorrect) statusClass = 'correct';
                if (isIncorrect) statusClass = 'incorrect';

                html += `<div class="grading-question-item ${statusClass}">
                    <div class="grading-question-label">Question ${qNum}</div>
                    <div class="grading-question-content">
                        <div class="user-answer-display">
                            <strong>Your answer:</strong><br>
                            ${userAns || 'No answer'}
                        </div>
                        ${correctAnswer ? `<div class="correct-answer-display">
                            <strong>Sample answer:</strong><br>
                            ${correctAnswer}
                        </div>` : ''}
                        <div class="grading-buttons">
                            <div class="mark-correct ${isCorrect ? 'active' : ''}" onclick="app.markQuestionCorrect('writing', 'part2', ${i})">✓</div>
                            <div class="mark-incorrect ${isIncorrect ? 'active' : ''}" onclick="app.markQuestionIncorrect('writing', 'part2', ${i})">✗</div>
                        </div>
                    </div>
                </div>`;
            }
            html += `</div>`;
        }

        document.getElementById('manualGradingAnswers').innerHTML = html;
    }

    markQuestionCorrect(section, part, index) {
        this.manualGrading[section][part][index] = true;
        this.generateGradingInterface();
    }

    markQuestionIncorrect(section, part, index) {
        this.manualGrading[section][part][index] = false;
        this.generateGradingInterface();
    }

    markAllCurrentCorrect() {
        const section = this.currentGradingSection;
        const parts = ['part1', 'part2', 'part3'];

        parts.forEach(part => {
            if (this.manualGrading[section][part]) {
                const length = this.manualGrading[section][part].length;
                for (let i = 0; i < length; i++) {
                    this.manualGrading[section][part][i] = true;
                }
            }
        });

        this.generateGradingInterface();
    }

    markAllCurrentIncorrect() {
        const section = this.currentGradingSection;
        const parts = ['part1', 'part2', 'part3'];

        parts.forEach(part => {
            if (this.manualGrading[section][part]) {
                const length = this.manualGrading[section][part].length;
                for (let i = 0; i < length; i++) {
                    this.manualGrading[section][part][i] = false;
                }
            }
        });

        this.generateGradingInterface();
    }

    // ========== SCORE CALCULATION FUNCTIONS ==========

    calculateScoresFromGrading() {
        // Count correct answers from manual grading
        let listeningCorrect = 0;
        let readingCorrect = 0;
        let writingCorrect = 0;

        ['part1', 'part2', 'part3'].forEach(part => {
            this.manualGrading.listening[part].forEach(grade => {
                if (grade === true) listeningCorrect++;
            });
        });

        ['part1', 'part2', 'part3'].forEach(part => {
            this.manualGrading.reading[part].forEach(grade => {
                if (grade === true) readingCorrect++;
            });
        });

        ['part1', 'part2'].forEach(part => {
            this.manualGrading.writing[part].forEach(grade => {
                if (grade === true) writingCorrect++;
            });
        });

        // Pre-fill the raw score inputs
        document.getElementById('rawListeningCorrect').value = listeningCorrect;
        document.getElementById('rawReadingCorrect').value = readingCorrect;
        document.getElementById('rawWritingCorrect').value = writingCorrect;

        // Switch to score entry view
        document.getElementById('manualGradingContainer').classList.add('hidden');
        document.getElementById('manualScoreEntryContainer').classList.remove('hidden');
    }

    showManualScoreEntry() {
        document.getElementById('manualGradingContainer').classList.add('hidden');
        document.getElementById('manualScoreEntryContainer').classList.remove('hidden');
        document.getElementById('resultsContent').innerHTML = '';

        // Reset score inputs
        document.getElementById('rawListeningCorrect').value = '';
        document.getElementById('rawReadingCorrect').value = '';
        document.getElementById('rawWritingCorrect').value = '';
    }

    calculateAndDisplayScores() {
        const rawListening = parseInt(document.getElementById('rawListeningCorrect').value) || 0;
        const rawReading = parseInt(document.getElementById('rawReadingCorrect').value) || 0;
        const rawWriting = parseInt(document.getElementById('rawWritingCorrect').value) || 0;

        // Validate inputs
        if (rawListening > 45 || rawReading > 40 || rawWriting > 15) {
            alert('Please enter valid scores:\n• Listening: 0-45\n• Reading: 0-40\n• Writing: 0-15');
            return;
        }

        // Calculate HSK 4 scaled scores (each out of 100)
        const listeningScaled = Math.round((rawListening / 45) * 100);
        const readingScaled = Math.round((rawReading / 40) * 100);
        const writingScaled = Math.round((rawWriting / 15) * 100);

        // Create results object
        this.currentResults = {
            listening: {
                rawScore: rawListening,
                totalQuestions: 45,
                scaledScore: listeningScaled
            },
            reading: {
                rawScore: rawReading,
                totalQuestions: 40,
                scaledScore: readingScaled
            },
            writing: {
                rawScore: rawWriting,
                totalQuestions: 15,
                scaledScore: writingScaled
            },
            hsk4Score: listeningScaled + readingScaled + writingScaled,
            totalQuestions: 100,
            hasAnswerKey: !!this.answerKey,
            testName: this.currentExamName || 'Unnamed Test',
            date: new Date().toISOString(),
            isManuallyGraded: this.isManualGradingActive,
            manualScores: true
        };

        // Display results
        this.displayResults();

        // Hide the manual score entry
        document.getElementById('manualScoreEntryContainer').classList.add('hidden');

        // Ensure results modal stays visible
        document.getElementById('resultsModal').classList.remove('hidden');
    }

    displayResults() {
        if (!this.currentResults) return;

        const results = this.currentResults;
        const getPercentage = (score, total) => Math.round((score / total) * 100);
        const getFeedback = (score) => {
            if (score >= 90) return '🎉 Excellent!';
            if (score >= 80) return '👍 Very Good!';
            if (score >= 70) return '😊 Good!';
            if (score >= 60) return '📚 Pass - Keep practicing!';
            return '📖 Needs improvement';
        };

        let html = `
            <div class="score-display">
                <h3>${results.hsk4Score} / 300</h3>
                <p>HSK 4 Score: ${Math.round((results.hsk4Score / 300) * 100)}% - ${getFeedback(Math.round((results.hsk4Score / 300) * 100))}</p>
                <p style="font-size: 1rem; color: #6e6e73; margin-top: 5px;">${results.testName}</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px;">
                <div class="question-item" style="text-align: center; padding: 20px;">
                    <h4 style="margin-bottom: 10px;">👂 Listening</h4>
                    <div style="font-size: 2rem; font-weight: bold; color: #0071e3;">${results.listening.scaledScore}/100</div>
                    <div style="font-size: 0.9rem; color: #6e6e73;">${results.listening.rawScore}/45 correct</div>
                    <div style="font-size: 0.9rem; color: #6e6e73;">${getPercentage(results.listening.scaledScore, 100)}%</div>
                </div>
                <div class="question-item" style="text-align: center; padding: 20px;">
                    <h4 style="margin-bottom: 10px;">📖 Reading</h4>
                    <div style="font-size: 2rem; font-weight: bold; color: #0071e3;">${results.reading.scaledScore}/100</div>
                    <div style="font-size: 0.9rem; color: #6e6e73;">${results.reading.rawScore}/40 correct</div>
                    <div style="font-size: 0.9rem; color: #6e6e73;">${getPercentage(results.reading.scaledScore, 100)}%</div>
                </div>
                <div class="question-item" style="text-align: center; padding: 20px;">
                    <h4 style="margin-bottom: 10px;">✏️ Writing</h4>
                    <div style="font-size: 2rem; font-weight: bold; color: #0071e3;">${results.writing.scaledScore}/100</div>
                    <div style="font-size: 0.9rem; color: #6e6e73;">${results.writing.rawScore}/15 correct</div>
                    <div style="font-size: 0.9rem; color: #6e6e73;">${getPercentage(results.writing.scaledScore, 100)}%</div>
                </div>
            </div>

            <div class="question-group">
                <h4>📊 HSK 4 Score Conversion</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    <div>
                        <strong>Raw Score to HSK 4 Conversion:</strong>
                        <p style="margin-top: 8px; font-size: 0.9rem;">
                            • Listening: ${results.listening.rawScore}/45 = ${results.listening.scaledScore}/100<br>
                            • Reading: ${results.reading.rawScore}/40 = ${results.reading.scaledScore}/100<br>
                            • Writing: ${results.writing.rawScore}/15 = ${results.writing.scaledScore}/100
                        </p>
                    </div>
                    <div>
                        <strong>HSK 4 Passing Requirements:</strong>
                        <p style="margin-top: 8px; font-size: 0.9rem;">
                            • Total score: ≥ 180/300 (60%)<br>
                            • Each section: ≥ 60/100<br>
                            • Your total: ${results.hsk4Score}/300
                        </p>
                    </div>
                </div>
            </div>

            ${results.hsk4Score >= 180 ? `
            <div class="info-box" style="margin-top: 20px;">
                <strong>🎉 Congratulations!</strong> You passed the HSK 4 exam! Your score of ${results.hsk4Score}/300 meets the passing requirements.
            </div>
            ` : `
            <div class="warning-box" style="margin-top: 20px;">
                <strong>📚 Keep Practicing!</strong> Your score of ${results.hsk4Score}/300 is below the passing mark of 180. Focus on improving your weaker sections.
            </div>
            `}
        `;

        document.getElementById('resultsContent').innerHTML = html;
    }

    closeResults() {
        document.getElementById('resultsModal').classList.add('hidden');
        document.getElementById('manualGradingContainer').classList.add('hidden');
        document.getElementById('manualScoreEntryContainer').classList.add('hidden');
        this.isManualGradingActive = false;

        // Show setup screen
        document.getElementById('setupScreen').style.display = 'block';
    }

    saveToHistory() {
        if (!this.currentResults) {
            alert('No results to save!');
            return;
        }

        const historyItem = {
            id: Date.now(),
            testName: this.currentResults.testName,
            date: this.currentResults.date,
            listeningScore: this.currentResults.listening.scaledScore,
            readingScore: this.currentResults.reading.scaledScore,
            writingScore: this.currentResults.writing.scaledScore,
            hsk4Score: this.currentResults.hsk4Score,
            rawListening: this.currentResults.listening.rawScore,
            rawReading: this.currentResults.reading.rawScore,
            rawWriting: this.currentResults.writing.rawScore,
            totalQuestions: this.currentResults.totalQuestions,
            hasAnswerKey: this.currentResults.hasAnswerKey,
            manualScores: this.currentResults.manualScores,
            isManuallyGraded: this.currentResults.isManuallyGraded,
            answers: JSON.parse(JSON.stringify(this.userAnswers)),
            manualGrading: this.isManualGradingActive ? JSON.parse(JSON.stringify(this.manualGrading)) : null
        };

        this.history.push(historyItem);
        this.saveHistory();

        alert('Results saved to history!');
        this.closeResults();
    }

    exportResults() {
        const data = {
            timestamp: new Date().toISOString(),
            testName: this.currentExamName,
            answers: this.userAnswers,
            manualGrading: this.manualGrading,
            answerKey: this.answerKey,
            results: this.currentResults,
            section: this.examState.currentSection,
            part: this.examState.currentPart
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hsk4_${this.currentExamName || 'results'}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert('Results exported successfully!');
    }

    // ========== HISTORY MANAGEMENT ==========

    loadHistory() {
        const saved = localStorage.getItem('hsk4ExamHistory');
        return saved ? JSON.parse(saved) : [];
    }

    saveHistory() {
        localStorage.setItem('hsk4ExamHistory', JSON.stringify(this.history));
    }

    showHistory() {
        document.getElementById('historyModal').classList.remove('hidden');
        this.displayHistoryList();
    }

    closeHistory() {
        document.getElementById('historyModal').classList.add('hidden');
    }

    displayHistoryList() {
        const historyList = document.getElementById('historyList');

        if (this.history.length === 0) {
            historyList.innerHTML = '<div class="warning-box" style="text-align: center;">No test history yet. Complete a test to see your progress!</div>';
            return;
        }

        // Sort by date (newest first)
        const sortedHistory = [...this.history].sort((a, b) => new Date(b.date) - new Date(a.date));

        let html = '<div style="display: grid; gap: 10px;">';

        // Calculate improvement trends
        const improvementData = this.calculateImprovementTrends();

        sortedHistory.forEach((item, index) => {
            const percentage = Math.round((item.hsk4Score / 300) * 100);
            const date = new Date(item.date).toLocaleDateString();
            const time = new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            html += `
                <div class="history-item">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong style="font-size: 1.1rem;">${item.testName}</strong>
                        <span style="font-size: 0.9rem; color: #6e6e73;">${date} ${time}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center;">
                        <div>
                            <div style="font-size: 0.8rem; color: #6e6e73;">Total HSK 4</div>
                            <div style="font-size: 1.5rem; font-weight: bold; color: #0071e3;">${item.hsk4Score}/300</div>
                            <div style="font-size: 0.8rem;">${percentage}%</div>
                        </div>
                        <div>
                            <div style="font-size: 0.8rem; color: #6e6e73;">Listening</div>
                            <div style="font-size: 1.2rem; font-weight: bold;">${item.listeningScore}/100</div>
                            <div style="font-size: 0.8rem;">${item.rawListening}/45</div>
                        </div>
                        <div>
                            <div style="font-size: 0.8rem; color: #6e6e73;">Reading</div>
                            <div style="font-size: 1.2rem; font-weight: bold;">${item.readingScore}/100</div>
                            <div style="font-size: 0.8rem;">${item.rawReading}/40</div>
                        </div>
                        <div>
                            <div style="font-size: 0.8rem; color: #6e6e73;">Writing</div>
                            <div style="font-size: 1.2rem; font-weight: bold;">${item.writingScore}/100</div>
                            <div style="font-size: 0.8rem;">${item.rawWriting}/15</div>
                        </div>
                    </div>
                    <div style="margin-top: 10px; display: flex; gap: 5px; justify-content: center;">
                        ${item.isManuallyGraded ? '<span style="font-size: 0.8rem; padding: 2px 8px; background: #34c759; color: white; border-radius: 4px;">Manually Graded</span>' : ''}
                        ${!item.isManuallyGraded && item.hasAnswerKey ? '<span style="font-size: 0.8rem; padding: 2px 8px; background: #0071e3; color: white; border-radius: 4px;">Auto-graded</span>' : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';

        // Add improvement trends section
        if (improvementData.hasTrends) {
            html = `
                <div class="question-group" style="margin-bottom: 20px;">
                    <h4>📈 Your Improvement Trend</h4>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; text-align: center;">
                        <div>
                            <div style="font-size: 0.9rem; color: #6e6e73;">Best HSK 4 Score</div>
                            <div style="font-size: 1.3rem; font-weight: bold; color: #34c759;">${improvementData.bestScore}/300</div>
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: #6e6e73;">Average</div>
                            <div style="font-size: 1.3rem; font-weight: bold;">${improvementData.averageScore}/300</div>
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: #6e6e73;">Trend</div>
                            <div style="font-size: 1.3rem; font-weight: bold; color: ${improvementData.trend === 'up' ? '#34c759' : improvementData.trend === 'down' ? '#ff3b30' : '#6e6e73'}">
                                ${improvementData.trend === 'up' ? '📈' : improvementData.trend === 'down' ? '📉' : '➡️'}
                            </div>
                        </div>
                    </div>
                    <p style="margin-top: 10px; font-size: 0.9rem; color: #6e6e73;">
                        ${improvementData.trendMessage}
                    </p>
                </div>
            ` + html;
        }

        historyList.innerHTML = html;
    }

    calculateImprovementTrends() {
        if (this.history.length < 2) {
            return {
                hasTrends: false,
                bestScore: 0,
                averageScore: 0,
                trend: 'stable',
                trendMessage: 'Complete more tests to see your improvement trend!'
            };
        }

        const scores = this.history.map(item => item.hsk4Score);
        const percentages = this.history.map(item => Math.round((item.hsk4Score / 300) * 100));

        const bestScore = Math.max(...scores);
        const averageScore = Math.round(scores.reduce((a, b) => a + b) / scores.length);

        // Calculate trend based on last 3 tests
        const recentScores = scores.slice(-3);
        let trend = 'stable';
        let trendMessage = '';

        if (recentScores.length >= 2) {
            if (recentScores[recentScores.length - 1] > recentScores[0]) {
                trend = 'up';
                const improvement = recentScores[recentScores.length - 1] - recentScores[0];
                trendMessage = `Great! You've improved by ${improvement} points in your recent tests.`;
            } else if (recentScores[recentScores.length - 1] < recentScores[0]) {
                trend = 'down';
                const decline = recentScores[0] - recentScores[recentScores.length - 1];
                trendMessage = `Your score decreased by ${decline} points. Keep practicing!`;
            } else {
                trendMessage = 'Your scores have been stable. Try to challenge yourself more!';
            }
        }

        return {
            hasTrends: true,
            bestScore,
            averageScore,
            trend,
            trendMessage
        };
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all test history? This cannot be undone.')) {
            this.history = [];
            this.saveHistory();
            this.displayHistoryList();
            alert('History cleared!');
        }
    }
}

const app = new HSK4ExamApp();
