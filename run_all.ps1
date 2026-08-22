npm run lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm test -- components/FormsView.test.tsx
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
git add components/FormsView.jsx components/FormsView.test.tsx
git commit -m "test(forms): add jest-axe accessibility tests"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
git push -u origin test/forms-11-axe
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
