// Weekday Game - Main Application Logic

class WeekdayGame {
    constructor() {
        this.year = new Date().getFullYear();
        this.currentDate = null;
        this.correctDay = null;
        this.score = 0;
        this.attempts = 0;
        this.answered = false;

        // Failure history for spaced repetition
        this.failureHistory = [];
        this.maxFailureHistory = 20;
        this.consecutiveRandomDates = 0;
        this.spacedRepetitionInterval = 4; // Every 4th date from failure history

        // Load saved score and failure history from local storage
        this.loadScore();
        this.loadFailureHistory();

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
        this.historyButton = document.getElementById('historyButton');
        this.historyModal = document.getElementById('historyModal');
        this.closeModalButton = document.getElementById('closeModal');
        this.clearHistoryButton = document.getElementById('clearHistory');
        this.historyTableContainer = document.getElementById('historyTableContainer');

        this.initEventListeners();
        this.initVoiceRecognition();
        this.updateYearDisplay();
        this.updateScore(); // Display loaded score
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

        // History button
        this.historyButton.addEventListener('click', () => {
            this.openHistoryModal();
        });

        // Close modal button
        this.closeModalButton.addEventListener('click', () => {
            this.closeHistoryModal();
        });

        // Clear history button
        this.clearHistoryButton.addEventListener('click', () => {
            this.clearFailureHistory();
        });

        // Close modal when clicking outside the modal content
        this.historyModal.addEventListener('click', (e) => {
            if (e.target === this.historyModal) {
                this.closeHistoryModal();
            }
        });
    }

    updateYearDisplay() {
        this.yearDisplay.textContent = this.year;
    }

    generateNewDate() {
        // Decide whether to use failure history or generate random date
        // Every 4th random date, pick from failure history instead
        let useFailureHistory = false;

        if (this.failureHistory.length > 0) {
            this.consecutiveRandomDates++;
            if (this.consecutiveRandomDates >= this.spacedRepetitionInterval) {
                useFailureHistory = true;
                this.consecutiveRandomDates = 0;
            }
        }

        if (useFailureHistory) {
            // Pick a date from failure history using spaced repetition
            const selectedFailure = this.selectFromFailureHistory();
            this.currentDate = new Date(selectedFailure.year, selectedFailure.month - 1, selectedFailure.day);
            this.year = selectedFailure.year;
            this.updateYearDisplay();
        } else {
            // Generate a random date in the selected year
            const month = Math.floor(Math.random() * 12) + 1; // 1-12
            const daysInMonth = new Date(this.year, month, 0).getDate();
            const day = Math.floor(Math.random() * daysInMonth) + 1; // 1-daysInMonth

            this.currentDate = new Date(this.year, month - 1, day);
        }

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
            // Add failed date to failure history
            this.addToFailureHistory(this.currentDate);
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
            // Show next button as fallback, but auto-advance after delay
            this.nextButton.style.display = 'block';
            setTimeout(() => {
                if (this.answered && !this.voiceMode) {
                    this.generateNewDate();
                }
            }, 2000);
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
        this.saveScore();
    }

    saveScore() {
        const scoreData = {
            score: this.score,
            attempts: this.attempts
        };
        try {
            localStorage.setItem('weekdayGameScore', JSON.stringify(scoreData));
        } catch (error) {
            console.error('Failed to save score to local storage:', error);
        }
    }

    loadScore() {
        try {
            const savedData = localStorage.getItem('weekdayGameScore');
            if (savedData) {
                const scoreData = JSON.parse(savedData);
                this.score = scoreData.score || 0;
                this.attempts = scoreData.attempts || 0;
            }
        } catch (error) {
            console.error('Failed to load score from local storage:', error);
            this.score = 0;
            this.attempts = 0;
        }
    }

    loadFailureHistory() {
        try {
            const savedData = localStorage.getItem('weekdayGameFailureHistory');
            if (savedData) {
                this.failureHistory = JSON.parse(savedData);
            }
        } catch (error) {
            console.error('Failed to load failure history from local storage:', error);
            this.failureHistory = [];
        }
    }

    saveFailureHistory() {
        try {
            localStorage.setItem('weekdayGameFailureHistory', JSON.stringify(this.failureHistory));
        } catch (error) {
            console.error('Failed to save failure history to local storage:', error);
        }
    }

    addToFailureHistory(date) {
        const failureEntry = {
            day: date.getDate(),
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            timestamp: Date.now(),
            failureCount: 1,
            lastReviewed: Date.now()
        };

        // Check if this date already exists in the history
        const existingIndex = this.failureHistory.findIndex(entry =>
            entry.day === failureEntry.day &&
            entry.month === failureEntry.month &&
            entry.year === failureEntry.year
        );

        if (existingIndex !== -1) {
            // Update existing entry - increment failure count and move to front
            this.failureHistory[existingIndex].failureCount++;
            this.failureHistory[existingIndex].lastReviewed = Date.now();
            // Move to front (most recent)
            const updated = this.failureHistory.splice(existingIndex, 1)[0];
            this.failureHistory.unshift(updated);
        } else {
            // Add new entry to the front
            this.failureHistory.unshift(failureEntry);

            // Keep only the most recent 20 failures (LRU)
            if (this.failureHistory.length > this.maxFailureHistory) {
                this.failureHistory.pop();
            }
        }

        this.saveFailureHistory();
    }

    selectFromFailureHistory() {
        if (this.failureHistory.length === 0) {
            return null;
        }

        // Implement spaced repetition algorithm
        // Weight selection based on:
        // 1. Time since last reviewed (older = higher priority)
        // 2. Failure count (more failures = higher priority)
        // 3. Add some randomness for variety

        const now = Date.now();
        const weights = this.failureHistory.map(entry => {
            // Time weight: how long since last reviewed (in days)
            const daysSinceReview = (now - entry.lastReviewed) / (1000 * 60 * 60 * 24);
            const timeWeight = Math.min(daysSinceReview, 30); // Cap at 30 days

            // Failure count weight: more failures = higher priority
            const failureWeight = entry.failureCount * 2;

            // Combined weight with some randomization
            const baseWeight = timeWeight + failureWeight;
            const randomFactor = Math.random() * 0.5 + 0.75; // 0.75 to 1.25 multiplier

            return baseWeight * randomFactor;
        });

        // Select based on weighted random selection
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                // Update last reviewed timestamp
                this.failureHistory[i].lastReviewed = now;
                this.saveFailureHistory();
                return this.failureHistory[i];
            }
        }

        // Fallback: return first entry
        this.failureHistory[0].lastReviewed = now;
        this.saveFailureHistory();
        return this.failureHistory[0];
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
            this.listeningIndicator.textContent = '';
            await this.releaseWakeLock();
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

    // Wake Lock methods to prevent screen sleep during voice mode
    async requestWakeLock() {
        // Check if Wake Lock API is supported
        if (!('wakeLock' in navigator)) {
            console.warn('Wake Lock API not supported in this browser');
            return;
        }

        try {
            this.wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock acquired - screen will stay on');

            // Re-acquire wake lock if it's released (e.g., when tab becomes inactive)
            this.wakeLock.addEventListener('release', () => {
                console.log('Wake Lock released');
                // Re-acquire if still in voice mode
                if (this.voiceMode) {
                    this.requestWakeLock();
                }
            });
        } catch (error) {
            console.error('Failed to acquire Wake Lock:', error);
        }
    }

    async releaseWakeLock() {
        if (this.wakeLock) {
            try {
                await this.wakeLock.release();
                this.wakeLock = null;
                console.log('Wake Lock released - screen can sleep');
            } catch (error) {
                console.error('Failed to release Wake Lock:', error);
            }
        }
    }

    // History modal methods
    openHistoryModal() {
        this.renderHistoryTable();
        this.historyModal.classList.add('active');
    }

    closeHistoryModal() {
        this.historyModal.classList.remove('active');
    }

    renderHistoryTable() {
        const weekdayNames = [
            'Sunday', 'Monday', 'Tuesday', 'Wednesday',
            'Thursday', 'Friday', 'Saturday'
        ];

        if (this.failureHistory.length === 0) {
            this.historyTableContainer.innerHTML = '<div class="empty-history">No failed dates yet. Keep playing!</div>';
            return;
        }

        let tableHTML = `
            <table class="history-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Weekday</th>
                        <th>Failures</th>
                        <th>Last Reviewed</th>
                    </tr>
                </thead>
                <tbody>
        `;

        this.failureHistory.forEach(entry => {
            const date = new Date(entry.year, entry.month - 1, entry.day);
            const weekday = weekdayNames[date.getDay()];
            const dateStr = `${String(entry.day).padStart(2, '0')}/${String(entry.month).padStart(2, '0')}/${entry.year}`;

            const lastReviewed = new Date(entry.lastReviewed);
            const now = new Date();
            const diffMs = now - lastReviewed;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            let timeAgo;
            if (diffMins < 1) {
                timeAgo = 'Just now';
            } else if (diffMins < 60) {
                timeAgo = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
            } else if (diffHours < 24) {
                timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            } else {
                timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            }

            tableHTML += `
                <tr>
                    <td>${dateStr}</td>
                    <td>${weekday}</td>
                    <td>${entry.failureCount}</td>
                    <td>${timeAgo}</td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;

        this.historyTableContainer.innerHTML = tableHTML;
    }

    clearFailureHistory() {
        if (confirm('Are you sure you want to clear all failure history?')) {
            this.failureHistory = [];
            this.saveFailureHistory();
            this.renderHistoryTable();
        }
    }
}

// Initialize the game when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new WeekdayGame();
});
