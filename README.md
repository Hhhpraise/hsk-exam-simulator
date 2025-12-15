# 🎯 HSK  Exam Simulator

A comprehensive web-based examination simulator for HSK 4 (Chinese Proficiency Test Level 4) preparation. This application provides a realistic testing environment with timed sections, PDF viewing, answer recording, and automatic/manual grading capabilities.

![HSK 4 Exam Simulator](https://img.shields.io/badge/HSK-4-orange)
![License](https://img.shields.io/badge/License-MIT-blue)
![Version](https://img.shields.io/badge/Version-1.0-green)

## ✨ Features

### 📚 Exam Simulation
- **Realistic Timing**: Section-based timing following official HSK 4 exam structure
- **PDF Integration**: View and navigate exam papers directly in the browser
- **Answer Recording**: Complete digital answer sheet for all 100 questions
- **Section Management**: Automatic progression through Listening, Reading, and Writing sections

### 🔧 Advanced PDF Handling
- **Zoom Controls**: Fully adjustable zoom (30%-500%) for both exam and answer key PDFs
- **Smart Navigation**: Page-by-page navigation with fit-to-page and fit-to-width options
- **Keyboard Shortcuts**: 
  - `Ctrl + +` / `Ctrl + -` for zoom in/out
  - `Ctrl + 0` to reset zoom
  - `Ctrl + Mouse Wheel` for smooth zooming
- **Responsive Design**: Adapts to different screen sizes and devices

### 📊 Grading & Analysis
- **Automatic Grading**: Upload answer key PDF for instant scoring
- **Manual Grading Interface**: Visual grading system with color-coded results
- **HSK 4 Score Conversion**: Automatic conversion of raw scores to official HSK 4 scoring (0-300)
- **Performance Analytics**: Detailed breakdown by section (Listening, Reading, Writing)

### 💾 History & Tracking
- **Exam History**: Store and review all past exam attempts
- **Progress Tracking**: Visual improvement trends and statistics
- **Export Results**: Download exam results as JSON for record-keeping
- **Duplicate Detection**: Alerts when retaking previously attempted exams

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- PDF exam papers (HSK 4 format)
- Optional: Audio files for listening section
- Optional: Answer key PDFs for automatic grading

### Live Demo
Visit the live demo: [HSK 4 Exam Simulator](https://hhhpraise.github.io/hsk-exam-simulator/)

### Local Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/Hhhpraise/hsk-exam-simulator.git
   cd hsk-exam-simulator
   ```

2. **Open the application**:
   - Navigate to the project folder
   - Open `index.html` in your web browser

3. **Alternative: Deploy online**:
   - Upload the three files (`index.html`, `style.css`, `script.js`) to any web hosting service
   - Access via your domain or hosting URL

## 📖 Usage Guide

### Step 1: Setup
1. **Upload Exam PDF**: Click "Exam PDF" to upload your HSK 4 exam paper
2. **Optional Audio**: Upload listening section audio for a more realistic experience
3. **Optional Answer Key**: Upload answer key PDF for automatic grading
4. **Start Exam**: Click "Start Exam" when ready

### Step 2: Taking the Exam
1. **Timer Control**: Use the timer controls to start/pause sections
2. **PDF Navigation**: Use arrows to navigate between pages
3. **Zoom Adjustment**: Use zoom controls to make text readable
4. **Answer Entry**: Fill in answers in the digital answer sheet
   - Listening: Multiple choice and true/false
   - Reading: Multiple choice and ordering
   - Writing: Text input for sentences and descriptions

### Step 3: Submission & Grading
1. **Submit Exam**: Click "Submit Exam" when finished
2. **Automatic Grading**: If answer key was uploaded, answers are automatically graded
3. **Manual Grading**: If no answer key, use the manual grading interface
4. **Review Results**: See your HSK 4 score (out of 300) and section breakdowns

### Step 4: History & Improvement
1. **Save Results**: Save your exam to history for tracking progress
2. **View History**: Access the history modal to see all past attempts
3. **Analyze Trends**: Check improvement trends and statistics
4. **Export Data**: Download your results for offline review

## 🎯 HSK 4 Exam Structure

| Section | Questions | Time | Question Types |
|---------|-----------|------|----------------|
| **Listening** | 1-45 | 30 minutes | True/False, Multiple Choice |
| **Reading** | 46-85 | 40 minutes | Matching, Ordering, Multiple Choice |
| **Writing** | 86-100 | 25 minutes | Sentence Construction, Picture Description |
| **Total** | 100 | 95 minutes | |

**Passing Score**: 180/300 (60%) with minimum 60/100 in each section

## 🛠️ Technical Details

### Architecture
- **Frontend**: Pure HTML/CSS/JavaScript
- **PDF Rendering**: [PDF.js](https://mozilla.github.io/pdf.js/) by Mozilla
- **Storage**: LocalStorage for persistent history
- **Responsive Design**: Mobile-first CSS with media queries

### File Structure
```
hsk4-exam-simulator/
├── index.html          # Main HTML file
├── style.css          # All styling and responsive design
├── script.js          # Application logic and functionality
├── README.md          # This documentation
└── assets/            # (Optional) Sample PDFs and assets
```

### Key Classes (script.js)
- `HSK4ExamApp`: Main application class managing all functionality
- **PDF Management**: Loading, rendering, zooming, and navigation
- **Timer System**: Section-based timing with pause/resume
- **Grading Engine**: Automatic and manual grading with HSK 4 conversion
- **History Manager**: Storage, retrieval, and analysis of exam history

### Dependencies
- **PDF.js v3.11.174**: Client-side PDF rendering (CDN hosted)
- **No backend required**: All processing happens in the browser

## 📱 Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 60+ | ✅ Fully Supported |
| Firefox | 55+ | ✅ Fully Supported |
| Safari | 11+ | ✅ Fully Supported |
| Edge | 79+ | ✅ Fully Supported |
| iOS Safari | 11+ | ✅ Fully Supported |
| Chrome for Android | 60+ | ✅ Fully Supported |

## 🔧 Customization

### Adding Custom Exam Formats
The application can be adapted for other HSK levels or exams by modifying:
1. Question counts in `script.js` constructor
2. Timing structure in `examTiming` object
3. Answer sheet generation in `generateAnswerSheet()`

### Styling
- All colors and styles are defined in `style.css`
- Uses CSS custom properties for easy theming
- Responsive breakpoints at 1200px and 768px

### Extending Features
Potential enhancements:
- Add speaking section with audio recording
- Integrate with LMS platforms
- Add more detailed analytics
- Support for multiple answer key formats

## 🐛 Known Issues & Limitations

1. **PDF Parsing**: Answer key parsing depends on PDF text quality and formatting
2. **Large PDFs**: Very large PDFs (>50MB) may load slowly
3. **Offline Audio**: Audio files must be uploaded each session (browser security)
4. **Mobile Zoom**: Touch zoom may require precise gestures

## 🔒 Privacy & Security

- **No Server Upload**: All files remain in your browser
- **Local Storage**: History is stored only on your device
- **No Tracking**: No analytics or data collection
- **Export Control**: You control when to export your data

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**:
   ```bash
   git clone https://github.com/Hhhpraise/hsk4-exam-simulator.git
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/AmazingFeature
   ```

3. **Commit your changes**:
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```

4. **Push to the branch**:
   ```bash
   git push origin feature/AmazingFeature
   ```

5. **Open a Pull Request**

### Development Guidelines
- Follow existing code style and structure
- Test thoroughly in multiple browsers
- Update documentation as needed
- Ensure no breaking changes to existing functionality

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- **Mozilla PDF.js**: For the excellent PDF rendering library
- **HSK Organizers**: For the exam format and structure
- **Open Source Community**: For inspiration and tools

## 📞 Support

For issues, questions, or suggestions:
1. Check the [Issues](https://github.com/Hhhpraise/hsk4-exam-simulator/issues) page
2. Create a new issue if your problem isn't already reported
3. Include browser version, error messages, and steps to reproduce

## 📈 Roadmap

### Planned Features
- [ ] Speaking section simulation
- [ ] More detailed performance analytics
- [ ] Integration with vocabulary databases
- [ ] Custom exam creation tools
- [ ] Progress tracking charts and graphs
- [ ] Multi-language interface support

### Version History
- **v1.0** (Current): Initial release with core features
- **v0.5**: Added PDF zoom and improved grading
- **v0.1**: Basic exam simulation functionality

---

**Happy Studying!** 祝你学习顺利！🎓

*Master Chinese with realistic exam practice and detailed feedback.*

---
**Created by [Hhhpraise](https://github.com/Hhhpraise)**
