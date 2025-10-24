// Weekday Game - Main Application Logic

class WeekdayGame {
    constructor() {
        this.year = new Date().getFullYear();
        this.currentDate = null;
        this.correctDay = null;
        this.score = 0;
        this.attempts = 0;
        this.answered = false;

        // DOM elements
        this.yearDisplay = document.getElementById('yearDisplay');
        this.dateDisplay = document.getElementById('dateDisplay');
        this.feedback = document.getElementById('feedback');
        this.scoreDisplay = document.getElementById('scoreDisplay');
        this.nextButton = document.getElementById('nextButton');
        this.weekdayButtons = document.querySelectorAll('#weekdayButtons button');

        this.initEventListeners();
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

        const weekdayNames = [
            'Sunday', 'Monday', 'Tuesday', 'Wednesday',
            'Thursday', 'Friday', 'Saturday'
        ];

        if (selectedDay === this.correctDay) {
            this.score++;
            this.showFeedback('Correct!', true);
        } else {
            this.showFeedback(
                `Wrong! The correct answer is ${weekdayNames[this.correctDay]}`,
                false
            );
        }

        this.updateScore();
        this.nextButton.style.display = 'block';
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
}

// Initialize the game when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new WeekdayGame();
});
