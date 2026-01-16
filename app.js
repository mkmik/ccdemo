// Weekday Game - Main Application Logic

class WeekdayGame {
    constructor() {
        this.year = new Date().getFullYear();
        this.currentDate = null;
        this.correctDay = null;
        this.score = 0;
        this.attempts = 0;
        this.answered = false;

        // Voice mode properties
        this.voiceMode = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.wakeLock = null;

        // DOM elements
        this.yearDisplay = document.getElementById('yearDisplay');
        this.dateDisplay = document.getElementById('dateDisplay');
        this.feedback = document.getElementById('feedback');
        this.scoreDisplay = document.getElementById('scoreDisplay');
        this.nextButton = document.getElementById('nextButton');
        this.weekdayButtons = document.querySelectorAll('#weekdayButtons button');
        this.voiceModeButton = document.getElementById('voiceModeButton');
        this.listeningIndicator = document.getElementById('listeningIndicator');

        this.initEventListeners();
        this.initVoiceRecognition();
        this.initVisibilityHandler();
        this.updateYearDisplay();
        this.generateNewDate();
    }

    initEventListeners() {
        // Year selector buttons
        document.getElementById('prevYear').addEventListener('click', () => {
            this.year--;
            this.updateYearDisplay();
            this.generateNewDate();
        });

        document.getElementById('nextYear').addEventListener('click', () => {
            this.year++;
            this.updateYearDisplay();
            this.generateNewDate();
        });

        // Weekday buttons
        this.weekdayButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (!this.answered) {
                    this.checkAnswer(parseInt(button.dataset.day));
                }
            });
        });

        // Next button
        this.nextButton.addEventListener('click', () => {
            this.generateNewDate();
        });

        // Voice mode button
        this.voiceModeButton.addEventListener('click', () => {
            this.toggleVoiceMode();
        });
    }

    updateYearDisplay() {
        this.yearDisplay.textContent = this.year;
    }

    generateNewDate() {
        // Generate a random date in the selected year
        const month = Math.floor(Math.random() * 12) + 1; // 1-12
        const daysInMonth = new Date(this.year, month, 0).getDate();
        const day = Math.floor(Math.random() * daysInMonth) + 1; // 1-daysInMonth

        this.currentDate = new Date(this.year, month - 1, day);
        this.correctDay = this.currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

        this.displayDate();
        this.resetFeedback();
        this.enableButtons();
        this.answered = false;
        this.nextButton.style.display = 'none';
        this.listeningIndicator.textContent = '';

        // If in voice mode, start the voice round
        if (this.voiceMode) {
            this.startVoiceRound();
        }
    }

    displayDate() {
        const day = String(this.currentDate.getDate()).padStart(2, '0');
        const month = String(this.currentDate.getMonth() + 1).padStart(2, '0');
        const year = this.currentDate.getFullYear();

        this.dateDisplay.textContent = `${day} / ${month} / ${year}`;
    }

    checkAnswer(selectedDay) {
        this.answered = true;
        this.attempts++;
        this.disableButtons();
        this.stopListening();

        const weekdayNames = [
            'Sunday', 'Monday', 'Tuesday', 'Wednesday',
            'Thursday', 'Friday', 'Saturday'
        ];

        let feedbackMessage;
        let isCorrect;

        if (selectedDay === this.correctDay) {
            this.score++;
            feedbackMessage = 'Correct!';
            isCorrect = true;
        } else {
            feedbackMessage = `Wrong! The correct answer is ${weekdayNames[this.correctDay]}`;
            isCorrect = false;
        }

        this.showFeedback(feedbackMessage, isCorrect);
        this.updateScore();

        // In voice mode, speak the feedback and automatically progress
        if (this.voiceMode) {
            this.speak(feedbackMessage, () => {
                // Wait 1 second after speech finishes, then move to next round
                setTimeout(() => {
                    if (this.voiceMode) {
                        this.generateNewDate();
                    }
                }, 1000);
            });
        } else {
            this.nextButton.style.display = 'block';
        }
    }

    showFeedback(message, isCorrect) {
        this.feedback.textContent = message;
        this.feedback.className = 'feedback ' + (isCorrect ? 'correct' : 'wrong');
    }

    resetFeedback() {
        this.feedback.textContent = '';
        this.feedback.className = 'feedback';
    }

    updateScore() {
        this.scoreDisplay.textContent = `Score: ${this.score} / ${this.attempts}`;
    }

    disableButtons() {
        this.weekdayButtons.forEach(button => {
            button.disabled = true;
        });
    }

    enableButtons() {
        this.weekdayButtons.forEach(button => {
            button.disabled = false;
        });
    }

    // Voice mode methods
    initVisibilityHandler() {
        // Handle page visibility changes to re-acquire wake lock if needed
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.voiceMode && !this.wakeLock) {
                this.requestWakeLock();
            }
        });
    }

    initVoiceRecognition() {
        // Check if browser supports Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech recognition not supported in this browser');
            this.voiceModeButton.disabled = true;
            this.voiceModeButton.textContent = '🎤 Voice Mode (Not Supported)';
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.listeningIndicator.textContent = '🎤 Listening...';
            this.listeningIndicator.classList.add('active');
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            this.processVoiceInput(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            this.listeningIndicator.textContent = 'Error: ' + event.error;
            this.listeningIndicator.classList.remove('active');

            // Retry listening after error if still in voice mode and not answered
            if (this.voiceMode && !this.answered) {
                setTimeout(() => this.startListening(), 1000);
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.listeningIndicator.classList.remove('active');

            // Continue listening if still in voice mode and not answered
            if (this.voiceMode && !this.answered) {
                this.startListening();
            }
        };
    }

    async toggleVoiceMode() {
        this.voiceMode = !this.voiceMode;

        if (this.voiceMode) {
            this.voiceModeButton.textContent = '🔇 Disable Voice Mode';
            this.voiceModeButton.classList.add('active');
            await this.requestWakeLock();
            this.startVoiceRound();
        } else {
            this.voiceModeButton.textContent = '🎤 Enable Voice Mode';
            this.voiceModeButton.classList.remove('active');
            this.stopListening();
            this.releaseWakeLock();
            this.listeningIndicator.textContent = '';
        }
    }

    startVoiceRound() {
        if (!this.voiceMode) return;

        // Speak the date
        const dateText = this.getDateAsText();
        this.speak(dateText, () => {
            // After speaking, start listening for the answer
            if (this.voiceMode && !this.answered) {
                this.startListening();
            }
        });
    }

    getDateAsText() {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const day = this.currentDate.getDate();
        const month = months[this.currentDate.getMonth()];

        // Add ordinal suffix to day
        const ordinal = this.getOrdinal(day);

        return `${month} ${day}${ordinal}`;
    }

    getOrdinal(n) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return (s[(v - 20) % 10] || s[v] || s[0]);
    }

    speak(text, onEnd) {
        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        if (onEnd) {
            utterance.onend = onEnd;
        }

        this.synthesis.speak(utterance);
    }

    startListening() {
        if (!this.recognition || this.isListening || this.answered) return;

        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
        this.listeningIndicator.textContent = '';
        this.listeningIndicator.classList.remove('active');
    }

    processVoiceInput(transcript) {
        // Check if user wants to hear the date again
        if (transcript.includes('say it again') ||
            transcript.includes('repeat') ||
            transcript.includes('say that again') ||
            transcript.includes('what was that')) {
            const dateText = this.getDateAsText();
            this.speak(dateText, () => {
                // After speaking, start listening again
                if (this.voiceMode && !this.answered) {
                    this.startListening();
                }
            });
            return;
        }

        const weekdays = {
            'monday': 1,
            'tuesday': 2,
            'wednesday': 3,
            'thursday': 4,
            'friday': 5,
            'saturday': 6,
            'sunday': 0
        };

        // Find matching weekday
        let selectedDay = -1;
        for (const [day, value] of Object.entries(weekdays)) {
            if (transcript.includes(day)) {
                selectedDay = value;
                break;
            }
        }

        if (selectedDay !== -1) {
            this.checkAnswer(selectedDay);
        } else {
            this.listeningIndicator.textContent = 'Didn\'t understand. Say a weekday name.';
            // Continue listening
            if (this.voiceMode && !this.answered) {
                setTimeout(() => this.startListening(), 1500);
            }
        }
    }

    // Wake Lock methods to prevent screen lock during voice mode
    async requestWakeLock() {
        if (!('wakeLock' in navigator)) {
            console.warn('Wake Lock API not supported in this browser');
            return;
        }

        try {
            this.wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock acquired - screen will stay on');

            // Re-acquire wake lock if the page becomes visible again
            this.wakeLock.addEventListener('release', () => {
                console.log('Wake Lock released');
                // If still in voice mode, try to re-acquire
                if (this.voiceMode && document.visibilityState === 'visible') {
                    this.requestWakeLock();
                }
            });
        } catch (error) {
            console.error('Failed to acquire Wake Lock:', error);
        }
    }

    releaseWakeLock() {
        if (this.wakeLock) {
            this.wakeLock.release()
                .then(() => {
                    this.wakeLock = null;
                    console.log('Wake Lock manually released');
                })
                .catch(error => {
                    console.error('Failed to release Wake Lock:', error);
                });
        }
    }
}

// Initialize the game when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new WeekdayGame();
});
