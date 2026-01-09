# Weekday Game

A fun client-side JavaScript game that challenges you to guess the weekday for randomly generated dates.

## Play the Game

[Play the Weekday Game](https://mkmik.github.io/ccdemo/)

## Development

### Running Tests

This project includes comprehensive UI tests using Playwright. The tests run automatically in CI on every push and pull request.

#### Prerequisites

```bash
npm install
```

#### Run Tests

```bash
# Run tests in headless mode
npm test

# Run tests in headed mode (see browser)
npm run test:headed

# Run tests in UI mode (interactive)
npm run test:ui

# Run tests in debug mode
npm run test:debug
```

#### Test Coverage

The test suite covers:
- UI element visibility and layout
- Game functionality (answering questions, scoring)
- Year navigation
- Multiple game rounds
- Correct answer verification

### CI/CD

Tests run automatically via GitHub Actions on:
- Push to main/master branches
- Pull requests to main/master branches

Test reports are available as artifacts in GitHub Actions runs.
