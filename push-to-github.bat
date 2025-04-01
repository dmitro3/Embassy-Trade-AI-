@echo off
echo "Pushing Embassy Trade Desktop App to GitHub..."

echo "Adding files to Git..."
git add .

echo "Committing changes..."
git commit -m "Add simulation page and fix 404 error on /simulation route"

echo "Pushing to GitHub repository..."
git push origin main

echo "Done!"
pause