# Contributing

Contributions are welcome. This is a static frontend project with no build tooling, so setup is straightforward.

## Local development

```bash
git clone https://github.com/clawpunchsavior/clawtest.git
cd clawtest
npx serve src
```

## Guidelines

- No frameworks or build steps. Keep it vanilla JS/CSS/HTML.
- Test across Chrome, Firefox, and Safari before submitting.
- CSS custom properties are defined in `:root` in `styles.css` — use them instead of hardcoded colors.
- Game logic lives in `script.js`. Keep functions focused and name them descriptively.
- localStorage keys are prefixed to avoid collisions. Follow the existing pattern.

## Pull requests

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-change`)
3. Commit your changes
4. Push and open a PR against `main`

## Issues

Use GitHub Issues for bug reports or feature requests. Include browser version and steps to reproduce for bugs.
